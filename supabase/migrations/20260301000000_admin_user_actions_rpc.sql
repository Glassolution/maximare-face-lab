ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ugc_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_reason text,
ADD COLUMN IF NOT EXISTS banned_at timestamptz,
ADD COLUMN IF NOT EXISTS premium_plan text,
ADD COLUMN IF NOT EXISTS premium_until timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_actions" ON public.admin_actions;
CREATE POLICY "Admins can view admin_actions"
ON public.admin_actions
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

CREATE OR REPLACE FUNCTION public.sync_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.premium_plan := COALESCE(NEW.premium_plan, NEW.plan_type);
    NEW.plan_type := COALESCE(NEW.plan_type, NEW.premium_plan);
    NEW.premium_until := COALESCE(NEW.premium_until, NEW.subscription_expires_at);
    NEW.subscription_expires_at := COALESCE(NEW.subscription_expires_at, NEW.premium_until);
    NEW.ugc_enabled := COALESCE(NEW.ugc_enabled, NEW.is_ugc);
    NEW.is_ugc := COALESCE(NEW.is_ugc, NEW.ugc_enabled);
    NEW.is_banned := COALESCE(NEW.is_banned, NEW.banned);
    NEW.banned := COALESCE(NEW.banned, NEW.is_banned);
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    RETURN NEW;
  END IF;

  IF NEW.premium_plan IS DISTINCT FROM OLD.premium_plan THEN
    NEW.plan_type := NEW.premium_plan;
  ELSIF NEW.plan_type IS DISTINCT FROM OLD.plan_type THEN
    NEW.premium_plan := NEW.plan_type;
  END IF;

  IF NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN
    NEW.subscription_expires_at := NEW.premium_until;
  ELSIF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
    NEW.premium_until := NEW.subscription_expires_at;
  END IF;

  IF NEW.ugc_enabled IS DISTINCT FROM OLD.ugc_enabled THEN
    NEW.is_ugc := NEW.ugc_enabled;
  ELSIF NEW.is_ugc IS DISTINCT FROM OLD.is_ugc THEN
    NEW.ugc_enabled := NEW.is_ugc;
  END IF;

  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    NEW.banned := NEW.is_banned;
  ELSIF NEW.banned IS DISTINCT FROM OLD.banned THEN
    NEW.is_banned := NEW.banned;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_admin_fields ON public.profiles;
CREATE TRIGGER trg_sync_profile_admin_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_actor boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_admin, false)
  INTO is_admin_actor
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF COALESCE(is_admin_actor, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
    OR NEW.plan_type IS DISTINCT FROM OLD.plan_type
    OR NEW.premium_plan IS DISTINCT FROM OLD.premium_plan
    OR NEW.premium_plan_id IS DISTINCT FROM OLD.premium_plan_id
    OR NEW.premium_since IS DISTINCT FROM OLD.premium_since
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
    OR NEW.premium_until IS DISTINCT FROM OLD.premium_until
    OR NEW.is_ugc IS DISTINCT FROM OLD.is_ugc
    OR NEW.ugc_enabled IS DISTINCT FROM OLD.ugc_enabled
    OR NEW.banned IS DISTINCT FROM OLD.banned
    OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
    OR NEW.banned_reason IS DISTINCT FROM OLD.banned_reason
    OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
  THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_premium(target_user_id uuid, plan text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expires_at timestamptz;
  updated_row public.profiles;
BEGIN
  PERFORM public.assert_admin();

  expires_at := CASE
    WHEN plan = 'weekly' THEN now() + interval '7 days'
    WHEN plan = 'monthly' THEN now() + interval '30 days'
    WHEN plan = 'annual' THEN now() + interval '365 days'
    ELSE NULL
  END;

  UPDATE public.profiles p
  SET
    is_premium = true,
    plan_type = plan,
    premium_plan = plan,
    subscription_status = 'active',
    subscription_expires_at = expires_at,
    premium_until = expires_at,
    premium_since = COALESCE(premium_since, now()),
    updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, payload)
  VALUES (auth.uid(), target_user_id, 'grant_premium', jsonb_build_object('plan', plan, 'expires_at', expires_at));

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_premium(target_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.profiles;
BEGIN
  PERFORM public.assert_admin();

  UPDATE public.profiles p
  SET
    is_premium = false,
    plan_type = NULL,
    premium_plan = NULL,
    premium_plan_id = NULL,
    subscription_status = NULL,
    subscription_expires_at = NULL,
    premium_until = NULL,
    premium_since = NULL,
    updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, payload)
  VALUES (auth.uid(), target_user_id, 'revoke_premium', NULL);

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_ugc(target_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.profiles;
BEGIN
  PERFORM public.assert_admin();

  UPDATE public.profiles p
  SET
    ugc_enabled = true,
    is_ugc = true,
    updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, payload)
  VALUES (auth.uid(), target_user_id, 'grant_ugc', NULL);

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_ugc(target_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.profiles;
BEGIN
  PERFORM public.assert_admin();

  UPDATE public.profiles p
  SET
    ugc_enabled = false,
    is_ugc = false,
    updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, payload)
  VALUES (auth.uid(), target_user_id, 'revoke_ugc', NULL);

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.ban_user(target_user_id uuid, reason text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.profiles;
  target_is_admin boolean;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(p.is_admin, false)
  INTO target_is_admin
  FROM public.profiles p
  WHERE p.id = target_user_id;

  IF COALESCE(target_is_admin, false) THEN
    RAISE EXCEPTION 'cannot ban admin user';
  END IF;

  UPDATE public.profiles p
  SET
    is_banned = true,
    banned = true,
    banned_reason = reason,
    banned_at = COALESCE(banned_at, now()),
    updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, payload)
  VALUES (auth.uid(), target_user_id, 'ban_user', jsonb_build_object('reason', reason));

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.unban_user(target_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.profiles;
BEGIN
  PERFORM public.assert_admin();

  UPDATE public.profiles p
  SET
    is_banned = false,
    banned = false,
    banned_reason = NULL,
    banned_at = NULL,
    updated_at = now()
  WHERE p.id = target_user_id
  RETURNING p.* INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action, payload)
  VALUES (auth.uid(), target_user_id, 'unban_user', NULL);

  RETURN updated_row;
END;
$$;

DROP FUNCTION IF EXISTS public.get_admin_users();
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  display_name text,
  avatar_url text,
  is_premium boolean,
  plan_type text,
  premium_plan text,
  subscription_status text,
  subscription_expires_at timestamptz,
  premium_until timestamptz,
  is_ugc boolean,
  ugc_enabled boolean,
  banned boolean,
  is_banned boolean,
  banned_reason text,
  banned_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    au.email,
    p.username,
    p.display_name,
    p.avatar_url,
    p.is_premium,
    p.plan_type,
    p.premium_plan,
    p.subscription_status,
    p.subscription_expires_at,
    p.premium_until,
    p.is_ugc,
    p.ugc_enabled,
    p.banned,
    p.is_banned,
    p.banned_reason,
    p.banned_at,
    au.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  ORDER BY au.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_premium(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_premium(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_ugc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_ugc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_user(uuid) TO authenticated;
