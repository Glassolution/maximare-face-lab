import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, sb-access-token, x-supabase-auth',
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ENV_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!MP_ACCESS_TOKEN || !SERVICE_ROLE_KEY || !SUPABASE_URL) {
      console.error("Missing Env Vars: MP_ACCESS_TOKEN, SERVICE_ROLE_KEY or SUPABASE_URL");
      throw new Error('Server Configuration Error');
    }

    console.log("Create Payment Function v2.1 - Starting");

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { 
      token, 
      issuer_id, 
      payment_method_id, 
      installments, 
      payer, 
      plan_id // Expect plan_id (weekly, monthly, yearly)
    } = await req.json();

    console.log("Processing payment for:", payer?.email, "Plan ID:", plan_id);

    // 1. Fetch Plan Details from Database (Price Security)
    const { data: planData, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .single();

    if (planError || !planData) {
        throw new Error('Plano inválido ou não encontrado.');
    }

    const transaction_amount = planData.price_cents / 100; // Convert cents to float
    console.log(`Plan: ${planData.name}, Amount: ${transaction_amount}`);

    // 2. Resolve User
    let userId;
    
    // Resolve user via sb-access-token first (to avoid gateway issues),
    // fallback to Authorization for backward compatibility
    const sbToken = req.headers.get('sb-access-token') || req.headers.get('x-supabase-auth') || '';
    const authHeader = req.headers.get('Authorization') || '';
    const headerAnon = req.headers.get('apikey') || req.headers.get('x-api-key') || '';
    const effectiveAnon = ENV_ANON_KEY || headerAnon;

    if (sbToken) {
      const supabaseClient = createClient(SUPABASE_URL!, effectiveAnon, {
        global: { headers: { Authorization: `Bearer ${sbToken}` } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser(sbToken);
      if (user) userId = user.id;
    } else if (authHeader) {
      const supabaseClient = createClient(SUPABASE_URL!, effectiveAnon, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) userId = user.id;
    }

    // If not logged in, try to find by email or create new user
    if (!userId && payer?.email) {
      // 1. Try to find existing user by email using our secure RPC function
      // Note: Function parameter is 'email_input'
      const { data: existingUserId, error: findError } = await supabaseAdmin.rpc('get_user_id_by_email', { 
        email_input: payer.email 
      });

      if (existingUserId) {
        userId = existingUserId;
        console.log("Found existing user:", userId);
      } else {
        // 2. Create new user if not found
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: payer.email,
          email_confirm: true,
          user_metadata: { full_name: (payer.first_name || '') + ' ' + (payer.last_name || '') }
        });

        if (createError) {
            console.error("User create error:", createError);
            throw new Error("Erro ao criar usuário: " + createError.message);
        }

        userId = newUser.user.id;
        console.log("Created new user:", userId);
        
        // Create profile entry immediately
        await supabaseAdmin.from('profiles').insert({ 
            id: userId,
            full_name: (payer.first_name || '') + ' ' + (payer.last_name || '')
        }).catch((e) => console.log("Profile creation note:", e.message));

        // Send password reset email for "First Access" flow
        await supabaseAdmin.auth.admin.inviteUserByEmail(payer.email);
      }
    }

    if (!userId) {
      throw new Error('User identification failed');
    }

    // 3. Create Payment in Mercado Pago
    const paymentData: any = {
      transaction_amount,
      description: `Maximare Premium - ${planData.name}`,
      payment_method_id,
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.identification
      },
      external_reference: userId,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      metadata: {
        plan_id: plan_id
      }
    };

    // Add specific fields based on method
    if (payment_method_id === 'pix') {
        // PIX specific
        // No extra fields needed for basic PIX, date_of_expiration defaults to 24h usually
    } else {
        // Card specific
        paymentData.token = token;
        paymentData.installments = installments;
        paymentData.issuer_id = issuer_id;
    }

    console.log("Sending to MP:", JSON.stringify(paymentData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentData)
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP Error Response:', payment);
      const msg = payment.message || (payment.cause && payment.cause[0]?.description) || 'Payment processing failed';
      throw new Error(msg);
    }

    console.log("Payment created:", payment.id, payment.status);

    try {
      const base = (payer?.email ? String(payer.email).split('@')[0] : 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 16) || 'user';
      const username = `${base}_${String(userId).replace(/-/g, '').slice(0, 8)}`.toLowerCase();
      const display_name = base;
      const full_name = ((payer?.first_name || '') + ' ' + (payer?.last_name || '')).trim() || null;
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          user_id: userId,
          username,
          display_name,
          full_name,
          subscription_status: 'free',
          plan_type: 'free',
        }, { onConflict: 'id', ignoreDuplicates: true });
    } catch {
      try {
        const base = (payer?.email ? String(payer.email).split('@')[0] : 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 16) || 'user';
        const username = `${base}_${String(userId).replace(/-/g, '').slice(0, 8)}`.toLowerCase();
        const display_name = base;
        const full_name = ((payer?.first_name || '') + ' ' + (payer?.last_name || '')).trim() || null;
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            user_id: userId,
            username,
            display_name,
            full_name,
            subscription_status: 'free',
            plan_type: 'free',
          }, { onConflict: 'user_id', ignoreDuplicates: true });
      } catch {}
    }

    // 4. Update Profile (Immediate access if approved)
    if (payment.status === 'approved') {
       // Calculate expiration
       let days = 30;
       if (planData.interval === 'weekly') days = 7;
       if (planData.interval === 'yearly') days = 365;

       const expiresAt = new Date();
       expiresAt.setDate(expiresAt.getDate() + days);

       const nowIso = new Date().toISOString();
       const { error: updateError } = await supabaseAdmin.from('profiles').update({
         subscription_status: 'active',
         is_premium: true,
         premium_since: nowIso,
         subscription_expires_at: expiresAt.toISOString(),
         premium_plan_id: plan_id,
         plan_type: planData.interval, // Legacy field support
         payment_provider: 'mercadopago',
         payment_id: payment.id.toString(),
         payment_status: 'approved',
         first_payment_at: nowIso,
         last_payment_at: nowIso,
         updated_at: nowIso
       }).or(`id.eq.${userId},user_id.eq.${userId}`);

       if (updateError) console.error("Failed to update profile:", updateError);
    }

    console.log(`[Create-Payment] Created Payment ID: ${payment.id} for User: ${userId}`);

    // Insert into 'payments' table for tracking
    const { error: insertError } = await supabaseAdmin.from('payments').upsert({
        payment_id: payment.id.toString(),
        user_id: userId,
        plan_id: plan_id,
        status: payment.status,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        metadata: payment.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }, { onConflict: 'payment_id' });

    if (insertError) {
        console.error("[Create-Payment] Failed to insert into payments table:", insertError);
    } else {
        console.log("[Create-Payment] Payment saved to payments table:", payment.id.toString());
    }

    // Return Data
    const responseData: any = {
        status: payment.status,
        payment_id: payment.id,
        user_id: userId
    };

    // If PIX, return QR Code data
    if (payment_method_id === 'pix' && payment.point_of_interaction) {
        responseData.qr_code = payment.point_of_interaction.transaction_data.qr_code;
        responseData.qr_code_base64 = payment.point_of_interaction.transaction_data.qr_code_base64;
        responseData.ticket_url = payment.point_of_interaction.transaction_data.ticket_url;
    }

    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
