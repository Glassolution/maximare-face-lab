-- Grant permissions on friendships table to API roles
-- This is necessary for PostgREST to access the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO service_role;

-- Ensure RLS is still enabled (it should be from previous migration, but good to be sure)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
