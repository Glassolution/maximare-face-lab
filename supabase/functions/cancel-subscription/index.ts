import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabaseAuth.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json();
    const { reason_primary, reason_details } = body;

    if (!reason_primary) {
      return new Response(JSON.stringify({ error: "Motivo é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.subscription_status !== "active" && profile.subscription_status !== "trialing") {
      return new Response(JSON.stringify({ error: "Nenhuma assinatura ativa encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if within 7 days of last payment
    const lastPaymentAt = profile.last_payment_at ? new Date(profile.last_payment_at) : null;
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const isWithin7Days = lastPaymentAt ? (now.getTime() - lastPaymentAt.getTime()) <= sevenDaysMs : false;

    let refundStatus = "not_applicable";
    let refundResult: any = null;

    // Attempt refund if within 7 days and has a payment ID
    if (isWithin7Days && profile.provider_payment_id) {
      const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";

      if (mpAccessToken) {
        console.log("[cancel-subscription] Attempting refund for payment:", profile.provider_payment_id);

        const refundResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${profile.provider_payment_id}/refunds`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${mpAccessToken}`,
            },
            body: JSON.stringify({}),
          }
        );

        refundResult = await refundResponse.json();

        if (refundResponse.ok) {
          refundStatus = "refunded";
          console.log("[cancel-subscription] Refund successful:", refundResult);
        } else {
          refundStatus = "refund_failed";
          console.error("[cancel-subscription] Refund failed:", refundResult);
        }
      }
    }

    // Update profile: deactivate premium
    await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "cancelled",
        is_premium: false,
        cancelled_at: now.toISOString(),
        cancel_reason: reason_primary,
      })
      .eq("user_id", userId);

    // Update purchase record
    if (profile.provider_payment_id) {
      await supabaseAdmin
        .from("purchases")
        .update({ status: refundStatus === "refunded" ? "refunded" : "cancelled" })
        .eq("mp_payment_id", profile.provider_payment_id);
    }

    // Save cancellation feedback
    await supabaseAdmin.from("subscription_cancellation_feedback").insert({
      user_id: userId,
      reason_primary,
      reason_details: reason_details || null,
      plan_type: profile.plan_type,
      provider: profile.payment_provider || "mercadopago",
      provider_payment_id: profile.provider_payment_id || null,
      provider_subscription_id: profile.provider_subscription_id || null,
      is_within_7_days: isWithin7Days,
      refund_status: refundStatus,
      final_action: isWithin7Days ? "refund_and_cancel" : "cancel_only",
      price: profile.plan_type === "yearly" ? 499.90 : 1.00,
    });

    return new Response(
      JSON.stringify({
        success: true,
        refunded: refundStatus === "refunded",
        is_within_7_days: isWithin7Days,
        refund_status: refundStatus,
        message: refundStatus === "refunded"
          ? "Assinatura cancelada e reembolso processado com sucesso."
          : isWithin7Days && refundStatus === "refund_failed"
          ? "Assinatura cancelada. Houve um problema com o reembolso, entre em contato com o suporte."
          : "Assinatura cancelada com sucesso.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[cancel-subscription] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
