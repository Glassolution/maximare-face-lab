CREATE OR REPLACE FUNCTION public.get_admin_users()
 RETURNS TABLE(id uuid, username text, email text, display_name text, avatar_url text, is_premium boolean, plan_type text, subscription_status text, subscription_expires_at timestamp with time zone, is_ugc boolean, banned boolean, banned_reason text, banned_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id AS id,
    p.username::text,
    COALESCE(au.email::text, ''::text) AS email,
    p.display_name::text,
    p.avatar_url::text,
    COALESCE(p.is_premium, false) AS is_premium,
    p.plan_type::text,
    p.subscription_status::text,
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
$function$;