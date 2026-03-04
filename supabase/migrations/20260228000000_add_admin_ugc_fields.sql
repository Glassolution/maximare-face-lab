-- Add admin and ugc fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_ugc boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_ugc ON public.profiles(is_ugc);

-- Update RLS policies to allow admins to see everything
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
  END IF;
END $$;

-- Function to get all users with emails (for admin dashboard)
-- Drop first to allow return type change
DROP FUNCTION IF EXISTS public.get_admin_users();
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email varchar,
  username text,
  display_name text,
  avatar_url text,
  is_premium boolean,
  plan_type text,
  is_ugc boolean,
  banned boolean,
  created_at timestamptz
)
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::varchar,
    p.username,
    p.display_name,
    p.avatar_url,
    p.is_premium,
    p.plan_type,
    p.is_ugc,
    p.banned,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update the specific user to be admin
UPDATE public.profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com');
