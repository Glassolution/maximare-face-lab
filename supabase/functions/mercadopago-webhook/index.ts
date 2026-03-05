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
    const eventTypePre = query.topic || 'unknown';
    const actionPre = query.action || 'unknown';
    // Extract resourceId before signature check (from query or raw body text)
    let resourceIdPre = query.id || '';
    if (!resourceIdPre && bodyText) {
      const m =
        /"data"\s*:\s*\{\s*"id"\s*:\s*"([^"]+)"/.exec(bodyText) ||
        /"id"\s*:\s*"([^"]+)"/.exec(bodyText) ||
        /"id"\s*:\s*(\d+)/.exec(bodyText);
      if (m) resourceIdPre = m[1];
    }

    // CORRIGIDO: MERCADOPAGO_WEBHOOK_SECRET é obrigatório
    if (!MP_WEBHOOK_SECRET) {
      console.error("[SECURITY ERROR] MP_WEBHOOK_SECRET não configurado. Webhook rejeitando todas as requisições.");
      return new Response(
        JSON.stringify({ error: "Configuração de segurança incompleta: MP_WEBHOOK_SECRET não configurado" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // CORRIGIDO: Validar assinatura HMAC em cada webhook
    console.log("[Webhook] Validando assinatura HMAC...");
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");
    
    // CORRIGIDO: Headers de assinatura são obrigatórios
    if (!xSignature || !xRequestId) {
      console.warn("[SECURITY] Tentativa de webhook sem headers de assinatura");
      return new Response(
        JSON.stringify({ error: "missing_signature_headers", message: "x-signature e x-request-id são obrigatórios" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse da assinatura
    const parts = xSignature.split(',');
    let ts = '';
    let v1 = '';
    parts.forEach(p => {
      const [k, v] = p.split('=');
      if (k === 'ts') ts = v;
      if (k === 'v1') v1 = v;
    });
    
    if (!ts || !v1) {
      console.warn("[SECURITY] Formato de assinatura inválido");
      return new Response(
        JSON.stringify({ error: "invalid_signature_format" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar HMAC-SHA256
    const manifest = `id:${resourceIdPre};request-timestamp:${ts};requestId:${xRequestId};signed_payload:${bodyText}`;
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
      // CORRIGIDO: Logar tentativa de assinatura inválida
      console.error("[SECURITY] Assinatura HMAC inválida!");
      console.error("[SECURITY] Esperado:", v1);
      console.error("[SECURITY] Calculado:", hex);
      console.error("[SECURITY] Manifest:", manifest);
      console.error("[SECURITY] IP:", req.headers.get('x-forwarded-for') || 'unknown');
      
      return new Response(
        JSON.stringify({ error: "invalid_signature", message: "Assinatura do webhook inválida" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("[Webhook] Assinatura HMAC validada com sucesso");

    // CORRIGIDO: Usar INSERT com ON CONFLICT para garantir idempotência sem race condition
    console.log("[Webhook] Verificando idempotência do evento...");
    const notificationId = body?.id?.toString() ?? req.headers.get('x-request-id') ?? `${eventTypePre}_${resourceIdPre}_${Date.now()}`;
    
    const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('webhook_events')
        .insert({
            provider: 'mercadopago',
            event_type: eventTypePre,
            resource_id: resourceIdPre,
            notification_id: notificationId,
            payload: eventPayload,
            processed_at: null  // Será atualizado após processamento
        })
        .select()
        .maybeSingle();
    
    // Se erro de duplicata, evento já foi processado
    if (insertError) {
        if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
            console.log("[Webhook] Evento já processado anteriormente:", resourceIdPre);
            return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }
        // Outro erro - logar mas continuar (não bloquear por falha na auditoria)
        console.error("[Webhook] Erro ao registrar evento (não crítico):", insertError);
    } else {
        console.log("[Webhook] Evento registrado para processamento:", insertResult?.id);
    }

    const body = bodyText ? JSON.parse(bodyText) : {};
    const eventType = body.type || body.action || query.topic || 'unknown';
    const resourceId = body.data?.id || body.id || query.id;
    const action = body.action || query.action || 'unknown';
    
    // CORRIGIDO: Atualizar payload no insert se body mudou após parse
    const eventPayload = bodyText ? JSON.parse(bodyText) : {};

    console.log(`Webhook received: ${eventType} ID: ${resourceId}`);

    if (!resourceId) {
        return new Response(JSON.stringify({ message: "No resource ID" }), { status: 200 });
    }

    let processed = false;
    
    if (eventType === 'payment' || eventType === 'payment.created' || eventType === 'payment.updated') {
        console.log("[Webhook] Fetching payment details...");
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
            headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        });

            if (res.ok) {
            const payment = await res.json();
            console.log("[Webhook] Payment status:", payment.status, "Ref:", payment.external_reference, "ID:", payment.id);

            // CORRIGIDO: Garantir que external_reference é usado como user_id
            let userId = payment.external_reference;
            const payerEmail = payment.payer?.email;
            
            console.log("[Webhook] userId from external_reference:", userId);

            // Fallback: If no external_reference (userId), try to find by email
            if ((!userId || userId === 'null' || userId === 'undefined') && payerEmail) {
                console.log(`[Webhook] No external_reference, looking up user by email: ${payerEmail}`);
                const { data: foundId } = await supabaseAdmin.rpc('get_user_id_by_email', { 
                    email_input: payerEmail 
                });
                if (foundId) {
                    userId = foundId;
                    console.log(`[Webhook] Found user via email: ${userId}`);
                }
            }
            
            // CORRIGIDO: Validar userId antes de prosseguir
            if (!userId || userId === 'null' || userId === 'undefined') {
                console.error("[Webhook] ERRO: Não foi possível identificar o usuário. external_reference:", payment.external_reference);
                return new Response(JSON.stringify({ error: "User identification failed" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            
            if (payment.status === 'approved') {
                console.log("[Webhook] Pagamento aprovado. Iniciando ativação para userId:", userId);
                
                // Determine duration via plan_id in metadata, or fallback to description
                const planId = payment.metadata?.plan_id;
                console.log("[Webhook] planId from metadata:", planId);

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
                        console.log("[Webhook] Plano encontrado:", planData.name, "- Intervalo:", planType, "- Dias:", days);
                    } else {
                        console.warn("[Webhook] Plano não encontrado no banco:", planId);
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
                    console.log("[Webhook] Plano determinado pela descrição:", planType, "- Dias:", days);
                }

                // CORRIGIDO: Activation via centralized RPC com logs detalhados
                console.log("[Webhook] Ativando premium via RPC para userId:", userId);
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
                  console.error("[Webhook] Falha ao ativar assinatura via RPC:", actError);
                  
                  // CORRIGIDO: Fallback - tentar update direto na tabela profiles
                  console.log("[Webhook] Tentando fallback: update direto na tabela profiles...");
                  const expiresAt = new Date();
                  expiresAt.setDate(expiresAt.getDate() + days);
                  
                  const { error: fallbackError } = await supabaseAdmin.from('profiles').update({
                      subscription_status: 'active',
                      is_premium: true,
                      premium_since: new Date().toISOString(),
                      subscription_expires_at: expiresAt.toISOString(),
                      plan_type: planType,
                      premium_plan_id: planId,
                      payment_provider: 'mercadopago',
                      payment_id: payment.id.toString(),
                      payment_status: 'approved',
                      updated_at: new Date().toISOString()
                  }).or(`id.eq.${userId},user_id.eq.${userId}`);
                  
                  if (fallbackError) {
                      console.error("[Webhook] Fallback também falhou:", fallbackError);
                      return new Response(
                        JSON.stringify({ error: 'Falha ao ativar assinatura via RPC e fallback' }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                      );
                  }
                  
                  console.log("[Webhook] Fallback executado com sucesso!");
                  processed = true;
                } else {
                  console.log(`[Webhook] Premium ativado com sucesso para ${userId}`, activation);
                  processed = true;
                }
                
                // CORRIGIDO: Verificar se is_premium foi realmente salvo
                const { data: profileCheck, error: checkError } = await supabaseAdmin
                    .from('profiles')
                    .select('is_premium, subscription_status, plan_type')
                    .or(`id.eq.${userId},user_id.eq.${userId}`)
                    .maybeSingle();
                
                if (checkError) {
                    console.error("[Webhook] Erro ao verificar profile:", checkError);
                } else if (profileCheck) {
                    console.log("[Webhook] Verificação do profile:", {
                        is_premium: profileCheck.is_premium,
                        subscription_status: profileCheck.subscription_status,
                        plan_type: profileCheck.plan_type
                    });
                    
                    if (!profileCheck.is_premium) {
                        console.warn("[Webhook] ALERTA: is_premium está false após ativação!");
                    }
                } else {
                    console.warn("[Webhook] ALERTA: Profile não encontrado após ativação!");
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

                            // Após estorno bem-sucedido — desativa premium
                            if (refundStatus === 'approved') {
                              await supabaseAdmin
                                .from('profiles')
                                .update({
                                  is_premium: false,
                                  subscription_status: 'canceled',
                                  plan_type: 'free',
                                  updated_at: new Date().toISOString(),
                                })
                                .or(`id.eq.${userId},user_id.eq.${userId}`);
                              console.log('[Webhook] Premium desativado após estorno para', userId);
                            }
                        }
                    } catch (e) {
                        console.error('[Webhook] Pending refund follow-up failed:', e);
                    }
                }
            } else {
                console.log(`Payment status: ${payment.status} or no userId`);
                
                // TRATAMENTO DE REFUND/CANCELAMENTO
                // Quando o pagamento é reembolsado ou cancelado, desativar premium
                if (userId && (payment.status === 'refunded' || payment.status === 'cancelled' || payment.status === 'rejected')) {
                    console.log(`[Webhook] Payment ${payment.status} - Deactivating premium for user ${userId}`);
                    
                    // Atualizar payments table
                    await supabaseAdmin.from('payments').upsert({
                        payment_id: payment.id.toString(),
                        user_id: userId,
                        status: payment.status,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'payment_id' });
                    
                    // Desativar premium no perfil
                    await supabaseAdmin.from('profiles').update({
                        is_premium: false,
                        subscription_status: 'refunded',
                        plan_type: 'free',
                        payment_status: payment.status,
                        subscription_expires_at: null,
                        updated_at: new Date().toISOString()
                    }).or(`id.eq.${userId},user_id.eq.${userId}`);
                    
                    console.log(`[Webhook] Premium deactivated for ${userId} due to ${payment.status}`);
                    processed = true;
                }
                // Fim do tratamento de refund
                
                // If pending (e.g. PIX created), we might want to log it but not activate
                else if (userId && payment.status === 'pending') {
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
    else if (
      eventType === 'preapproval.updated' ||
      (eventType === 'subscription_preapproval' && action === 'updated') ||
      eventType === 'subscription_authorized_payment'
    ) {
      if (resourceId) {
        const res = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        });
        if (res.ok) {
          const pre = await res.json();
          const st = (pre?.status || '').toString().toLowerCase();
          if (st === 'cancelled' || st === 'paused' || st === 'ended') {
            let userId = pre?.external_reference || null;
            const payerEmail = pre?.payer_email || pre?.payer?.email || null;
            if ((!userId || userId === 'null') && payerEmail) {
              const { data: foundId } = await supabaseAdmin.rpc('get_user_id_by_email', { email_input: payerEmail });
              if (foundId) userId = foundId;
            }
            if (userId) {
              await supabaseAdmin.from('profiles').update({
                plan_type: 'free',
                subscription_status: 'canceled',
                subscription_expires_at: null,
                is_premium: false,
                updated_at: new Date().toISOString()
              }).or(`id.eq.${userId},user_id.eq.${userId}`);
              processed = true;
            }
          }
        }
      }
    }

    // CORRIGIDO: Atualizar o evento registrado com processed_at e resultado
    if (insertResult?.id) {
        await supabaseAdmin
            .from('webhook_events')
            .update({
                processed_at: new Date().toISOString(),
                payload: {
                    ...eventPayload,
                    _processing_result: { processed, timestamp: new Date().toISOString() }
                }
            })
            .eq('id', insertResult.id);
    }

    console.log("[Webhook] Processamento concluído. Processed:", processed);
    return new Response(JSON.stringify({ received: true, processed }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
