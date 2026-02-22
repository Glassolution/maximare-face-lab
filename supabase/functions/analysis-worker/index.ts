import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Worker configuration via environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_CONCURRENT_JOBS = Number(Deno.env.get("MAX_CONCURRENT_JOBS") ?? "5");
const JOB_TIMEOUT_MS = Number(Deno.env.get("JOB_TIMEOUT_MS") ?? String(120_000)); // 2 minutos
const RETRY_LIMIT = 3;
const GLOBAL_MAX_AI_CALLS = Number(Deno.env.get("GLOBAL_MAX_AI_CALLS") ?? "50"); // total inflight across instances
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_MODEL = Deno.env.get("AI_MODEL") ?? "google/gemini-2.5-flash";
const SIMULATE_SLOW_MS = Number(Deno.env.get("SIMULATE_SLOW_MS") ?? "0");
const SIMULATE_RATE_LIMIT_PCT = Number(Deno.env.get("SIMULATE_RATE_LIMIT_PCT") ?? "0"); // 0-100
const PROVIDER_NAME = "lovable-gateway";

// Use a stable worker id to help observabilidade
const WORKER_ID = Deno.env.get("WORKER_ID") || crypto.randomUUID();

type JobRow = {
  id: number;
  user_id: string | null;
  analysis_id: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  last_error: string | null;
  locked_at: string | null;
  worker_id: string | null;
  result_json: Record<string, unknown> | null;
  source: string | null;
  image_meta: Record<string, unknown> | null;
  provider_meta: Record<string, unknown> | null;
};

function logEvent(event: Record<string, unknown>) {
  console.log("[analysis-worker]", JSON.stringify({ worker_id: WORKER_ID, ...event }));
}

class Semaphore {
  private max: number;
  private current = 0;
  private queue: Array<() => void> = [];
  constructor(max: number) {
    this.max = Math.max(1, max);
  }
  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.current++;
  }
  release() {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function writeIaLog(payload: Record<string, unknown>) {
  if (!supabase) return;
  try {
    await supabase.from("ia_logs").insert({
      created_at: new Date().toISOString(),
      user_id: payload.user_id ?? null,
      ip: null,
      event_type: String(payload.event_type ?? "worker_event"),
      provider: payload.provider ?? "internal",
      status_code: payload.status_code ?? null,
      error_message: payload.error_message ?? null,
      retry_after: payload.retry_after ?? null,
      x_ratelimit_remaining: payload.x_ratelimit_remaining ?? null,
      request_id: payload.request_id ?? null,
      limit: payload.limit ?? null,
      used: payload.used ?? null,
      reset_at: payload.reset_at ?? null,
    });
  } catch (err) {
    logEvent({ type: "ia_logs_insert_error", error: String(err) });
  }
}

// --------------- Persistence API (via RPCs) ---------------

async function acquireJob(): Promise<JobRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("acquire_pending_analysis", { _worker_id: WORKER_ID });
  if (error) {
    logEvent({ type: "acquire_error", error: String(error) });
    return null;
  }
  // When no job available, Postgres returns null row
  return (data ?? null) as JobRow | null;
}

async function markCompleted(job: JobRow, executionMs: number) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("mark_completed", { _job_id: job.id });
  if (error) {
    logEvent({ type: "mark_completed_error", job_id: job.id, error: String(error) });
  }
  await writeIaLog({
    event_type: "job_completed",
    worker_id: WORKER_ID,
    job_id: job.id,
    previous_status: "processing",
    new_status: "completed",
    retry_count: job.retry_count,
    execution_time_ms: executionMs,
  });
  return data;
}

async function markCompletedWithResult(job: JobRow, executionMs: number, result: Record<string, unknown>, providerMeta: Record<string, unknown>) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("mark_completed_with_result", {
    _job_id: job.id,
    _result_json: result,
    _provider_meta: providerMeta,
  });
  if (error) {
    logEvent({ type: "mark_completed_with_result_error", job_id: job.id, error: String(error) });
  }
  await writeIaLog({
    event_type: "job_completed",
    worker_id: WORKER_ID,
    job_id: job.id,
    previous_status: "processing",
    new_status: "completed",
    retry_count: job.retry_count,
    execution_time_ms: executionMs,
  });
  return data;
}

async function markFailed(job: JobRow, errorMessage: string, executionMs: number) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("mark_failed", { _job_id: job.id, _error_message: errorMessage });
  if (error) {
    logEvent({ type: "mark_failed_error", job_id: job.id, error: String(error) });
  }
  const newStatus = data?.status ?? "failed";
  await writeIaLog({
    event_type: "job_failed",
    worker_id: WORKER_ID,
    job_id: job.id,
    previous_status: "processing",
    new_status: newStatus,
    retry_count: (data?.retry_count ?? job.retry_count) + 1,
    execution_time_ms: executionMs,
    error_message: errorMessage,
  });
  return data;
}

