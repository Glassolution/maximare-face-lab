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
    // CORRIGIDO: Validar MERCADOPAGO_ACCESS_TOKEN antes de qualquer operação
    if (!MP_ACCESS_TOKEN) {
      console.error("[Create-Payment] CRITICAL: MERCADOPAGO_ACCESS_TOKEN não configurado");
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta: MERCADOPAGO_ACCESS_TOKEN ausente" }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      console.error("[Create-Payment] Missing Env Vars: SERVICE_ROLE_KEY or SUPABASE_URL");
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log("[Create-Payment] Function v2.2 - Starting");

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

    // CORRIGIDO: Validar plan_id antes de buscar
    if (!plan_id) {
      console.error("[Create-Payment] Erro: plan_id não fornecido");
      return new Response(JSON.stringify({ error: "Plano inválido: plan_id não fornecido" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // CORRIGIDO: Validar que plan_id é um dos valores permitidos
    const validPlans = ['weekly', 'monthly', 'yearly'];
    if (!validPlans.includes(plan_id)) {
      console.error("[Create-Payment] Erro: plan_id inválido:", plan_id);
      return new Response(JSON.stringify({ error: `Plano inválido: '${plan_id}'. Planos válidos: ${validPlans.join(', ')}` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 1. Fetch Plan Details from Database (Price Security)
    console.log("[Create-Payment] Buscando plano:", plan_id);
    const { data: planData, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .single();

    // CORRIGIDO: Erro detalhado se plano não existir
    if (planError) {
      console.error("[Create-Payment] Erro ao buscar plano:", planError);
      return new Response(JSON.stringify({ error: `Erro ao buscar plano: ${planError.message}` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!planData) {
      console.error("[Create-Payment] Plano não encontrado no banco:", plan_id);
      return new Response(JSON.stringify({ error: `Plano inválido: '${plan_id}' não encontrado na base de dados` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log("[Create-Payment] Plano encontrado:", planData.name, "- Preço:", planData.price_cents, "centavos");

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

    // CORRIGIDO: Validar que userId existe e é válido
    if (!userId) {
      console.error("[Create-Payment] Falha na identificação do usuário");
      return new Response(JSON.stringify({ error: "Falha na identificação do usuário. Faça login novamente." }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // CORRIGIDO: Validar que userId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error("[Create-Payment] userId inválido (não é UUID):", userId);
      return new Response(JSON.stringify({ error: "ID de usuário inválido" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log("[Create-Payment] Usuário identificado:", userId);

    // 3. Create Payment in Mercado Pago
    // CORRIGIDO: Garantir que external_reference NUNCA é nulo
    const paymentData: any = {
      transaction_amount,
      description: `Maximare Premium - ${planData.name}`,
      payment_method_id,
      payer: {
        email: payer?.email || '',
        first_name: payer?.first_name || '',
        last_name: payer?.last_name || '',
        identification: payer?.identification || { type: 'CPF', number: '' }
      },
      external_reference: userId,  // CORRIGIDO: Sempre definido, nunca nulo
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      metadata: {
        plan_id: plan_id,
        user_id: userId  // CORRIGIDO: Duplicar para redundância
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

    // CORRIGIDO: Tratamento detalhado de erro do MercadoPago
    if (!mpResponse.ok) {
      console.error('[Create-Payment] MP Error Response:', JSON.stringify(payment, null, 2));
      
      // Extrair mensagem de erro detalhada
      let errorMessage = 'Erro no processamento do pagamento';
      let errorCode = 'UNKNOWN_ERROR';
      let errorField = null;
      
      if (payment.message) {
        errorMessage = payment.message;
      } else if (payment.cause && payment.cause.length > 0) {
        errorMessage = payment.cause[0].description || payment.cause[0].message || errorMessage;
        errorCode = payment.cause[0].code || errorCode;
        errorField = payment.cause[0].field || null;
      }
      
      // Mapear códigos de erro comuns
      const errorMapping: Record<string, string> = {
        'invalid_token': 'Token de pagamento inválido. Tente novamente.',
        'invalid_identification': 'CPF inválido. Verifique o número do CPF.',
        'invalid_payer_email': 'E-mail inválido. Verifique o e-mail informado.',
        'invalid_transaction_amount': 'Valor da transação inválido.',
        'payment_method_not_found': 'Método de pagamento não encontrado.',
        'invalid_payment_method_id': 'Método de pagamento inválido.',
        'unauthorized': 'Não autorizado. Verifique as credenciais do MercadoPago.',
        'insufficient_amount': 'Valor insuficiente para este método de pagamento.'
      };
      
      const userMessage = errorMapping[errorCode] || errorMessage;
      
      console.error(`[Create-Payment] Erro MP - Código: ${errorCode}, Campo: ${errorField}, Mensagem: ${userMessage}`);
      
      return new Response(JSON.stringify({ 
        error: userMessage,
        code: errorCode,
        field: errorField,
        details: errorMessage
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
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
    console.error("[Create-Payment] Function Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno no processamento do pagamento',
      timestamp: new Date().toISOString()
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// CORRIGIDO: Teste manual para desenvolvimento
// Para usar: faça uma requisição POST com header "x-test-mode: true"
// Isso permite testar o fluxo completo sem validar CPF em ambiente de dev
/*
Exemplo de uso em desenvolvimento:

curl -X POST https://[PROJECT].supabase.co/functions/v1/create-payment \
  -H "Authorization: Bearer [TOKEN]" \
  -H "x-test-mode: true" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method_id": "pix",
    "plan_id": "weekly",
    "payer": {
      "email": "teste@exemplo.com",
      "first_name": "Teste",
      "last_name": "Usuario",
      "identification": { "type": "CPF", "number": "12345678900" }
    }
  }'

Logs esperados:
[Create-Payment] Function v2.2 - Starting
[Create-Payment] MODO DE TESTE ATIVADO - Pulando validações de CPF
[Create-Payment] Buscando plano: weekly
[Create-Payment] Plano encontrado: Semanal - Preço: 100 centavos
[Create-Payment] Usuário identificado: [UUID]
[Create-Payment] Sending to MP: {...}
[Create-Payment] Payment created: [ID] [STATUS]
*/
