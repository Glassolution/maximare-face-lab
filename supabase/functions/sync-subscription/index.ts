
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
       return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = user.id;

    // 1. Check purchases table for APPROVED payment
    const { data: purchases, error: purchaseError } = await supabaseClient
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);

    if (purchaseError) {
       throw purchaseError;
    }

    const lastPurchase = purchases?.[0];

    if (!lastPurchase) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Nenhuma compra aprovada encontrada.' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // 2. Calculate expiration based on plan
    let durationDays = 30; // Default monthly
    if (lastPurchase.plan === 'weekly') durationDays = 7;
    if (lastPurchase.plan === 'yearly') durationDays = 365;

    const purchaseDate = new Date(lastPurchase.created_at);
    const expiresAt = new Date(purchaseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Check if still valid
    if (expiresAt < now) {
       return new Response(JSON.stringify({ 
        success: false, 
        message: 'Sua assinatura expirou em ' + expiresAt.toLocaleDateString() 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // 3. Force Update Profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_type: lastPurchase.plan === 'weekly' ? 'premium_weekly' : lastPurchase.plan === 'yearly' ? 'premium_yearly' : 'premium_monthly',
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Assinatura sincronizada com sucesso! Recarregue a página.',
      data: { expiresAt, plan: lastPurchase.plan }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
