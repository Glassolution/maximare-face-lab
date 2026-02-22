import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (!supabase) return json({ error: "Supabase not configured" }, 500);

  if (req.method === "OPTIONS") return json(null, 200);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const { frontal_url, lateral_url, analysis_id, source = "api" } = body || {};

    if (!frontal_url || typeof frontal_url !== "string") {
      return json({ error: "frontal_url is required" }, 400);
    }

    const analysisId = analysis_id || crypto.randomUUID();
    const image_meta = {
      front: { url: frontal_url },
      side: lateral_url ? { url: lateral_url } : null,
    };

    const { data, error } = await supabase
      .from("analysis_history")
      .insert({
        user_id: null,
        analysis_id: analysisId,
        result_json: {},
        source,
        status: "pending",
        started_at: null,
        completed_at: null,
        retry_count: 0,
        last_error: null,
        locked_at: null,
        worker_id: null,
        image_meta,
      })
      .select("id, analysis_id, status, created_at")
      .single();

    if (error) {
      return json({ error: String(error.message || error) }, 500);
    }

    return json({ job_id: data.id, analysis_id: data.analysis_id, status: data.status, created_at: data.created_at }, 202);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

