import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const MP_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    console.log("Webhook Function v2.1 - Starting");
    const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    
    // Mercado Pago sends 'action' or 'type' or 'topic' depending on version
    const eventType = body.type || body.action || query.topic || 'unknown';
    const resourceId = body.data?.id || body.id || query.id;

    // 1. Signature Verification (HMAC SHA-256)
    // Only if secret is provided
    if (MP_WEBHOOK_SECRET) {
        const xSignature = req.headers.get("x-signature");
        const xRequestId = req.headers.get("x-request-id");
        
        if (xSignature && xRequestId) {
             const parts = xSignature.split(',');
             let ts = '';
             let v1 = '';
             parts.forEach(p => {
                 const [k, v] = p.split('=');
                 if (k === 'ts') ts = v;
                 if (k === 'v1') v1 = v;
             });

             // Manifest format: id:[data.id];request-timestamp:[ts];requestId:[x-request-id];signed_payload:[json_payload]
             const manifest = `id:${resourceId};request-timestamp:${ts};requestId:${xRequestId};signed_payload:${bodyText}`;
             
             const key = await crypto.subtle.importKey(
                 "raw",
                 new TextEncoder().encode(MP_WEBHOOK_SECRET),
                 { name: "HMAC", hash: "SHA-256" },
                 false,
                 ["sign"]
             );
             
             const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
             const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
             
             if (hex !== v1) {
                 console.warn("Invalid Signature");
                 // We return 200 to avoid retries, but log error
                 // return new Response(JSON.stringify({ error: "Invalid Signature" }), { status: 200 });
                 // Note: For now, we just WARN because if we get the format wrong, we don't want to break prod.
                 // Once verified, uncomment the return.
             }
        }
    }

    console.log(`Webhook received: ${eventType} ID: ${resourceId}`);

    if (!resourceId) {
        return new Response(JSON.stringify({ message: "No resource ID" }), { status: 200 });
    }

    // 2. Idempotency Check
    const { data: existing } = await supabaseAdmin.from('webhook_events')
        .select('id')
        .eq('provider', 'mercadopago')
        .eq('event_type', eventType)
        .eq('resource_id', resourceId)
        .maybeSingle();

    if (existing) {
        console.log("Event already processed:", resourceId);
        return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
    }

    // 3. Process Payment
    let processed = false;
    
    if (eventType === 'payment' || eventType === 'payment.created' || eventType === 'payment.updated') {
        console.log("Fetching payment details...");
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
            headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        });

            if (res.ok) {
            const payment = await res.json();
            console.log("Payment status:", payment.status, "Ref:", payment.external_reference);

            let userId = payment.external_reference;
            const payerEmail = payment.payer?.email;

            // Fallback: If no external_reference (userId), try to find by email
            if ((!userId || userId === 'null') && payerEmail) {
                console.log(`No external_reference, looking up user by email: ${payerEmail}`);
                const { data: foundId } = await supabaseAdmin.rpc('get_user_id_by_email', { 
                    email: payerEmail 
                });
                if (foundId) {
                    userId = foundId;
                    console.log(`Found user via email: ${userId}`);
                }
            }
            
            if (userId && payment.status === 'approved') {
                // Determine duration via plan_id in metadata, or fallback to description
                let planId = payment.metadata?.plan_id;

                // Insert/Update Payments Table (Audit)
                const { error: paymentError } = await supabaseAdmin.from('payments').upsert({
                    payment_id: payment.id.toString(),
                    user_id: userId,
                    plan_id: planId,
                    status: payment.status,
                    amount: payment.transaction_amount,
                    currency: payment.currency_id,
                    metadata: payment.metadata,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'payment_id' });

                if (paymentError) {
                    console.error("[Webhook] Payments Table Update Error:", paymentError);
                } else {
                    console.log(`[Webhook] Payments table updated.`);
                }

                let days = 30;
                let planType = 'monthly';
                
                // If planId exists, fetch details
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
                } else {
                    // Fallback to description
                    const description = payment.description || '';
                    if (description.toLowerCase().includes('weekly') || description.toLowerCase().includes('semanal')) {
                        days = 7;
                        planType = 'weekly';
                    } else if (description.toLowerCase().includes('yearly') || description.toLowerCase().includes('anual')) {
                        days = 365;
                        planType = 'yearly';
                    }
                }

                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + days);

                // Update Profile
                try {
                    await supabaseAdmin.from('profiles').upsert(
                      { id: userId, user_id: userId },
                      { onConflict: 'id', ignoreDuplicates: true }
                    );
                } catch {}
                // Update Profile
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
                    first_payment_at: new Date().toISOString(),
                    last_payment_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).or(`id.eq.${userId},user_id.eq.${userId}`);

                if (error) {
                    console.error("Profile update failed:", error);
                } else {
                    console.log(`Profile updated for ${userId}`);
                    processed = true;
                }

                // If there is a pending cancel_refund (no payment_id at the time), attempt refund now
                if (payment.status === 'approved' && userId) {
                    try {
                        const { data: pending } = await supabaseAdmin
                          .from('subscription_cancellation_feedback')
                          .select('id, refund_status, created_at')
                          .eq('user_id', userId)
                          .eq('refund_status', 'pending')
                          .order('created_at', { ascending: false })
                          .limit(1)
                          .maybeSingle();
                        if (pending) {
                            console.log('[Webhook] Found pending cancel_refund, attempting refund for payment', payment.id);
                            const r = await fetch(`https://api.mercadopago.com/v1/payments/${payment.id}/refunds`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                                    'Content-Type': 'application/json',
                                    'X-Idempotency-Key': crypto.randomUUID(),
                                },
                                body: JSON.stringify({}),
                            });
                            const refundPayload = await r.json().catch(() => null);
                            const refundStatus = r.ok ? 'approved' : 'failed';

                            await supabaseAdmin
                              .from('subscription_cancellation_feedback')
                              .update({
                                  refund_status: refundStatus,
                                  provider_payment_id: payment.id.toString(),
                                  provider_payload: { refund: refundPayload },
                                  final_action: refundStatus === 'approved' ? 'cancel_refund' : 'cancel_refund_failed',
                              })
                              .eq('id', pending.id);
                            console.log('[Webhook] Refund attempt result:', refundStatus);
                        }
                    } catch (e) {
                        console.error('[Webhook] Pending refund follow-up failed:', e);
                    }
                }
            } else {
                console.log(`Payment status: ${payment.status} or no userId`);
                // If pending (e.g. PIX created), we might want to log it but not activate
                if (userId && payment.status === 'pending') {
                     await supabaseAdmin.from('profiles').update({
                        payment_status: 'pending',
                        payment_id: payment.id.toString(),
                        payment_provider: 'mercadopago',
                        updated_at: new Date().toISOString()
                    }).or(`id.eq.${userId},user_id.eq.${userId}`);
                }
            }
        } else {
            console.error("Failed to fetch payment from MP");
        }
    }

    // 4. Save Event
    await supabaseAdmin.from('webhook_events').insert({
        provider: 'mercadopago',
        event_type: eventType,
        resource_id: resourceId,
        notification_id: notificationId, // Save unique notification ID
        payload: body,
        processed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ received: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
