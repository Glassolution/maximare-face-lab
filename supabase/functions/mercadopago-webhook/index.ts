import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan intervals in days
const PLAN_INTERVALS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
};

// Verify webhook signature
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const computed = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return computed === signature;
  } catch (e) {
    console.error("[webhook] Signature verification error:", e);
    return false;
  }
}

// Activate premium subscription
async function activatePremium(
  supabase: any,
  userId: string,
  planId: string,
  paymentId: string
) {
  const interval = PLAN_INTERVALS[planId] || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + interval);

  const { error } = await supabase
    .from("profiles")
    .update({
      is_premium: true,
      subscription_status: "active",
      premium_status: true,
      plan_type: planId,
      subscription_expires_at: expiresAt.toISOString(),
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[webhook] Failed to activate premium:", error);
    throw error;
  }

  console.log("[webhook] Premium activated for user:", userId);
}

// Deactivate premium
async function deactivatePremium(
  supabase: any,
  userId: string,
  status: string
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_premium: false,
      subscription_status: status,
      premium_status: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[webhook] Failed to deactivate premium:", error);
    throw error;
  }

  console.log("[webhook] Premium deactivated for user:", userId, "status:", status);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const MP_WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[webhook] Missing Supabase environment variables");
      return new Response("OK", { status: 200 }); // Return 200 to MP
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log("[webhook] Received:", payload);

    // Idempotency check
    const eventId = payload.id || `${payload.type}-${payload.data?.id}`;
    if (!eventId) {
      console.error("[webhook] No event ID found");
      return new Response("OK", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if already processed
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (existingEvent) {
      console.log("[webhook] Event already processed:", eventId);
      return new Response("OK", { status: 200 });
    }

    // Mark as processed (idempotency)
    const { error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        event_id: eventId,
        event_type: payload.type || "unknown",
      });

    if (insertError) {
      // If conflict, event was already processed
      if (insertError.code === "23505") {
        console.log("[webhook] Event already processed (conflict):", eventId);
        return new Response("OK", { status: 200 });
      }
      console.error("[webhook] Failed to record event:", insertError);
    }

    // Process payment events
    if (payload.type === "payment" && payload.data?.id) {
      const paymentId = payload.data.id;

      // Fetch payment details from MP
      const mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
          },
        }
      );

      if (!mpResponse.ok) {
        console.error("[webhook] Failed to fetch payment from MP");
        return new Response("OK", { status: 200 });
      }

      const paymentData = await mpResponse.json();
      console.log("[webhook] Payment data:", paymentData.status);

      const userId = paymentData.external_reference;
      if (!userId) {
        console.error("[webhook] No external_reference found");
        return new Response("OK", { status: 200 });
      }

      // Update payments table
      const { data: paymentRecord } = await supabase
        .from("payments")
        .select("id, plan_id")
        .eq("preference_id", paymentData.preference_id)
        .single();

      if (paymentRecord) {
        await supabase
          .from("payments")
          .update({
            status: paymentData.status,
            payment_id: String(paymentId),
            approved_at: paymentData.status === "approved" ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentRecord.id);
      }

      // Handle status
      if (paymentData.status === "approved") {
        await activatePremium(
          supabase,
          userId,
          paymentRecord?.plan_id || "monthly",
          String(paymentId)
        );
      } else if (["refunded", "cancelled", "rejected"].includes(paymentData.status)) {
        await deactivatePremium(supabase, userId, paymentData.status);
      }
    }

    // Always return 200 to MP
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[webhook] Unexpected error:", error);
    // Always return 200 to prevent MP retries
    return new Response("OK", { status: 200 });
  }
});
