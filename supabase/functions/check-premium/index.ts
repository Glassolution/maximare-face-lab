import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(token);
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_expires_at, plan_type")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !profile) {
      return new Response(
        JSON.stringify({
          isPremium: false,
          subscriptionStatus: "free",
          planType: "free",
          expiresAt: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const status = profile.subscription_status || "free";
    const expiresAt = profile.subscription_expires_at
      ? new Date(profile.subscription_expires_at)
      : null;
    const now = new Date();
    const isPremium =
      (status === "active" || status === "trialing") &&
      !!expiresAt &&
      expiresAt > now;

    return new Response(
      JSON.stringify({
        isPremium,
        subscriptionStatus: status,
        planType: profile.plan_type || "free",
        expiresAt: expiresAt?.toISOString() || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
