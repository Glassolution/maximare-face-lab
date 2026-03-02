import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const INTERNAL_KEY = Deno.env.get("INTERNAL_ADMIN_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = req.headers.get("x-internal-key") || "";
    if (!INTERNAL_KEY || key !== INTERNAL_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "server_config_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json().catch(() => ({} as any));
    const handle: string = body.handle;
    if (!handle) {
      return new Response(JSON.stringify({ error: "missing_handle" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let userId: string | null = null;
    const res = await admin
      .from("profiles")
      .select("id, username, short_id, public_id")
      .or(`username.eq.${handle},short_id.eq.${handle},id.eq.${handle}`)
      .maybeSingle();
    if (res?.data?.id) {
      userId = res.data.id;
    } else {
      let num = Number(handle);
      if (Number.isNaN(num)) {
        const m = /^user_(\d+)$/.exec(handle);
        if (m) num = Number(m[1]);
      }
      if (!Number.isNaN(num)) {
        const res2 = await admin
          .from("profiles")
          .select("id")
          .eq("public_id", num)
          .maybeSingle();
        if (res2?.data?.id) userId = res2.data.id;
      }
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const payments = await admin
      .from("payments")
      .select("payment_id, status, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    return new Response(JSON.stringify({ ok: true, user_id: userId, payments: payments.data || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unexpected_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

