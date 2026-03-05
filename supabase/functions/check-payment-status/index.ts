import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, sb-access-token, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('Missing payment_id');
    }

    console.log(`Checking status for payment ${payment_id}...`);

    // 1. Query Mercado Pago directly
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
      console.error("MP Error:", mpRes.status);
      throw new Error('Failed to fetch payment status from Provider');
    }

    const payment = await mpRes.json();
    console.log(`MP Status: ${payment.status} | ID: ${payment.id}`);

    // 2. If Approved, FORCE update database (Fail-safe)
    if (payment.status === 'approved') {
        const userId = payment.external_reference;
        
        // Calculate expiration based on plan
        // Try to get plan from metadata or description
        let planType = 'monthly';
        let days = 30;
        
        // Logic to determine plan duration (similar to webhook)
        const description = payment.description || '';
        const planId = payment.metadata?.plan_id;

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

        // Idempotent Update
        // We update even if already active, to ensure sync
        if (userId) {
            const { error } = await supabaseAdmin.from('profiles').update({
                subscription_status: 'active',
                is_premium: true,
                premium_since: new Date().toISOString(),
                subscription_expires_at: expiresAt.toISOString(),
                plan_type: planType,
                premium_plan_id: planId || null,
                payment_provider: 'mercadopago',
                payment_id: payment.id.toString(),
                payment_status: 'approved',
                updated_at: new Date().toISOString()
            }).eq('id', userId);

            if (error) console.error("Force update failed:", error);
            else console.log("Force update success for user:", userId);
        }
    }

    return new Response(JSON.stringify({ 
        status: payment.status,
        payment_id: payment.id 
    }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error("Check Status Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