async function requeueStaleJobs() {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("requeue_stale_jobs", { _stale_seconds: 120 });
  if (error) {
    logEvent({ type: "requeue_stale_error", error: String(error) });
    return 0;
  }
  if ((data ?? 0) > 0) {
    await writeIaLog({
      event_type: "stale_requeue",
      worker_id: WORKER_ID,
      retry_count: null,
      execution_time_ms: 0,
      error_message: null,
    });
  }
  return data ?? 0;
}

async function moveToDeadLetter(job: JobRow, errorMessage: string) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("move_to_dead_letter", { _job_id: job.id, _error_message: errorMessage });
  if (error) {
    logEvent({ type: "move_dead_letter_error", job_id: job.id, error: String(error) });
  }
  await writeIaLog({
    event_type: "job_dead_letter",
    worker_id: WORKER_ID,
    job_id: job.id,
    previous_status: "failed",
    new_status: "dead_letter",
    retry_count: job.retry_count,
    execution_time_ms: 0,
    error_message: errorMessage,
  });
  return data;
}

async function acquireGlobalAiSlot(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("acquire_ai_slot", { _max_calls: GLOBAL_MAX_AI_CALLS });
  if (error) {
    logEvent({ type: "global_ai_slot_error", error: String(error) });
    return false;
  }
  return Boolean(data);
}

async function releaseGlobalAiSlot(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("release_ai_slot");
  if (error) {
    logEvent({ type: "global_ai_release_error", error: String(error) });
  }
}

async function providerCanCall(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("provider_cb_can_call", { _provider_name: PROVIDER_NAME });
  if (error) {
    logEvent({ type: "provider_cb_can_call_error", error: String(error) });
    return false;
  }
  return Boolean(data);
}

async function providerOnSuccess(latencyMs: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("provider_cb_on_success", { _provider_name: PROVIDER_NAME, _latency_ms: latencyMs });
  if (error) {
    logEvent({ type: "provider_cb_on_success_error", error: String(error) });
  } else {
    await writeIaLog({ event_type: "circuit_closed", provider: PROVIDER_NAME });
  }
}

async function providerOnFailure(kind: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("provider_cb_on_failure", { _provider_name: PROVIDER_NAME, _error_kind: kind });
  if (error) {
    logEvent({ type: "provider_cb_on_failure_error", error: String(error) });
  } else {
    await writeIaLog({ event_type: "circuit_opened", provider: PROVIDER_NAME, error_message: kind });
  }
}

// --------------- Processing ---------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(retryCount: number) {
  if (retryCount <= 0) return 1000;
  if (retryCount === 1) return 1000;
  if (retryCount === 2) return 2000;
  return 4000;
}

async function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      try { onTimeout(); } catch {}
      reject(new Error("job_timeout"));
    }, ms);
    // Deno timers don't need cleanup here; we clear in process path
  });
  return Promise.race([p, timeout]);
}

