import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    // Support both query param and body for topic/type
    let eventType = url.searchParams.get('topic') || url.searchParams.get('type');
    let resourceId = url.searchParams.get('id') || url.searchParams.get('data.id');

    const body = await req.json().catch(() => ({}));
    eventType = body.type || body.topic || eventType;
    resourceId = body.data?.id || body.id || resourceId;

    console.log('Webhook received:', { eventType, resourceId, body });

    if (!eventType || !resourceId) {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Idempotency check
    const { data: existingEvent } = await supabaseClient
      .from('webhook_events')
      .select('id')
      .eq('provider', 'mercadopago')
      .eq('event_type', eventType)
      .eq('resource_id', resourceId)
      .single();

    if (existingEvent) {
      console.log('Event already processed:', existingEvent.id);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Register event immediately to prevent race conditions
    await supabaseClient.from('webhook_events').insert({
      provider: 'mercadopago',
      event_type: eventType,
      resource_id: resourceId,
      request_id: req.headers.get('x-request-id'),
    });

    if (eventType === 'payment') {
      // Fetch payment details from Mercado Pago
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      if (!paymentRes.ok) {
        console.error('Failed to fetch payment:', await paymentRes.text());
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const payment = await paymentRes.json();
      const externalReference = payment.external_reference;
      const status = payment.status; // approved, pending, rejected, cancelled, refunded, charged_back

      console.log('Payment details:', { externalReference, status, plan: payment.metadata?.plan_type });

      if (externalReference) {
        // Fetch purchase to identify user and plan
        const { data: purchase } = await supabaseClient
          .from('purchases')
          .select('*')
          .eq('id', externalReference)
          .single();

        if (purchase) {
            // Update purchase status
            await supabaseClient
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

            if (status === 'approved') {
                subscriptionStatus = 'active';
                
                // Calculate expiration
                let durationDays = 0;
                if (purchase.plan === 'weekly') durationDays = 7;
                if (purchase.plan === 'monthly') durationDays = 30;
                if (purchase.plan === 'yearly') durationDays = 365;

                const now = new Date();
                const until = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
                expiresAt = until.toISOString();

                // Log activation
                 await supabaseClient.from('paywall_events').insert({
                    user_id: purchase.user_id,
                    event_type: 'premium_activated',
                    context: { plan: purchase.plan, method: 'mercadopago', amount: purchase.amount_cents, payment_id: resourceId }
                 });

            } else if (status === 'refunded') {
                subscriptionStatus = 'refunded';
                expiresAt = new Date().toISOString(); // Expire immediately
            } else if (status === 'charged_back') {
                subscriptionStatus = 'past_due'; // Or refunded/canceled
                expiresAt = new Date().toISOString();
            } else if (status === 'cancelled') {
                 // If it's a subscription cancellation, we might keep access until expiresAt.
                 // But for one-time payments (which MP usually is unless configured as sub), cancelled usually means voided.
                 // If this is a recurring sub cancellation event, we should check `date_of_expiration`.
                 // Assuming standard payment flow here: cancelled payment = no access.
                 subscriptionStatus = 'canceled';
                 expiresAt = new Date().toISOString();
            } else {
                // pending, rejected, etc. - do not activate
                // If previously active, we should be careful not to overwrite valid sub with pending?
                // But external_reference links to a specific purchase attempt.
                // We only update if it's a terminal state or approval.
                if (status === 'pending') {
                     // Do nothing to profile yet, or set to 'trialing' if applicable
                     // For safety, we just log and return.
                     console.log(`Payment pending for user ${purchase.user_id}`);
                     return new Response(JSON.stringify({ received: true }), { status: 200 });
                }
            }

            // Update Profile - Single Source of Truth
            // We STOP updating legacy columns to enforce migration.
            await supabaseClient
            .from('profiles')
            .update({
                subscription_status: subscriptionStatus,
                plan_type: planType,
                subscription_expires_at: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', purchase.user_id);
            
            console.log(`Profile updated for user ${purchase.user_id}: ${subscriptionStatus}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200, // Return 200 to avoid retries on logic errors if handled
    });
  }
});
