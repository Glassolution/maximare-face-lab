-- Fix the user's profile
UPDATE profiles 
SET is_premium = false, 
    subscription_status = 'cancelled', 
    cancelled_at = '2026-03-05T21:13:58+00:00', 
    cancel_reason = 'not_using'
WHERE user_id = '21858475-5b09-4f31-81e1-9b2392301ac7';

-- Restore the trigger function with proper service_role detection
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role text;
  session_role text;
BEGIN
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  session_role := coalesce(current_setting('role', true), '');
  
  -- Allow service_role, postgres (migrations), or supabase_admin
  IF jwt_role = 'service_role' 
     OR session_role IN ('service_role', 'postgres', 'supabase_admin') THEN
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