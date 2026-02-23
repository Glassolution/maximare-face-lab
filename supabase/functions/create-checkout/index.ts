
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
const WEBHOOK_URL = Deno.env.get('MERCADOPAGO_WEBHOOK_URL') || ''; // e.g. https://<project>.supabase.co/functions/v1/mercadopago-webhook
const BACK_URL_BASE = Deno.env.get('APP_DEEPLINK_SCHEME') || 'maximare://'; // e.g. maximare://payment-result

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Validate Env Vars
    if (!MP_ACCESS_TOKEN) {
      console.error('Missing MERCADOPAGO_ACCESS_TOKEN');
      throw new Error('Server Configuration Error: Missing Payment Token');
    }
    
    // 2. Validate User
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { plan } = await req.json();

    if (!['weekly', 'monthly', 'yearly'].includes(plan)) {
      throw new Error('Invalid plan');
    }

    let price = 0;
    let title = '';
    
    switch (plan) {
      case 'weekly':
        price = 24.90;
        title = 'Maximare Premium - Semanal';
        break;
      case 'monthly':
        price = 49.90;
        title = 'Maximare Premium - Mensal';
        break;
      case 'yearly':
        price = 499.90;
        title = 'Maximare Premium - Anual';
        break;
    }

    // 3. Create Purchase
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('purchases')
      .insert({
        user_id: user.id,
        provider: 'mercadopago',
        plan,
        amount_cents: Math.round(price * 100),
        currency: 'BRL',
        status: 'pending',
      })
      .select()
      .single();

    if (purchaseError) {
        console.error('Purchase creation failed:', purchaseError);
        throw new Error('Failed to create purchase record');
    }

    // 4. Construct Preference Body
    // Ensure we don't send empty notification_url if not set
    const notificationUrl = WEBHOOK_URL && WEBHOOK_URL.startsWith('http') ? WEBHOOK_URL : undefined;

    const preferenceBody = {
      items: [
        {
          title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price,
        },
      ],
      external_reference: purchase.id,
      notification_url: notificationUrl,
      back_urls: {
        success: `${BACK_URL_BASE}payment-result?status=success&purchase_id=${purchase.id}`,
        failure: `${BACK_URL_BASE}payment-result?status=failure&purchase_id=${purchase.id}`,
        pending: `${BACK_URL_BASE}payment-result?status=pending&purchase_id=${purchase.id}`,
      },
      auto_return: 'approved',
      payer: {
        email: user.email || 'customer@maximare.app', // Fallback email if user has none (e.g. phone auth)
      },
      payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 1
      },
      binary_mode: true 
    };

    console.log('Creating preference with body:', JSON.stringify(preferenceBody));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago Error:', mpData);
      // Return the actual error message from MP for debugging
      throw new Error(`Mercado Pago Error: ${mpData.message || mpData.error || 'Unknown error'}`);
    }

    // Update purchase with preference ID
    await supabaseClient
      .from('purchases')
      .update({ mp_preference_id: mpData.id })
      .eq('id', purchase.id);

    return new Response(
      JSON.stringify({
        checkout_url: mpData.init_point, 
        purchase_id: purchase.id,
        mp_preference_id: mpData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Create Checkout Error:', error);
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
