
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const createSupabaseClient = (req: Request) => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );
};

export const createAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

export const requirePremium = async (userId: string) => {
  const supabase = createAdminClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_expires_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const status = profile.subscription_status;
  const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
  const now = new Date();

  const isActive = (status === 'active' || status === 'trialing');
  const notExpired = expiresAt && expiresAt > now;

  if (!isActive || !notExpired) {
    throw new Error('Premium subscription required');
  }

  return true;
};
