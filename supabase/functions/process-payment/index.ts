// @ts-nocheck - Edge function uses Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const userEmail = userData.user.email || "";

    const body = await req.json();
    const { payment_method, planId, card_token, installments, payer } = body;

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "MP token não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plan prices
    const PLANS: Record<string, { price: number; description: string }> = {
      monthly: { price: 24.90, description: "Maximare Premium - Mensal" },
      yearly: { price: 499.90, description: "Maximare Premium - Anual" },
    };

    const plan = PLANS[planId];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idempotencyKey = `${userId}-${planId}-${Date.now()}`;

    let paymentBody: any;

    if (payment_method === "pix") {
      paymentBody = {
        transaction_amount: plan.price,
        description: plan.description,
        payment_method_id: "pix",
        payer: {
          email: userEmail.includes("@maximare.local")
            ? payer?.email || "test@test.com"
            : userEmail,
          first_name: payer?.first_name || "User",
          last_name: payer?.last_name || "",
          identification: payer?.identification || undefined,
        },
        external_reference: `${userId}:${planId}`,
      };
    } else if (payment_method === "credit_card") {
      if (!card_token) {
        return new Response(JSON.stringify({ error: "Token do cartão é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      paymentBody = {
        transaction_amount: plan.price,
        description: plan.description,
        payment_method_id: body.payment_method_id || "master",
        token: card_token,
        installments: installments || 1,
        payer: {
          email: userEmail.includes("@maximare.local")
            ? payer?.email || "test@test.com"
            : userEmail,
          first_name: payer?.first_name || "User",
          last_name: payer?.last_name || "",
          identification: payer?.identification || undefined,
        },
        external_reference: `${userId}:${planId}`,
      };
    } else {
      return new Response(JSON.stringify({ error: "Método de pagamento inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[process-payment] Creating payment:", payment_method, planId);

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[process-payment] MP error:", JSON.stringify(mpData));
      return new Response(JSON.stringify({
        error: "Erro ao processar pagamento",
        details: mpData,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save purchase record
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("purchases").insert({
      user_id: userId,
      plan: planId,
      amount_cents: Math.round(plan.price * 100),
      provider: "mercadopago",
      status: mpData.status || "pending",
      mp_payment_id: String(mpData.id),
    });

    // If approved immediately (credit card), activate premium
    if (mpData.status === "approved") {
      const frequency = planId === "yearly" ? 12 : 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + frequency);

      await supabaseAdmin.from("profiles").update({
        subscription_status: "active",
        is_premium: true,
        plan_type: planId,
        premium_since: new Date().toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
        payment_provider: "mercadopago",
        provider_payment_id: String(mpData.id),
        last_payment_at: new Date().toISOString(),
      }).eq("user_id", userId);
    }

    // Build response
    const response: any = {
      status: mpData.status,
      status_detail: mpData.status_detail,
      payment_id: mpData.id,
    };

    // PIX-specific data
    if (payment_method === "pix" && mpData.point_of_interaction?.transaction_data) {
      response.pix_qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      response.pix_qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      response.pix_copy_paste = mpData.point_of_interaction.transaction_data.qr_code;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[process-payment] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
