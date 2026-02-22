import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WORKER_ENDPOINT = Deno.env.get("WORKER_ENDPOINT") ?? ""; // e.g., https://<project>.functions.supabase.co/analysis-worker?action=run

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function enqueueJobs(n: number) {
  if (!supabase) throw new Error("Supabase not configured");
  const rows = Array.from({ length: n }).map(() => ({
    user_id: null,
    analysis_id: crypto.randomUUID(),
    result_json: {},
    source: "sim",
    status: "pending",
    retry_count: 0,
    image_meta: { front: { url: "data:image/png;base64,placeholder" }, side: null },
  }));
  const { error } = await supabase.from("analysis_history").insert(rows);
  if (error) throw new Error(String(error.message || error));
}

async function getCounts() {
  if (!supabase) throw new Error("Supabase not configured");
  const { count: pending } = await supabase
    .from("analysis_history")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: processing } = await supabase
    .from("analysis_history")
    .select("*", { count: "exact", head: true })
    .eq("status", "processing");
  const { count: completed } = await supabase
    .from("analysis_history")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");
  const { count: failed } = await supabase
    .from("analysis_history")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");
  return { pending: pending ?? 0, processing: processing ?? 0, completed: completed ?? 0, failed: failed ?? 0 };
}

async function runWorkersRound(rounds: number) {
  if (!WORKER_ENDPOINT) return;
  for (let i = 0; i < rounds; i++) {
    try {
      await fetch(WORKER_ENDPOINT, { method: "POST" });
    } catch {
      // ignore transient errors
    }
  }
}

async function snapshotMetrics() {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.rpc("update_system_metrics");
  if (error) throw new Error(String(error.message || error));
  return data;
}

serve(async (req) => {
  if (!supabase) return json({ error: "Supabase not configured" }, 500);
  if (req.method === "OPTIONS") return json(null);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const jobs = Number(body.jobs ?? 500);
    const rounds = Number(body.rounds ?? 20);

    const t0 = performance.now();
    await enqueueJobs(jobs);

    const t1 = performance.now();
    await runWorkersRound(rounds);

    // Poll until pending is zero or timeout 10 minutes
    const deadline = performance.now() + 10 * 60_000;
    let last = await getCounts();
    while (last.pending > 0 && performance.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2_000));
      await runWorkersRound(1);
      last = await getCounts();
    }
    const tEnd = performance.now();

    const totalMs = Math.round(tEnd - t0);
    const drainMs = Math.round(tEnd - t1);
    const throughputPerMin = Math.round((jobs / Math.max(1, drainMs / 60_000)));

    const metrics = await snapshotMetrics();

    return json({
      jobs_enqueued: jobs,
      total_time_ms: totalMs,
      drain_time_ms: drainMs,
      throughput_per_min: throughputPerMin,
      final_counts: last,
      capacity_estimate_per_instance: "depends on MAX_CONCURRENT_JOBS and GLOBAL_MAX_AI_CALLS",
      system_metrics: metrics
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
