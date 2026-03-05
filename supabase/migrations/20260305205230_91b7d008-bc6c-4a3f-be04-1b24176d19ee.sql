
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id uuid,
  username text,
  email text,
  display_name text,
  avatar_url text,
  is_premium boolean,
  plan_type text,
  subscription_status text,
  subscription_expires_at timestamptz,
  is_ugc boolean,
  banned boolean,
  banned_reason text,
  banned_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    COALESCE(au.email, '') AS email,
    p.display_name,
    p.avatar_url,
    COALESCE(p.is_premium, false) AS is_premium,
    p.plan_type,
    p.subscription_status,
    p.subscription_expires_at,
    false AS is_ugc,
    false AS banned,
    NULL::text AS banned_reason,
    NULL::timestamptz AS banned_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_purchases()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  email text,
  plan text,
  amount_cents integer,
  provider text,
  payment_method text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pu.id,
    pu.user_id,
    COALESCE(pr.username, '') AS username,
    COALESCE(au.email, '') AS email,
    pu.plan,
    pu.amount_cents,
    pu.provider,
    pu.provider::text AS payment_method,
    pu.status,
    pu.created_at
  FROM public.purchases pu
  LEFT JOIN public.profiles pr ON pr.user_id = pu.user_id
  LEFT JOIN auth.users au ON au.id = pu.user_id
  ORDER BY pu.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_premium(target_user_id uuid, plan text DEFAULT 'monthly')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  freq int;
  exp_date timestamptz;
BEGIN
  freq := CASE plan WHEN 'yearly' THEN 12 WHEN 'annual' THEN 12 ELSE 1 END;
  exp_date := now() + (freq || ' months')::interval;
  UPDATE public.profiles SET
    is_premium = true,
    plan_type = plan,
    subscription_status = 'active',
    premium_since = now(),
    subscription_expires_at = exp_date,
    payment_provider = 'admin_grant'
  WHERE profiles.user_id = target_user_id;
  SELECT jsonb_build_object(
    'is_premium', p.is_premium,
    'plan_type', p.plan_type,
    'subscription_status', p.subscription_status,
    'subscription_expires_at', p.subscription_expires_at
  ) INTO result
  FROM public.profiles p WHERE p.user_id = target_user_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_ugc(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('is_ugc', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_ugc(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('is_ugc', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.ban_user(target_user_id uuid, reason text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('banned', true, 'banned_reason', reason, 'banned_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.unban_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('banned', false, 'banned_reason', null, 'banned_at', null);
END;
$$;
