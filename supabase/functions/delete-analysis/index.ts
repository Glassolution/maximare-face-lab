import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, sb-access-token, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let debug: Record<string, unknown> = {};
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "server_config_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json().catch(() => ({} as any));
    const analysisId: string = body.analysis_id;
    let sbToken = req.headers.get("sb-access-token") || req.headers.get("x-supabase-auth") || "";
    const authHeader = req.headers.get("authorization") || "";
    if (!sbToken && /^Bearer\s+/i.test(authHeader)) {
      sbToken = authHeader.replace(/^Bearer\s+/i, "");
    }
    if (!analysisId) {
      return new Response(JSON.stringify({ error: "missing_analysis_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Resolve user id via JWT (avoid admin.getUser which may throw)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let userId: string | null = null;
    try {
      const part = sbToken?.split(".")[1] || "";
      const norm = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
      const payload = part ? JSON.parse(atob(norm)) : null;
      userId = payload?.sub || null;
      debug.jwt_sub = !!userId;
    } catch (e) {
      debug.jwt_parse_error = (e as Error)?.message;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized", debug }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let total = 0;
    let step = "rls_history_json";
    try {
      const anon = req.headers.get("apikey") || "";
      const clientRls = createClient(SUPABASE_URL, anon || "public", { global: { headers: { Authorization: `Bearer ${sbToken}` } } });
      const r1 = await clientRls.from("analysis_history").delete({ count: "exact" }).filter("result_json->>id", "eq", analysisId);
      if (r1.error) debug[step] = r1.error.message;
      total += r1.count || 0;
    } catch (e) {
      debug[step] = (e as Error)?.message;
    }
    step = "sr_history_json";
    if (total === 0) {
      const r2 = await admin.from("analysis_history").delete({ count: "exact" }).eq("user_id", userId).filter("result_json->>id", "eq", analysisId);
      if (r2.error) debug[step] = r2.error.message;
      total += r2.count || 0;
    }
    step = "sr_face_json";
    if (total === 0) {
      const r3 = await admin.from("face_analysis_events").delete({ count: "exact" }).eq("user_id", userId).filter("result_json->>id", "eq", analysisId);
      if (r3.error) debug[step] = r3.error.message;
      total += r3.count || 0;
    }
    step = "legacy_history_any";
    if (total === 0) {
      const r4 = await admin.from("analysis_history").select("id, user_id").filter("result_json->>id", "eq", analysisId).limit(1).maybeSingle();
      if (r4.error) debug[step] = r4.error.message;
      const row: any = r4?.data;
      if (row && (!row.user_id || row.user_id === userId)) {
        const r5 = await admin.from("analysis_history").delete({ count: "exact" }).eq("id", row.id);
        if (r5.error) debug[step + "_del"] = r5.error.message;
        total += r5.count || 0;
      }
    }
    step = "legacy_face_any";
    if (total === 0) {
      const r6 = await admin.from("face_analysis_events").select("id, user_id").filter("result_json->>id", "eq", analysisId).limit(1).maybeSingle();
      if (r6.error) debug[step] = r6.error.message;
      const row: any = r6?.data;
      if (row && (!row.user_id || row.user_id === userId)) {
        const r7 = await admin.from("face_analysis_events").delete({ count: "exact" }).eq("id", row.id);
        if (r7.error) debug[step + "_del"] = r7.error.message;
        total += r7.count || 0;
      }
    }
    if (total === 0) {
      return new Response(JSON.stringify({ ok: false, error: "not_found_or_forbidden", debug }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, deleted: total }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unexpected_error", debug }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
