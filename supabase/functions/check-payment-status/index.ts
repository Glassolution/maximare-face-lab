import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sb-access-token, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan intervals in days
const PLAN_INTERVALS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
};

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
    console.error("[check-payment] Failed to activate premium:", error);
    throw error;
  }

  console.log("[check-payment] Premium activated for user:", userId);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticacao do usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[check-payment] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MP_ACCESS_TOKEN) {
      console.error("[check-payment] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar service role para verificar o token do usuario e acessar dados
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Extrair token do header e verificar usuario
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      console.error("[check-payment] Authentication failed");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[check-payment] Authenticated user:", user.id);

    // Get payment record
    const { data: paymentRecord, error: dbError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (dbError || !paymentRecord) {
      console.error("[check-payment] Payment not found:", dbError);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CORRIGIDO: Verificar se o pagamento pertence ao usuario autenticado
    if (paymentRecord.user_id !== user.id) {
      console.error("[check-payment] Payment does not belong to user:", user.id);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Payment does not belong to user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already approved, return success
    if (paymentRecord.status === "approved") {
      return new Response(
        JSON.stringify({
          status: "approved",
          payment_id: paymentRecord.payment_id,
          plan_id: paymentRecord.plan_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no MP payment_id yet, still pending
    if (!paymentRecord.payment_id) {
      return new Response(
        JSON.stringify({ status: "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check with MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentRecord.payment_id}`,
      {
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!mpResponse.ok) {
      console.error("[check-payment] MP API error");
      return new Response(
        JSON.stringify({ status: paymentRecord.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();
    console.log("[check-payment] MP status:", mpData.status);

    // Update local record
    await supabaseAdmin
      .from("payments")
      .update({
        status: mpData.status,
        approved_at: mpData.status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment_id);

    // If approved, activate premium
    if (mpData.status === "approved") {
      await activatePremium(
        supabaseAdmin,
        paymentRecord.user_id,
        paymentRecord.plan_id,
        paymentRecord.payment_id
      );
    }

    return new Response(
      JSON.stringify({
        status: mpData.status,
        payment_id: paymentRecord.payment_id,
        plan_id: paymentRecord.plan_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[check-payment] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
