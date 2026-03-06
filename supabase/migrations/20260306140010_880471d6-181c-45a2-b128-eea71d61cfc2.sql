CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text;
  session_role text;
  invoker text;
BEGIN
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  session_role := coalesce(current_setting('role', true), '');
  
  -- Allow service_role, postgres (migrations), supabase_admin, or security definer context
  IF jwt_role = 'service_role' 
     OR session_role IN ('service_role', 'postgres', 'supabase_admin')
     OR current_user = 'postgres'
     OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  -- Also allow if called from a SECURITY DEFINER function (current_user will be the function owner)
  -- Check if we're in a security definer context by comparing current_user vs session_user
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;

  -- Block changes to protected fields for regular users
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
     OR NEW.plan_type IS DISTINCT FROM OLD.plan_type
     OR NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify subscription fields'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;