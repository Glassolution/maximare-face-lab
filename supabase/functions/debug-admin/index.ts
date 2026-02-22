import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");
    if (!ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "ADMIN_SECRET not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedSecret = req.headers.get("x-admin-secret");
    if (providedSecret !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, user_id, plan_type, duration_days } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "activate") {
      const days = duration_days || 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          plan_type: plan_type || "premium_monthly",
          subscription_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, action: "activate", user_id, expires_at: expiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "deactivate") {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "canceled",
          plan_type: "free",
          subscription_expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, action: "deactivate", user_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "status") {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_expires_at, plan_type")
        .eq("user_id", user_id)
        .maybeSingle();

      if (error) throw error;

      const now = new Date();
      const expiresAt = data?.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
      const isPremium =
        (data?.subscription_status === "active" || data?.subscription_status === "trialing") &&
        !!expiresAt &&
        expiresAt > now;

      return new Response(
        JSON.stringify({ ...data, isPremium, now: now.toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: activate, deactivate, status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
