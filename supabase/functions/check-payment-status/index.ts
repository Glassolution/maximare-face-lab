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

    const { payment_id } = await req.json();
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Token do provedor de pagamento não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return new Response(JSON.stringify({
        error: "Falha ao consultar pagamento",
        details: paymentData,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalReference = String(paymentData.external_reference || "");
    const [externalUserId, externalPlanId] = externalReference.split(":");

    const ownerUserId = externalUserId || userData.user.id;
    if (ownerUserId !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Pagamento não pertence ao usuário autenticado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("purchases")
      .update({
        status: paymentData.status || "pending",
        mp_payment_id: String(paymentData.id || payment_id),
      })
      .eq("user_id", userData.user.id)
      .eq("mp_payment_id", String(paymentData.id || payment_id));

    if (paymentData.status === "approved") {
      const frequency = externalPlanId === "yearly" ? 12 : 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + frequency);

      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "active",
          is_premium: true,
          plan_type: externalPlanId || "monthly",
          premium_since: new Date().toISOString(),
          subscription_expires_at: expiresAt.toISOString(),
          payment_provider: "mercadopago",
          provider_payment_id: String(paymentData.id || payment_id),
          last_payment_at: new Date().toISOString(),
        })
        .eq("user_id", userData.user.id);
    }

    return new Response(
      JSON.stringify({
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        payment_id: paymentData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[check-payment-status] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
