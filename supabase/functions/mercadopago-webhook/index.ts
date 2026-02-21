
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const eventType = url.searchParams.get('topic') || url.searchParams.get('type');
    const resourceId = url.searchParams.get('id') || url.searchParams.get('data.id');

    // Mercado Pago sends events in query params or body depending on version.
    // We'll check body too.
    const body = await req.json().catch(() => ({}));
    const finalEventType = body.type || body.topic || eventType;
    const finalResourceId = body.data?.id || body.id || resourceId;

    console.log('Webhook received:', { finalEventType, finalResourceId, body });

    if (!finalEventType || !finalResourceId) {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Idempotency check
    const { data: existingEvent } = await supabaseClient
      .from('webhook_events')
      .select('id')
      .eq('provider', 'mercadopago')
      .eq('event_type', finalEventType)
      .eq('resource_id', finalResourceId)
      .single();

    if (existingEvent) {
      console.log('Event already processed:', existingEvent.id);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Register event
    await supabaseClient.from('webhook_events').insert({
      provider: 'mercadopago',
      event_type: finalEventType,
      resource_id: finalResourceId,
      request_id: req.headers.get('x-request-id'),
    });

    if (finalEventType === 'payment') {
      // Fetch payment details
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${finalResourceId}`, {
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
      const status = payment.status;

      console.log('Payment details:', { externalReference, status });

      if (externalReference) {
        // Update purchase
        const { data: purchase } = await supabaseClient
          .from('purchases')
          .update({ 
            status: status, 
            mp_payment_id: finalResourceId 
          })
          .eq('id', externalReference)
          .select()
          .single();

        if (purchase && status === 'approved') {
          // Activate premium
          let durationDays = 0;
          if (purchase.plan === 'weekly') durationDays = 7;
          if (purchase.plan === 'monthly') durationDays = 30;
          if (purchase.plan === 'yearly') durationDays = 365;

          const now = new Date();
          const until = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

          await supabaseClient
            .from('profiles')
            .update({
              premium_status: 'premium',
              premium_plan: purchase.plan,
              premium_since: now.toISOString(),
              premium_until: until.toISOString(),
            })
            .eq('id', purchase.user_id);
            
          console.log(`Premium activated for user ${purchase.user_id}`);
        } else if (purchase && (status === 'refunded' || status === 'charged_back')) {
           // Revoke premium
           await supabaseClient
            .from('profiles')
            .update({
              premium_status: 'free',
              premium_plan: null,
              premium_until: new Date().toISOString(), // Expire immediately
            })
            .eq('id', purchase.user_id);
            console.log(`Premium revoked for user ${purchase.user_id}`);
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
      status: 200, // Return 200 to avoid retries on logic errors
    });
  }
});
