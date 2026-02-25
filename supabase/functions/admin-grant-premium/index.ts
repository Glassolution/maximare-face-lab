
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
    const adminAuth = supabaseAdmin.auth as any;
    const { data: { users }, error: listError } = await adminAuth.admin.listUsers();
    
    if (listError) throw listError;
    
    // Simple filter in memory (assuming < 1000 users for now, else need pagination loop)
    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
        return new Response(JSON.stringify({ error: `User not found for email: ${email}` }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const userId = user.id;

    // 2. Grant Premium
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 Year

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        is_premium: true,
        premium_since: now.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
        plan_type: 'yearly',
        premium_plan_id: 'yearly',
        payment_provider: 'admin_grant',
        payment_status: 'approved',
        updated_at: now.toISOString()
      })
      .eq('id', userId);

    if (updateError) {
        throw updateError;
    }

    return new Response(JSON.stringify({ message: `Premium granted to ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
