-- Fix RLS policies to ensure users can select their own profile
-- and service_role has full access for webhooks.

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing potentially conflicting policies to be safe
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can select their own profile" ON public.profiles;

-- 3. Create the definitive SELECT policy
CREATE POLICY "Authenticated users can select their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Ensure Service Role can do everything
GRANT ALL ON public.profiles TO service_role;

-- 5. Ensure Realtime is enabled for profiles (Critical for PaymentPendingScreen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Ignore if publication doesn't exist (e.g. local dev without realtime setup)
END $$;

COMMIT;
