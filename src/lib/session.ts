import { supabase } from "@/integrations/supabase/client";

export async function getValidAccessToken(thresholdMs = 60000): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const now = Date.now();
  const expMs = session?.expires_at ? session.expires_at * 1000 : 0;
  if (session?.access_token && expMs - now > thresholdMs) {
    return session.access_token;
  }
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed?.access_token || null;
}