async function processJob(job: JobRow): Promise<void> {
  const started = performance.now();
  try {
    const gotSlot = await acquireGlobalAiSlot();
    if (!gotSlot) {
      throw new Error("global_ai_limit_reached");
    }
    const allowed = await providerCanCall();
    if (!allowed) {
      throw new Error("circuit_open_fail_fast");
    }
    // Simulação controlada opcional
    if (SIMULATE_RATE_LIMIT_PCT > 0) {
      const r = Math.random() * 100;
      if (r < SIMULATE_RATE_LIMIT_PCT) {
        throw new Error("simulated_rate_limit_429");
      }
    }
    if (SIMULATE_SLOW_MS > 0) {
      await sleep(SIMULATE_SLOW_MS);
    }

    // Chamada real ao provedor de IA (Lovable Gateway)
    if (!LOVABLE_API_KEY) {
      throw new Error("lovable_api_key_missing");
    }
    const frontUrl = (job.image_meta as any)?.front?.url ?? null;
    const sideUrl = (job.image_meta as any)?.side?.url ?? null;
    if (!frontUrl || typeof frontUrl !== "string") {
      throw new Error("missing_front_image_url");
    }

    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze facial aesthetics objectively. Return STRICT JSON only." },
          { type: "image_url", image_url: { url: frontUrl } },
          ...(sideUrl ? [{ type: "image_url", image_url: { url: sideUrl } }] : []),
        ],
      },
    ];

    await writeIaLog({ event_type: "provider_call_attempt", provider: PROVIDER_NAME, job_id: job.id });
    const aiStarted = performance.now();
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
      }),
    });
    const aiLatencyMs = Math.round(performance.now() - aiStarted);

    if (!resp.ok) {
      const status = resp.status;
      const reqId = resp.headers.get("x-request-id") || resp.headers.get("x-amzn-requestid") || null;
      const errText = await resp.text();
      await writeIaLog({
        event_type: "provider_error",
        worker_id: WORKER_ID,
        job_id: job.id,
        status_code: status,
        error_message: errText.slice(0, 500),
        request_id: reqId,
      });
      if (status === 429) {
        await providerOnFailure("429");
        throw new Error("provider_rate_limit_429");
      }
      if (status >= 500) {
        await providerOnFailure("5xx");
        throw new Error("provider_5xx_error");
      }
      await providerOnFailure("provider_error");
      throw new Error("provider_error");
    }

    const aiData = await resp.json();
    const rawContent = aiData?.choices?.[0]?.message?.content ?? "";
    let jsonStr = rawContent;
    const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];
    jsonStr = jsonStr.trim();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("invalid_json_response");
    }

    const providerMeta = {
      provider: PROVIDER_NAME,
      model_used: AI_MODEL,
      latency_ms: aiLatencyMs,
      request_id: resp.headers.get("x-request-id") || resp.headers.get("x-amzn-requestid") || null,
      estimated_cost: null,
      retry_count: job.retry_count,
      tokens: aiData?.usage ?? null,
    };

    const execMs = Math.round(performance.now() - started);
    await providerOnSuccess(aiLatencyMs);
    await markCompletedWithResult(job, execMs, parsed, providerMeta);
  } catch (err) {
    const execMs = Math.round(performance.now() - started);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "circuit_open_fail_fast") {
      await writeIaLog({
        event_type: "circuit_half_open",
        worker_id: WORKER_ID,
        job_id: job.id,
      });
    }
    const updated = await markFailed(job, msg, execMs);
    const nextRetry = (updated?.retry_count ?? job.retry_count) + 1;
    if (nextRetry >= RETRY_LIMIT) {
      await moveToDeadLetter(job, msg);
    } else {
      const delay = backoffDelay(nextRetry);
      await sleep(delay);
    }
  }
  finally {
    await releaseGlobalAiSlot();
  }
}

async function runOne(sema: Semaphore): Promise<void> {
  await sema.acquire();
  try {
    while (true) {
      const job = await acquireJob();
      if (!job) break;
      await withTimeout(processJob(job), JOB_TIMEOUT_MS, () => {
        logEvent({ type: "job_timeout_triggered" });
      }).catch(async (timeoutError) => {
        const msg = timeoutError instanceof Error ? timeoutError.message : String(timeoutError);
        await markFailed(job, msg, JOB_TIMEOUT_MS);
        await providerOnFailure("timeout");
      });
    }
  } finally {
    sema.release();
  }
}

async function updateMetricsAndMonitor() {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("update_system_metrics");
  if (error) {
    logEvent({ type: "update_metrics_error", error: String(error) });
    return;
  }
  const m = data as {
    pending_count: number;
    avg_queue_time_ms: number | null;
  };
  if (m?.pending_count > 100) {
    await writeIaLog({
      event_type: "backlog_warning",
      worker_id: WORKER_ID,
      retry_count: null,
      execution_time_ms: 0,
      error_message: null,
    });
  }
  if ((m?.avg_queue_time_ms ?? 0) > 60_000) {
    await writeIaLog({
      event_type: "backlog_latency_warning",
      worker_id: WORKER_ID,
      retry_count: null,
      execution_time_ms: 0,
      error_message: null,
    });
  }
}

async function runBatch() {
  const sema = new Semaphore(MAX_CONCURRENT_JOBS);
  const stale = await requeueStaleJobs();
  logEvent({ type: "requeue_stale_done", affected: stale });
  const workers = Array.from({ length: MAX_CONCURRENT_JOBS }, () => runOne(sema));
  await Promise.all(workers);
  await updateMetricsAndMonitor();
}

serve(async (req) => {
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "run";
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      status: "ok",
      worker_id: WORKER_ID,
      max_concurrent: MAX_CONCURRENT_JOBS,
      action,
    }), { headers: { "Content-Type": "application/json" } });
  }
  if (req.method === "POST" && action === "run") {
    await runBatch();
    return new Response(JSON.stringify({ status: "completed_batch" }), { headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ error: "Unsupported" }), { status: 400, headers: { "Content-Type": "application/json" } });
});
