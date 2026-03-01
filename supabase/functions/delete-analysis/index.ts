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
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: userRes } = await admin.auth.getUser(sbToken);
    const userId = userRes?.user?.id || null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Delete by PK or by JSON result id in a single OR filter
    const { count: total } = await admin
      .from("analysis_history")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .or(`id.eq.${analysisId},result_json->>id.eq.${analysisId}`);
    return new Response(JSON.stringify({ ok: true, deleted: total }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unexpected_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
