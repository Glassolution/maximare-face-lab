
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('Missing payment_id');
    }

    console.log(`[Finalize-Payment] Checking status for payment ${payment_id}...`);

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error("Missing Env Vars");
        throw new Error("Server Configuration Error");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Query Mercado Pago directly
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
      console.error(`[Finalize-Payment] MP Error: ${mpRes.status}`);
      throw new Error('Failed to fetch payment status from Provider');
    }

    const payment = await mpRes.json();
    console.log(`[Finalize-Payment] MP Status: ${payment.status} | ID: ${payment.id}`);

    // 2. If Approved, FORCE update database (Fail-safe)
    if (payment.status === 'approved') {
        const userId = payment.external_reference;
        
        // Logic to determine plan duration
        let planType = 'monthly';
        let days = 30;
        const planId = payment.metadata?.plan_id;

        // Try to fetch plan from metadata or description
        const description = payment.description || '';

        if (planId) {
             const { data: planData } = await supabaseAdmin
                .from('plans')
                .select('*')
                .eq('id', planId)
                .maybeSingle();
             if (planData) {
                 planType = planData.interval;
                 if (planType === 'weekly') days = 7;
                 if (planType === 'yearly') days = 365;
             }
        } else if (description.toLowerCase().includes('weekly') || description.toLowerCase().includes('semanal')) {
            days = 7;
            planType = 'weekly';
        } else if (description.toLowerCase().includes('yearly') || description.toLowerCase().includes('anual')) {
            days = 365;
            planType = 'yearly';
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        if (userId) {
            const base = 'user';
            const username = `${base}_${String(userId).replace(/-/g, '').slice(0, 8)}`.toLowerCase();
            const display_name = base;
            try {
                await supabaseAdmin
                  .from('profiles')
                  .upsert({ 
                    id: userId, 
                    user_id: userId, 
                    username, 
                    display_name,
                    subscription_status: 'free',
                    plan_type: 'free',
                  }, { onConflict: 'id', ignoreDuplicates: true });
            } catch (_e) { void _e; }
            try {
                    await supabaseAdmin
                      .from('profiles')
                      .upsert({ 
                        id: userId, 
                        user_id: userId, 
                        username, 
                        display_name,
                        subscription_status: 'free',
                        plan_type: 'free',
                      }, { onConflict: 'user_id', ignoreDuplicates: true });
                } catch (_e) { void _e; }
            // Centralized activation via RPC
            const { data: activation, error: actError } = await supabaseAdmin.rpc('activate_user_subscription', {
              p_user_id: userId,
              p_plan_type: planType,
              p_payment_id: payment.id.toString(),
              p_days: days,
              p_provider: 'mercadopago',
              p_plan_id: planId,
              p_amount: payment.transaction_amount,
              p_currency: payment.currency_id,
              p_metadata: payment.metadata
            });
            if (actError) {
              console.error("[Finalize-Payment] RPC Activation Error:", actError);
            } else {
              console.log(`[Finalize-Payment] Subscription activated for user: ${userId}`, activation);
            }

            // Update Payments Table (Audit)
            const { error: paymentError } = await supabaseAdmin.from('payments').upsert({
                payment_id: payment.id.toString(),
                user_id: userId,
                plan_id: planId,
                status: 'approved',
                amount: payment.transaction_amount,
                currency: payment.currency_id,
                metadata: payment.metadata,
                updated_at: new Date().toISOString()
            }, { onConflict: 'payment_id' });

             if (paymentError) {
                console.error("[Finalize-Payment] Payments Table Update Error:", paymentError);
            } else {
                console.log(`[Finalize-Payment] Payments table updated.`);
            }
        }
    }

    return new Response(JSON.stringify({ 
        success: payment.status === 'approved',
        status: payment.status,
        payment_id: payment.id 
    }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error("[Finalize-Payment] Error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
