-- Fix Profiles RLS to allow public viewing of profile data
-- This is necessary for friends, search, and battles to show opponent info

-- 1. Drop existing policy if it's too restrictive (e.g. "Users can only view their own profile")
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- 2. Create a new policy allowing authenticated users to read all profiles
-- We restrict only to authenticated users to avoid complete public exposure if desired, 
-- but for a social app, usually profiles are readable.
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true); -- Or (auth.role() = 'authenticated') if you want to be stricter

-- 3. Ensure avatars bucket is public or has correct policies
-- (Assuming 'avatars' bucket exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() = owner);
