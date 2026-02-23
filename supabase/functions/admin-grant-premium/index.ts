
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
    const { email, secret } = await req.json();

    if (secret !== 'maximare-admin-2026') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Find User ID by Email (Admin API)
    // List users returns paginated, but we can search/filter in some versions. 
    // Unfortunately listUsers doesn't filter by email directly in all versions easily without iterating.
    // But we can try generating the ID if we knew the algorithm, but we don't.
    // Let's try to query the public.profiles first if email is stored there? 
    // Profiles table usually has user_id, but maybe not email.
    // Wait, profiles table often doesn't store email to avoid duplication.
    // We must use auth.admin.listUsers()
    const adminAuth = supabaseAdmin.auth as any;

    // Note: This is expensive if there are many users, but for now it's fine.
    // A better way is strictly not available without direct DB access or `rpc`.
    
    // Attempt to find user
    let userId = null;
    
    // Pagination loop to find user
    let page = 1;
    let found = false;
    
    while (!found && page <= 10) { // Limit to 10 pages for safety
        const { data: { users }, error: listError } = await adminAuth.admin.listUsers({
            page: page,
            perPage: 1000
        });
        
        if (listError) throw listError;
        if (!users || users.length === 0) break;
        
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (user) {
            userId = user.id;
            found = true;
        }
        page++;
    }

    if (!userId) {
        return new Response(JSON.stringify({ error: `User not found for email: ${email}` }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 2. Grant Premium
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 Year

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_type: 'premium_yearly',
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
        premium_status: true, // Legacy support
        premium_until: expiresAt.toISOString() // Legacy support
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // 3. Create a fake purchase record so it looks legitimate in history
    await supabaseAdmin.from('purchases').insert({
        user_id: userId,
        provider: 'mercadopago',
        plan: 'yearly',
        amount_cents: 0,
        currency: 'BRL',
        status: 'approved',
        mp_payment_id: 'MANUAL_ADMIN_GRANT_' + now.getTime(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Premium granted to ${email} (ID: ${userId})`,
      data: { userId, expiresAt }
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
