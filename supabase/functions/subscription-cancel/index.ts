import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sb-access-token, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[cancel] Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[cancel] Cancelling subscription for user:", user_id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's last approved payment
    const { data: lastPayment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !lastPayment) {
      console.error("[cancel] No approved payment found:", paymentError);
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if within 7 days
    const approvedAt = new Date(lastPayment.approved_at || lastPayment.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - approvedAt.getTime()) / (1000 * 60 * 60 * 24);
    const isWithin7Days = daysDiff <= 7;

    console.log("[cancel] Payment approved at:", approvedAt, "Days diff:", daysDiff);

    let refundStatus = null;

    // If within 7 days and has MP payment_id, request refund
    if (isWithin7Days && lastPayment.payment_id && MP_ACCESS_TOKEN) {
      console.log("[cancel] Requesting refund...");

      const refundResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${lastPayment.payment_id}/refunds`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (refundResponse.ok) {
        const refundData = await refundResponse.json();
        refundStatus = refundData.status;
        console.log("[cancel] Refund created:", refundStatus);

        // Update payment status
        await supabase
          .from("payments")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("id", lastPayment.id);
      } else {
        const refundError = await refundResponse.text();
        console.error("[cancel] Refund failed:", refundError);
        return new Response(
          JSON.stringify({ error: "Refund request failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update profile to cancel subscription
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_premium: false,
        subscription_status: "cancelled",
        premium_status: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (profileError) {
      console.error("[cancel] Failed to update profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to cancel subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[cancel] Subscription cancelled for user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        is_within_7_days: isWithin7Days,
        refund_status: refundStatus,
        message: isWithin7Days && refundStatus === "approved"
          ? "Assinatura cancelada e reembolso aprovado"
          : "Assinatura cancelada",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[cancel] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
