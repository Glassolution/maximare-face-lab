-- EMERGENCY FIX: Disable RLS on profiles to fix infinite recursion
-- This is a temporary fix - RLS can be re-enabled with proper policies later

-- First, drop ALL policies to ensure clean state
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT INSERT, UPDATE ON profiles TO authenticated;
