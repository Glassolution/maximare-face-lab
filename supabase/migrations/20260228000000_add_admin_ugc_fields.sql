-- Add admin and ugc fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_ugc boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_ugc ON public.profiles(is_ugc);

-- Update RLS policies to allow admins to see everything
-- Note: 'id' in profiles table references auth.users(id), so we use 'id' instead of 'user_id'
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Function to get all users with emails (for admin dashboard)
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
  created_at timestamPTZ
)
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is an admin
  -- Using 'id' because profiles.id IS the user_id
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id, -- profiles.id is the user_id
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
  JOIN auth.users u ON p.id = u.id -- Join on id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all purchases with user details (for admin finance)
CREATE OR REPLACE FUNCTION public.get_admin_purchases()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  email varchar,
  plan text,
  amount_cents bigint,
  provider text,
  status text,
  created_at timestamPTZ
)
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    pr.username,
    u.email::varchar,
    p.plan,
    p.amount_cents::bigint,
    p.provider,
    p.status,
    p.created_at
  FROM public.purchases p
  LEFT JOIN public.profiles pr ON p.user_id = pr.id -- Join purchases.user_id with profiles.id
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update the specific user to be admin
-- Using 'id' instead of 'user_id'
UPDATE public.profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com');
