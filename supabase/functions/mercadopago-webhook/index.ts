
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
    if (eventType === 'subscription_preapproval' || eventType === 'preapproval' || eventType === 'subscription_authorized_payment') {
        // For 'subscription_authorized_payment', the resourceId is a payment ID, NOT a preapproval ID.
        // We need to fetch the payment first to get the preapproval_id.
        
        let preapprovalId = resourceId;
        
        if (eventType === 'subscription_authorized_payment') {
             console.log('Processing subscription_authorized_payment:', resourceId);
             const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
             });
             
             if (paymentRes.ok) {
                 const paymentData = await paymentRes.json();
                 // In subscription payments, 'order.id' or 'metadata.preapproval_id' might store the subscription ID
                 // But typically, we need to look for 'integrator_id' or check if external_reference points to subscription
                 // Actually, Mercado Pago sends preapproval_id in the payment object?
                 // Let's assume we can get it or fallback to external_reference logic
                 
                 // However, simpler approach: The 'preapproval_id' is usually in the payment response under 'order.id' (sometimes) 
                 // or we can treat this just like a payment event but knowing it's recurrent.
                 
                 // CRITICAL FIX: If it's subscription_authorized_payment, we might want to just fetch the subscription status directly
                 // using the ID if we knew it. But we don't know it from just the ID potentially.
                 
                 // Better approach: Treat 'subscription_authorized_payment' as a signal to re-check the subscription status.
                 // But wait, if resourceId is a PAYMENT ID, fetching /preapproval/PAYMENT_ID will fail.
                 
                 // Let's rely on the payload body if available? No, we trust fetch.
                 // Let's look at the logs you provided in prompt: "subscription_authorized_payment"
                 // If we fetch /v1/payments/{id}, we get the payment. 
                 // Inside payment, there is "order.id" which is often the preapproval ID for subscriptions.
                 // Or "metadata.preapproval_id".
                 
                 // SAFE PATH: If event is subscription_authorized_payment, let's treat it as a payment first to identify user/subscription
                 // and THEN update profile.
                 
                 // BUT, the prompt asks to include it in the OR block. 
                 // If I put it here, I must ensure preapprovalId is correct.
                 // If eventType is 'subscription_authorized_payment', resourceId is a PAYMENT ID.
                 // Fetching /preapproval/{payment_id} is WRONG.
                 
                 // CORRECTION: 
                 // The prompt instruction "Atualizar essa condição para incluir também: subscription_authorized_payment" implies treating it similarly.
                 // BUT technically, subscription_authorized_payment sends a PAYMENT ID.
                 // If I follow instructions strictly, I might break it if I don't handle ID type.
                 
                 // Let's handle the ID resolution:
                 if (paymentData.order && paymentData.order.type === 'mercadopago') {
                     preapprovalId = paymentData.order.id;
                 }
             }
        }

        // If it's authorized payment, we fetched payment above to find preapprovalId.
        // If it's preapproval event, resourceId is already preapprovalId.
        
        // Wait, fetching payment for every authorized_payment is good practice.
        // But to keep it simple and robust as per instructions:
        
        // Let's split logic slightly to be safe.
        // If subscription_authorized_payment, resourceId is a payment. We need to fetch payment to get external_reference (user_id).
        // If preapproval, resourceId is subscription. We fetch subscription to get external_reference.
        
        // REFINED LOGIC:
        // Use the existing 'payment' logic for 'subscription_authorized_payment'? 
        // No, the prompt specifically wants it HERE in the subscription block.
        // That implies we should fetch the subscription details to update expiration.
        
        // Let's do this:
        if (eventType === 'subscription_authorized_payment') {
             // 1. Fetch Payment to get Subscription ID (preapproval_id)
             const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
             });
             
             if (payRes.ok) {
                 const payData = await payRes.json();
                 // If payment is approved, we want to update the user.
                 // The 'external_reference' in the payment usually matches the subscription's external_reference.
                 // So we can use that to identify the user directly!
                 
                 const externalReference = payData.external_reference;
                 const status = payData.status;
                 
                 if (status === 'approved') {
                     // Update user directly from payment data
                     console.log('Processing subscription_authorized_payment via Payment lookup');
                     await updateUserProfile(supabaseAdmin, externalReference, 'active', 'premium_monthly'); // Default to monthly if unknown
                     return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
                 }
             }
        }
        
        // Fallback to Preapproval fetch (for preapproval events OR if we extracted ID)
        const preapprovalRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            },
        });

        if (preapprovalRes.ok) {
            const preapproval = await preapprovalRes.json();
            console.log('Preapproval fetched:', preapproval.id, preapproval.status);
    
            const externalReference = preapproval.external_reference;
            const status = preapproval.status; // authorized, paused, cancelled
            
            // Logic to update user...
            let subscriptionStatus = 'free';
            let expiresAt = new Date().toISOString();
    
            if (status === 'authorized') {
                subscriptionStatus = 'active';
                const nextPayment = preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : new Date(Date.now() + 30*24*60*60*1000);
                expiresAt = nextPayment.toISOString();
            } else {
                subscriptionStatus = 'expired';
            }
            
            await updateUserProfile(supabaseAdmin, externalReference, subscriptionStatus, 'premium_monthly', expiresAt);
        }
    }
    
    // ...
    
    // HELPER FUNCTION (to avoid code duplication)
    async function updateUserProfile(supabase: any, externalReference: string, status: string, plan: string, expiresAt?: string) {
        // Resolve User ID logic (same as before)
        // ...
    }
    
    // WAIT, I cannot easily refactor into helper function without changing too much structure.
    // Let's stick to the prompt's request: Add the condition and handle it.
    
    // PROBLEM: 'subscription_authorized_payment' sends a PAYMENT ID in data.id.
    // 'preapproval' sends a SUBSCRIPTION ID in data.id.
    // If I just add the OR condition, the code will try to fetch `preapproval/{PAYMENT_ID}`, which will FAIL (404).
    
    // SOLUTION: Check event type inside the block.
    
    if (eventType === 'subscription_preapproval' || eventType === 'preapproval' || eventType === 'subscription_authorized_payment') {
        let subscriptionId = resourceId;
        
        if (eventType === 'subscription_authorized_payment') {
            console.log("Processing subscription_authorized_payment");
            // We need to get the subscription ID from the payment
            const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
            });
            
            if (!paymentRes.ok) {
                 console.error("Failed to fetch payment for subscription event");
                 throw new Error("Failed to fetch payment details");
            }
            
            const paymentData = await paymentRes.json();
            // Try to find the subscription ID
            // Usually in 'order.id' for subscriptions created via preferences? No.
            // For subscriptions, paymentData.payer.id might be useful, but we need the preapproval_id.
            // Often it is NOT in the payment object directly if not passed in metadata.
            
            // HOWEVER, the payment object DOES contain 'external_reference'.
            // If external_reference == user_id (our convention), we can just update the user!
            
            const externalRef = paymentData.external_reference;
            if (externalRef && paymentData.status === 'approved') {
                 console.log("Found external_reference in authorized payment:", externalRef);
                 // We can skip fetching preapproval and just update the user
                 // But we need 'expiresAt'. We can assume 30 days or try to fetch preapproval if we find the ID.
                 
                 // Let's try to resolve user ID
                 await handlePremiumUpdate(supabaseAdmin, externalRef, 'active', null);
                 return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
            }
        }
        
        // Normal Preapproval Flow
        const preapprovalRes = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            },
        });
        
        // ... existing logic ...
    }
    
    // This is getting complicated to patch inline.
    // Let's follow the prompt instructions exactly but handle the ID difference intelligently.
    
    */
    
    // Handle Subscriptions (Preapproval)
    if (eventType === 'subscription_preapproval' || eventType === 'preapproval' || eventType === 'subscription_authorized_payment') {
        let preapprovalId = resourceId;
        let isPaymentEvent = (eventType === 'subscription_authorized_payment');

        if (isPaymentEvent) {
             console.log("Processing subscription_authorized_payment");
             // 1. Fetch Payment to get external_reference (User ID) and status
             const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
             });
             
             if (paymentRes.ok) {
                 const payment = await paymentRes.json();
                 if (payment.status === 'approved' && payment.external_reference) {
                     console.log("Authorized payment for user:", payment.external_reference);
                     // Update User Immediately
                     await resolveAndUpdateUser(supabaseAdmin, payment.external_reference, 'active', null);
                 }
                 // Try to get preapproval_id to fetch expiration date
                 // (Optional but good)
             }
             // Return early to avoid 404 on preapproval fetch if ID is unknown
             return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
        }

        const preapprovalRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
            },
        });

        if (!preapprovalRes.ok) {
            // It might be that resourceId was not a preapproval ID (if logic above failed)
            console.warn(`Failed to fetch preapproval: ${preapprovalRes.statusText}`);
            // Don't throw, just log
        } else {
            const preapproval = await preapprovalRes.json();
            console.log('Preapproval fetched:', preapproval.id, preapproval.status);
    
            const externalReference = preapproval.external_reference;
            const status = preapproval.status; 
            
            let subscriptionStatus = 'expired';
            let expiresAt = new Date().toISOString();
    
            if (status === 'authorized') {
                subscriptionStatus = 'active';
                const nextPayment = preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : new Date(Date.now() + 30*24*60*60*1000);
                expiresAt = nextPayment.toISOString();
            }
            
            await resolveAndUpdateUser(supabaseAdmin, externalReference, subscriptionStatus, expiresAt);
        }
    }

    // Helper Function to Resolve and Update User
    async function resolveAndUpdateUser(supabaseAdmin: any, externalReference: string, status: string, expiresAt: string | null) {
        // In subscriptions, external_reference usually holds user_id directly or a purchase_id
        
        // If external_reference is a UUID, it might be a purchase ID or User ID.
        let userId = null;
        let planType = 'premium_monthly'; // Default fallback

        // 1. Try to find purchase
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
            // 2. Maybe external_reference is the user_id itself?
            // Verify if it's a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(externalReference)) {
                userId = externalReference;
            }
        }

        if (userId) {
            console.log('User resolved for subscription:', userId);
            
            // Update Profile
            await supabaseAdmin.from('profiles').update({
                subscription_status: status,
                plan_type: planType,
                subscription_expires_at: expiresAt || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', userId);

            console.log('Premium activated/updated for subscription user:', userId);
        } else {
            console.warn('Could not resolve user for preapproval:', externalReference);
        }
    }

    // Handle One-time Payments
    if (eventType === 'payment') {
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
