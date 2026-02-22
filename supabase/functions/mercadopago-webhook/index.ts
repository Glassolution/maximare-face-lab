
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse URL and Body for event details
    const url = new URL(req.url);
    let eventType = url.searchParams.get('topic') || url.searchParams.get('type');
    let resourceId = url.searchParams.get('id') || url.searchParams.get('data.id');

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    
    eventType = body.type || body.topic || eventType;
    resourceId = body.data?.id || body.id || resourceId;

    console.log('Webhook received:', { eventType, resourceId, body });

    if (!eventType || !resourceId) {
        return new Response(JSON.stringify({ received: true, message: 'Missing event details' }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    // 1. Idempotency Check
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('provider', 'mercadopago')
      .eq('event_type', eventType)
      .eq('resource_id', resourceId)
      .maybeSingle();

    if (existingEvent) {
      console.log('Event already processed:', existingEvent.id);
      return new Response(JSON.stringify({ received: true, message: 'Already processed' }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Register event immediately
    await supabaseAdmin.from('webhook_events').insert({
      provider: 'mercadopago',
      event_type: eventType,
      resource_id: resourceId,
      payload: body, // Store payload for audit
      request_id: req.headers.get('x-request-id'),
    });

    // 2. Process Events
    console.log('Processing event:', eventType);

    // Handle Subscriptions (Preapproval)
    if (eventType === 'subscription_preapproval' || eventType === 'preapproval') {
        const preapprovalId = resourceId;
        const preapprovalRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            },
        });

        if (!preapprovalRes.ok) {
            throw new Error(`Failed to fetch preapproval: ${preapprovalRes.statusText}`);
        }

        const preapproval = await preapprovalRes.json();
        console.log('Preapproval fetched:', preapproval.id, preapproval.status);

        const externalReference = preapproval.external_reference;
        const status = preapproval.status; // authorized, paused, cancelled
        
        // In subscriptions, external_reference usually holds user_id directly or a purchase_id
        // Let's assume it holds user_id for direct subscription linkage, OR we look up purchase
        
        // If external_reference is a UUID, it might be a purchase ID or User ID.
        // Let's try to find a purchase first.
        let userId = null;
        let planType = 'premium_monthly'; // Default fallback

        // Try to find purchase
        const { data: purchase } = await supabaseAdmin
            .from('purchases')
            .select('*')
            .eq('id', externalReference)
            .maybeSingle();

        if (purchase) {
            userId = purchase.user_id;
            // Map plan
            if (purchase.plan === 'weekly') planType = 'premium_weekly';
            else if (purchase.plan === 'yearly') planType = 'premium_yearly';
        } else {
            // Maybe external_reference is the user_id itself?
            // Verify if it's a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(externalReference)) {
                userId = externalReference;
            }
        }

        if (userId) {
            console.log('User resolved for subscription:', userId);
            
            let subscriptionStatus = 'free';
            let expiresAt = new Date().toISOString();

            if (status === 'authorized') {
                subscriptionStatus = 'active';
                // For subscriptions, we extend based on next_payment_date if available, or just set to future
                const nextPayment = preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : new Date(Date.now() + 30*24*60*60*1000);
                expiresAt = nextPayment.toISOString();
            } else {
                subscriptionStatus = 'expired'; // paused or cancelled
            }

            // Update Profile
            await supabaseAdmin.from('profiles').update({
                subscription_status: subscriptionStatus,
                plan_type: planType,
                subscription_expires_at: expiresAt,
                updated_at: new Date().toISOString()
            }).eq('id', userId);

            console.log('Premium activated/updated for subscription user:', userId);
        } else {
            console.warn('Could not resolve user for preapproval:', externalReference);
        }
    }

    // Handle One-time Payments
    else if (eventType === 'payment') {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      if (!paymentRes.ok) {
        throw new Error(`Failed to fetch payment from MP: ${paymentRes.statusText}`);
      }

      const payment = await paymentRes.json();
      const externalReference = payment.external_reference; // Should be purchase UUID
      const status = payment.status; // approved, pending, rejected, cancelled, refunded, charged_back
      
      console.log('Payment details:', { externalReference, status, plan: payment.metadata?.plan_type });

      if (externalReference) {
        // Fetch purchase to identify user and plan
        const { data: purchase, error: purchaseError } = await supabaseAdmin
          .from('purchases')
          .select('*')
          .eq('id', externalReference)
          .maybeSingle();

        if (purchaseError) console.error('Error fetching purchase:', purchaseError);

        if (purchase) {
            // Update purchase status
            await supabaseAdmin
            .from('purchases')
            .update({ 
                status: status, 
                mp_payment_id: resourceId,
                updated_at: new Date().toISOString()
            })
            .eq('id', externalReference);

            // Handle Profile Subscription Status
            let subscriptionStatus = 'expired';
            let planType = 'free';
            let expiresAt = new Date().toISOString();
            
            // Map purchase plan to profile plan_type
            if (purchase.plan === 'weekly') planType = 'premium_weekly';
            else if (purchase.plan === 'monthly') planType = 'premium_monthly';
            else if (purchase.plan === 'yearly') planType = 'premium_yearly';

            // Get Current Profile to handle renewal logic
            const { data: currentProfile } = await supabaseAdmin
                .from('profiles')
                .select('subscription_expires_at')
                .eq('id', purchase.user_id)
                .single();

            const currentExpiresAt = currentProfile?.subscription_expires_at ? new Date(currentProfile.subscription_expires_at) : new Date(0);
            const now = new Date();

            if (status === 'approved') {
                subscriptionStatus = 'active';
                
                // Calculate expiration duration
                let durationDays = 30; // Default
                if (purchase.plan === 'weekly') durationDays = 7;
                if (purchase.plan === 'monthly') durationDays = 30;
                if (purchase.plan === 'yearly') durationDays = 365;

                // Renewal Logic: If current subscription is valid, extend from current expiry. Else, extend from now.
                let baseDate = now;
                if (currentExpiresAt > now) {
                    baseDate = currentExpiresAt;
                }

                const until = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
                expiresAt = until.toISOString();

                // Log activation
                 await supabaseAdmin.from('paywall_events').insert({
                    user_id: purchase.user_id,
                    event_type: 'premium_activated',
                    context: { 
                        plan: purchase.plan, 
                        method: 'mercadopago', 
                        amount: purchase.amount_cents, 
                        payment_id: resourceId,
                        renewed_from: baseDate.toISOString()
                    }
                 });

            } else if (status === 'refunded') {
                subscriptionStatus = 'refunded';
                expiresAt = new Date().toISOString(); // Expire immediately
            } else if (status === 'charged_back') {
                subscriptionStatus = 'past_due'; 
                expiresAt = new Date().toISOString();
            } else if (status === 'cancelled') {
                 subscriptionStatus = 'cancelled';
                 expiresAt = new Date().toISOString();
            } else {
                // Pending, rejected, etc.
                console.log(`Payment status ${status} for user ${purchase.user_id} - No profile update needed.`);
                return new Response(JSON.stringify({ received: true }), { 
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Update Profile - Single Source of Truth
            // NO LEGACY COLUMNS UPDATED HERE
            const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                subscription_status: subscriptionStatus,
                plan_type: planType,
                subscription_expires_at: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', purchase.user_id);
            
            if (updateError) {
                console.error('Failed to update profile:', updateError);
                throw updateError;
            }
            
            console.log(`Profile updated for user ${purchase.user_id}: ${subscriptionStatus}`);
        } else {
            console.warn(`Purchase not found for external_reference: ${externalReference}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 to acknowledge receipt even on error, to avoid endless retries for bad logic
    });
  }
});
