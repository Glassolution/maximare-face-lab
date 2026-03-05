import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse webhook body
    const body = await req.json();
    console.log("[mp-webhook] Received:", JSON.stringify(body));

    const { action, type, data } = body;
    const resourceId = data?.id;

    if (!resourceId) {
      console.log("[mp-webhook] No resource ID, ignoring");
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Log webhook event
    await supabaseAdmin.from("webhook_events").insert({
      provider: "mercadopago",
      event_type: `${type}.${action}`,
      resource_id: String(resourceId),
      payload: body,
      notification_id: body.id ? String(body.id) : null,
    });

    // Handle subscription (preapproval) events
    if (type === "subscription_preapproval") {
      await handleSubscriptionEvent(resourceId, mpAccessToken, supabaseAdmin);
    }

    // Handle payment events (associated with subscriptions)
    if (type === "payment") {
      await handlePaymentEvent(resourceId, mpAccessToken, supabaseAdmin);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[mp-webhook] Error:", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});

async function handleSubscriptionEvent(preapprovalId: string, token: string, supabase: any) {
  // Fetch preapproval details from MP
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("[mp-webhook] Failed to fetch preapproval:", res.status);
    await res.text();
    return;
  }

  const preapproval = await res.json();
  console.log("[mp-webhook] Preapproval status:", preapproval.status, "external_reference:", preapproval.external_reference);

  const externalRef = preapproval.external_reference || "";
  const [userId, planId] = externalRef.split(":");

  if (!userId) {
    console.error("[mp-webhook] No userId in external_reference");
    return;
  }

  // Map MP status to our status
  const mpStatus = preapproval.status;
  const now = new Date().toISOString();

  if (mpStatus === "authorized") {
    // Subscription is active
    const frequency = preapproval.auto_recurring?.frequency || 1;
    const frequencyType = preapproval.auto_recurring?.frequency_type || "months";
    
    // Calculate expiration
    const expiresAt = new Date();
    if (frequencyType === "months") {
      expiresAt.setMonth(expiresAt.getMonth() + frequency);
    } else if (frequencyType === "days") {
      expiresAt.setDate(expiresAt.getDate() + frequency);
    }

    await supabase.from("profiles").update({
      subscription_status: "active",
      is_premium: true,
      plan_type: planId || "monthly",
      premium_since: now,
      subscription_expires_at: expiresAt.toISOString(),
      provider_subscription_id: preapprovalId,
      payment_provider: "mercadopago",
      last_payment_at: now,
    }).eq("user_id", userId);

    // Update purchase record
    await supabase.from("purchases").update({
      status: "approved",
      mp_payment_id: preapprovalId,
    }).eq("mp_preference_id", preapprovalId);

    console.log("[mp-webhook] User activated:", userId, "plan:", planId);

  } else if (mpStatus === "paused") {
    await supabase.from("profiles").update({
      subscription_status: "paused",
    }).eq("user_id", userId);
    console.log("[mp-webhook] User paused:", userId);

  } else if (mpStatus === "cancelled") {
    await supabase.from("profiles").update({
      subscription_status: "cancelled",
      is_premium: false,
      cancelled_at: now,
    }).eq("user_id", userId);
    console.log("[mp-webhook] User cancelled:", userId);
  }
}

async function handlePaymentEvent(paymentId: string, token: string, supabase: any) {
  // Fetch payment details from MP
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("[mp-webhook] Failed to fetch payment:", res.status);
    await res.text();
    return;
  }

  const payment = await res.json();
  console.log("[mp-webhook] Payment status:", payment.status, "external_reference:", payment.external_reference);

  if (payment.status === "approved") {
    const externalRef = payment.external_reference || "";
    const [userId, planId] = externalRef.split(":");

    if (!userId) return;

    const frequency = planId === "yearly" ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + frequency);

    await supabase.from("profiles").update({
      subscription_status: "active",
      is_premium: true,
      plan_type: planId || "monthly",
      premium_since: new Date().toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
      payment_provider: "mercadopago",
      provider_payment_id: String(paymentId),
      last_payment_at: new Date().toISOString(),
    }).eq("user_id", userId);

    console.log("[mp-webhook] Payment approved for user:", userId);
  }
}
