import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sb-access-token, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Planos disponiveis
// TESTE: Mensal a R$ 1,00 (100 centavos) para testes
const PLANS = {
  monthly: { name: "Plano Mensal (TESTE R$1)", price_cents: 100, interval_days: 30 },
  yearly: { name: "Plano Anual", price_cents: 9990, interval_days: 365 },
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
    const MP_PUBLIC_KEY = Deno.env.get("MERCADOPAGO_PUBLIC_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[create-payment] Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!MP_ACCESS_TOKEN) {
      console.error("[create-payment] Missing MERCADOPAGO_ACCESS_TOKEN");
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { user_id, user_email, plan_id } = await req.json();

    console.log("[create-payment] Request:", { user_id, user_email, plan_id });

    // Validate inputs
    if (!user_id || !user_email || !plan_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, user_email, plan_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate plan
    const plan = PLANS[plan_id as keyof typeof PLANS];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Invalid plan_id. Must be 'monthly' or 'yearly'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user exists
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError || !userData) {
      console.error("[create-payment] User not found:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create MercadoPago preference
    const preferenceData = {
      items: [
        {
          title: plan.name,
          description: `Acesso premium - ${plan.name}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: plan.price_cents / 100,
        },
      ],
      payer: {
        email: user_email,
      },
      external_reference: user_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" },
          { id: "atm" },
          { id: "debit_card" },
        ],
        installments: 12,
      },
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    };

    console.log("[create-payment] Creating MP preference...");

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text();
      console.error("[create-payment] MP Error:", mpError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment preference" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();
    console.log("[create-payment] MP Preference created:", mpData.id);

    // Save to payments table
    const { data: paymentRecord, error: dbError } = await supabase
      .from("payments")
      .insert({
        user_id,
        plan_id,
        status: "pending",
        amount: plan.price_cents,
        preference_id: mpData.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[create-payment] DB Error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save payment record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-payment] Payment record created:", paymentRecord.id);

    // Return preference data
    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        public_key: MP_PUBLIC_KEY,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        payment_id: paymentRecord.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[create-payment] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
