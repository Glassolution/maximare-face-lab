import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const INTERNAL_KEY = Deno.env.get("INTERNAL_ADMIN_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = req.headers.get("x-internal-key") || "";
    if (!INTERNAL_KEY || key !== INTERNAL_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "server_config_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({} as any));
    const userId: string = body.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "missing_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Try find existing by id or user_id
    const existing = await admin
      .from("profiles")
      .select("id, user_id, username, display_name")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    if (existing.data) {
      return new Response(JSON.stringify({ ok: true, existed: true, profile: existing.data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare minimal fields to satisfy constraints
    let base = "user";
    try {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      const emailBase =
        (u?.user?.email || "")
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 16) || "user";
      base = (u?.user?.user_metadata?.username as string) || emailBase;
    } catch {}
    const suffix = (userId || "").replace(/-/g, "").slice(0, 8) || crypto.randomUUID().slice(0, 8);
    const username = `${base}_${suffix}`.toLowerCase();
    const display_name = base;

    // Try by id then by user_id; include both columns to satisfy either schema
    const byId = await admin
      .from("profiles")
      .upsert({ id: userId, user_id: userId, username, display_name }, { onConflict: "id", ignoreDuplicates: true });
    if (byId.error) {
      try {
        await admin
          .from("profiles")
          .upsert({ id: userId, user_id: userId, username, display_name }, { onConflict: "user_id", ignoreDuplicates: true });
      } catch {}
    }
    // Fallback: insert with unique username only, then update id/user_id
    const afterTry = await admin
      .from("profiles")
      .select("id, user_id, username, display_name")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    if (!afterTry.data) {
      let ins: any = null;
      try {
        ins = await admin.from("profiles").insert([{ username, display_name }]).select("id, user_id, username").maybeSingle();
      } catch {}
      if (ins?.data) {
        try {
          await admin.from("profiles").update({ id: ins.data.id ?? undefined, user_id: userId }).eq("username", username);
        } catch {}
        try {
          await admin.from("profiles").update({ id: userId }).eq("username", username);
        } catch {}
      }
    }

    const created = await admin
      .from("profiles")
      .select("id, user_id, username, display_name")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (!created.data) {
      return new Response(JSON.stringify({ error: "failed_to_create_profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, existed: false, profile: created.data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unexpected_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
