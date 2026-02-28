import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ENV_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";

type Payload = {
  reason_primary: string;
  reason_details?: string | null;
  nps?: number | null;
  had_issues?: boolean | null;
  issue_details?: string | null;
  retention_offer_shown?: string | null;
  retention_offer_accepted?: boolean | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "server_config_error", detail: "MISSING_URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    try {
      const info = {
        hasAuth: !!authHeader,
        authLen: authHeader ? authHeader.length : 0,
        hasAnon: !!(req.headers.get("apikey") || req.headers.get("x-api-key") || ENV_ANON_KEY),
      };
      console.log(JSON.stringify({ tag: "subcancel_req_headers", ...info }));
    } catch {}
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized", reason: "missing_auth_header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headerAnon = req.headers.get("apikey") || req.headers.get("x-api-key") || "";
    const ANON_KEY = ENV_ANON_KEY || headerAnon;
    if (!ANON_KEY) {
      return new Response(JSON.stringify({ error: "server_config_error", detail: "MISSING_ANON_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null;

    const { data: userRes } = await client.auth.getUser();
    const user = userRes?.user;
    try {
      console.log(JSON.stringify({ tag: "subcancel_user", userId: user?.id || null }));
    } catch {}
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized", reason: "invalid_user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.reason_primary) {
      return new Response(JSON.stringify({ error: "Missing reason_primary" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = admin ?? client;
    const { data: profile } = await db
      .from("profiles")
      .select(
        "id, subscription_status, subscription_expires_at, premium_since, plan_type, payment_provider, payment_id, provider_payment_id, provider_subscription_id, first_payment_at, subscription_started_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let startDate: Date | null = null;
    if (profile.first_payment_at) startDate = new Date(profile.first_payment_at as string);
    else if (profile.subscription_started_at) startDate = new Date(profile.subscription_started_at as string);
    else if (profile.premium_since) startDate = new Date(profile.premium_since as string);

    if (!startDate || isNaN(startDate.getTime())) {
      const { data: firstPay } = await admin
        .from("payments")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstPay?.created_at) startDate = new Date(firstPay.created_at as string);
    }

    const now = new Date();
    const isWithin7Days = startDate ? now.getTime() - startDate.getTime() <= 7 * 24 * 60 * 60 * 1000 : false;

    const providerPaymentId = profile.provider_payment_id || profile.payment_id || null;
    const providerSubscriptionId = profile.provider_subscription_id || null;

    if (providerPaymentId) {
      const { data: existing } = await db
        .from("subscription_cancellation_feedback")
        .select("id, refund_status, created_at")
        .eq("user_id", user.id)
        .eq("provider_payment_id", providerPaymentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({
            status: "already_cancelled",
            refund_status: existing.refund_status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let cancelPayload: unknown = null;
    let refundPayload: unknown = null;
    let refundStatus: string = "not_applicable";

    if (providerSubscriptionId && MP_ACCESS_TOKEN) {
      const res = await fetch(`https://api.mercadopago.com/preapproval/${providerSubscriptionId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      cancelPayload = await res.json().catch(() => null);
    }

    if (isWithin7Days && providerPaymentId && MP_ACCESS_TOKEN) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${providerPaymentId}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({}),
      });
      refundPayload = await res.json().catch(() => null);
      refundStatus = res.ok ? "approved" : "failed";
    }

    let price: number | null = null;
    if (providerPaymentId) {
      const { data: p } = await admin
        .from("payments")
        .select("amount")
        .eq("payment_id", providerPaymentId.toString())
        .maybeSingle();
      if (p?.amount != null) price = Number(p.amount);
    }

    const finalAction = isWithin7Days && providerPaymentId ? (refundStatus === "approved" ? "cancel_refund" : "cancel_refund_failed") : "cancel";

    await db.from("subscription_cancellation_feedback").insert({
      user_id: user.id,
      provider: "mercadopago",
      provider_subscription_id: providerSubscriptionId,
      provider_payment_id: providerPaymentId,
      plan_type: profile.plan_type || null,
      price,
      is_within_7_days: isWithin7Days,
      reason_primary: body.reason_primary,
      reason_details: body.reason_details || null,
      nps: body.nps ?? null,
      had_issues: body.had_issues ?? null,
      issue_details: body.issue_details || null,
      retention_offer_shown: body.retention_offer_shown || null,
      retention_offer_accepted: body.retention_offer_accepted ?? null,
      final_action: finalAction,
      refund_status: refundStatus,
      provider_payload: { cancel: cancelPayload, refund: refundPayload },
    });

    const updates: Record<string, unknown> = {
      subscription_status: "canceled",
      is_premium: false,
      cancelled_at: now.toISOString(),
      cancel_reason: body.reason_primary,
      updated_at: now.toISOString(),
    };
    if (providerPaymentId && !profile.provider_payment_id) updates["provider_payment_id"] = providerPaymentId;
    if (!profile.first_payment_at && startDate) updates["first_payment_at"] = startDate.toISOString();

    await db.from("profiles").update(updates).eq("id", user.id);

    return new Response(
      JSON.stringify({
        ok: true,
        is_within_7_days: isWithin7Days,
        refund_status: refundStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

