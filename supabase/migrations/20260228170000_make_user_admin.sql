-- Ensure xavierluisfelipe12@gmail.com is an admin
-- This is a reinforcement of the previous migration to make sure it applies
-- even if the user was created after the previous migration ran.

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com';
  
  -- If user exists, update profile
  IF v_user_id IS NOT NULL THEN
    -- Ensure profile exists (it should, but just in case)
    INSERT INTO public.profiles (id, username)
    VALUES (v_user_id, 'xavier_admin')
    ON CONFLICT (id) DO NOTHING;
    
    -- Update is_admin
    UPDATE public.profiles
    SET is_admin = true
    WHERE id = v_user_id;
    
    RAISE NOTICE 'User xavierluisfelipe12@gmail.com set as admin';
  ELSE
    RAISE NOTICE 'User xavierluisfelipe12@gmail.com not found';
  END IF;
END $$;
