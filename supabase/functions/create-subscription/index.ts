import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { price: number; frequency: number; frequencyType: string; reason: string }> = {
  monthly: { price: 49.90, frequency: 1, frequencyType: "months", reason: "Maximare Premium - Mensal" },
  yearly: { price: 499.90, frequency: 12, frequencyType: "months", reason: "Maximare Premium - Anual" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    // 2. Parse body
    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: corsHeaders });
    }

    // 3. Get Mercado Pago access token
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Payment not configured" }), { status: 500, headers: corsHeaders });
    }

    // 4. Build the back_url (where MP redirects after payment)
    // Use the published app URL or preview URL
    const appUrl = req.headers.get("origin") || "https://maximare-glow-up-ai.lovable.app";

    // 5. Create MP preapproval (subscription) without plan
    const preapprovalBody = {
      reason: plan.reason,
      auto_recurring: {
        frequency: plan.frequency,
        frequency_type: plan.frequencyType,
        transaction_amount: plan.price,
        currency_id: "BRL",
      },
      back_url: `${appUrl}/payment-callback`,
      external_reference: `${userId}:${planId}`,
      payer_email: userEmail.includes("@maximare.local") ? undefined : userEmail,
      status: "pending",
    };

    console.log("[create-subscription] Creating preapproval:", JSON.stringify(preapprovalBody));

    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preapprovalBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[create-subscription] MP error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: "Failed to create subscription", details: mpData.message || mpData }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("[create-subscription] Preapproval created:", mpData.id, "init_point:", mpData.init_point);

    // 6. Record purchase in database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("purchases").insert({
      user_id: userId,
      plan: planId,
      amount_cents: Math.round(plan.price * 100),
      provider: "mercadopago",
      status: "pending",
      mp_preference_id: mpData.id,
    });

    // 7. Return redirect URL
    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        subscription_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-subscription] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
