-- Migration: Add missing payment fields and helper function
-- Description: Adds premium_plan_id, payment_status to profiles and creates get_user_id_by_email function.

-- 1. Add columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_plan_id text,
ADD COLUMN IF NOT EXISTS payment_status text; -- 'approved', 'pending', 'rejected'

-- 2. Create security definer function to get user ID by email
-- This allows the service_role (used by Edge Functions) to look up users by email securely.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM auth.users
  WHERE email = $1;
  
  RETURN uid;
END;
$$;

-- Grant execution to service_role only
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
