import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
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
    const reason_primary: string = body.reason_primary || "Admin refund by handle";
    if (!handle) {
      return new Response(JSON.stringify({ error: "missing_handle" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Try resolve by username, short_id, id; fallback to public_id if numeric or 'user_<num>' pattern
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

    // Inline refund logic (avoid internal forward to another function)
    let { data: profile } = await admin
      .from("profiles")
      .select("id, user_id, plan_type, provider_payment_id, payment_id, provider_subscription_id, first_payment_at, subscription_started_at, premium_since")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    let startDate: Date | null = null;
    if (profile?.first_payment_at) startDate = new Date(profile.first_payment_at as string);
    else if (profile?.subscription_started_at) startDate = new Date(profile.subscription_started_at as string);
    else if (profile?.premium_since) startDate = new Date(profile.premium_since as string);

    // Latest approved payment
    const lastPay = await admin
      .from("payments")
      .select("payment_id, created_at")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latestPaymentId = lastPay?.data?.payment_id ? String(lastPay.data.payment_id) : null;
    const latestPaymentDate = lastPay?.data?.created_at ? new Date(lastPay.data.created_at as string) : null;

    const now = new Date();
    const windowDate = latestPaymentDate || startDate;
    const isWithin7Days = windowDate ? now.getTime() - windowDate.getTime() <= 7 * 24 * 60 * 60 * 1000 : false;

    let providerPaymentId: string | null = (profile?.provider_payment_id as string) || (profile?.payment_id as string) || null;
    if (!providerPaymentId) providerPaymentId = latestPaymentId;

    let refundStatus = "not_applicable";
    let refundPayload: unknown = null;
    if (isWithin7Days && providerPaymentId && MP_ACCESS_TOKEN) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${providerPaymentId}/refunds`, {
        method: "POST",
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      refundPayload = await res.json().catch(() => null);
      refundStatus = res.ok ? "approved" : "failed";
    }

    await admin.from("subscription_cancellation_feedback").insert({
      user_id: userId,
      provider: "mercadopago",
      provider_subscription_id: profile?.provider_subscription_id || null,
      provider_payment_id: providerPaymentId,
      plan_type: profile?.plan_type || null,
      is_within_7_days: isWithin7Days,
      reason_primary,
      final_action: isWithin7Days && providerPaymentId ? (refundStatus === "approved" ? "cancel_refund" : "cancel_refund_failed") : "cancel",
      refund_status: refundStatus,
      provider_payload: { refund: refundPayload },
    });

    await admin
      .from("profiles")
      .update({
        subscription_status: "canceled",
        is_premium: false,
        cancelled_at: now.toISOString(),
        cancel_reason: reason_primary,
        updated_at: now.toISOString(),
      })
      .or(`id.eq.${userId},user_id.eq.${userId}`);

    return new Response(JSON.stringify({ ok: true, is_within_7_days: isWithin7Days, refund_status: refundStatus, payment_id: providerPaymentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unexpected_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
