
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Robust Event Parser Helper
async function parseEvent(req: Request) {
  const url = new URL(req.url);
  const queryType = url.searchParams.get('topic') || url.searchParams.get('type');
  const queryId = url.searchParams.get('id') || url.searchParams.get('data.id');

  let body: any = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch (e) {
    console.error("Error parsing body:", e);
  }

  // PRIORITIZE QUERY PARAMS (Fix for wrong eventType interpretation)
  // If query params exist, they are the source of truth for the notification type.
  // Body is often just { id, live_mode, ... } without type, or type inside action.
  
  const eventType = queryType || body.type || body.topic || body.action;
  const resourceId = queryId || body.data?.id || body.id;

  return { eventType, resourceId, body, query: Object.fromEntries(url.searchParams) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 0. Validate Env
  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Environment Variables");
    return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Parse Event
    const { eventType, resourceId, body, query } = await parseEvent(req);
    console.log('Webhook received:', { eventType, resourceId, query, bodyKeys: Object.keys(body) });

    if (!eventType || !resourceId) {
      return new Response(JSON.stringify({ received: true, message: 'Missing event details (type or id)' }), { 
        status: 200, headers: corsHeaders 
      });
    }

    // 2. Idempotency Check (Check ONLY, do not insert yet)
    // We insert AFTER success or marking as 'processing' to allow retries on failure, 
    // BUT common practice is to record receipt first. 
    // Prompt says: "NÃO marcar como processed antes de finalizar com sucesso".
    // So we check if *completed* event exists.
    
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id, status')
      .eq('provider', 'mercadopago')
      .eq('event_type', eventType)
      .eq('resource_id', resourceId)
      .eq('status', 'success') // Only block if successfully processed
      .maybeSingle();

    if (existingEvent) {
      console.log('Event already processed successfully:', existingEvent.id);
      return new Response(JSON.stringify({ received: true, message: 'Already processed' }), { 
        status: 200, headers: corsHeaders 
      });
    }

    // Log attempt (optional, or insert as 'pending')
    console.log(`Processing case: ${eventType} ID: ${resourceId}`);

    // 3. Process Logic
    let processed = false;
    let details = {};

    // --- CASE A: Subscription Authorized Payment (Recurring Payment Success) ---
    if (eventType === 'subscription_authorized_payment') {
        // resourceId is PAYMENT_ID
        console.log(`Fetching Payment details for subscription payment: ${resourceId}`);
        const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (payRes.ok) {
            const payment = await payRes.json();
            details = { status: payment.status, external_reference: payment.external_reference };
            
            if (payment.status === 'approved' && payment.external_reference) {
                // Update Profile
                // external_reference should be User ID or Purchase ID
                await resolveAndUpdateUser(supabaseAdmin, payment.external_reference, 'active', null); // null = auto 30 days
                processed = true;
            } else {
                console.log("Payment not approved or missing ref:", payment.status);
            }
        } else {
            console.error("Failed to fetch payment:", payRes.status);
        }
    }

    // --- CASE B: Preapproval (Subscription Status Change) ---
    else if (eventType === 'subscription_preapproval' || eventType === 'preapproval') {
        // resourceId is PREAPPROVAL_ID
        console.log(`Fetching Preapproval details: ${resourceId}`);
        const preRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (preRes.ok) {
            const sub = await preRes.json();
            details = { status: sub.status, payer_id: sub.payer_id };
            
            const externalRef = sub.external_reference;
            if (externalRef) {
                let status = 'expired';
                let expiresAt = new Date().toISOString();

                if (sub.status === 'authorized') {
                    status = 'active';
                    // Use next_payment_date or fallback to +30 days
                    const nextDate = sub.next_payment_date ? new Date(sub.next_payment_date) : new Date(Date.now() + 30*24*60*60*1000);
                    expiresAt = nextDate.toISOString();
                }
                
                await resolveAndUpdateUser(supabaseAdmin, externalRef, status, expiresAt);
                processed = true;
            }
        }
    }

    // --- CASE C: Standard Payment (One-off) ---
    else if (eventType === 'payment') {
        // resourceId is PAYMENT_ID
        console.log(`Fetching Payment details: ${resourceId}`);
        const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (payRes.ok) {
            const payment = await payRes.json();
            const externalRef = payment.external_reference;
            details = { status: payment.status, ref: externalRef };

            if (externalRef && payment.status === 'approved') {
                // For one-off, we might need to find the purchase first to know the duration?
                // Or we just default to 30 days if not found.
                // Assuming resolveAndUpdateUser handles purchase lookup if ref is a purchase ID.
                await resolveAndUpdateUser(supabaseAdmin, externalRef, 'active', null);
                processed = true;
            }
        }
    }

    // 4. Finalize & Record Event
    if (processed) {
        await supabaseAdmin.from('webhook_events').insert({
            provider: 'mercadopago',
            event_type: eventType,
            resource_id: resourceId,
            payload: { body, query, details },
            status: 'success'
        });
        console.log("Event processed and recorded successfully.");
    } else {
        console.log("Event ignored or failed logic (not recorded as success).");
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Webhook Fatal Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

// --- HELPER: Resolve User & Update ---
async function resolveAndUpdateUser(supabase: any, ref: string, status: string, expiresAt: string | null) {
    let userId = null;
    let planType = 'premium_monthly'; // Default

    // 1. Try as Purchase ID
    if (ref.includes('-')) { // Simple UUID check
        const { data: purchase } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', ref)
            .maybeSingle();
        
        if (purchase) {
            userId = purchase.user_id;
            if (purchase.plan === 'weekly') planType = 'premium_weekly';
            if (purchase.plan === 'yearly') planType = 'premium_yearly';
        } else {
            // 2. Try as User ID directly
            userId = ref;
        }
    } else {
        // Legacy or numeric ref? assume user ID if matches format, else ignore
        userId = ref; 
    }

    if (!userId) {
        console.warn("Could not resolve User ID from ref:", ref);
        return;
    }

    // Default expiration if null (Renew)
    if (!expiresAt) {
        // Fetch current to see if we should extend
        const { data: profile } = await supabase.from('profiles').select('subscription_expires_at').eq('id', userId).single();
        const currentExp = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : new Date();
        const now = new Date();
        const base = currentExp > now ? currentExp : now;
        
        const days = planType === 'premium_weekly' ? 7 : (planType === 'premium_yearly' ? 365 : 30);
        expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Update Profile
    const { error } = await supabase.from('profiles').update({
        subscription_status: status,
        plan_type: planType,
        subscription_expires_at: expiresAt,
        updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (error) console.error("Profile update failed:", error);
    else console.log(`Profile updated for ${userId}: ${status}, exp: ${expiresAt}`);
}
