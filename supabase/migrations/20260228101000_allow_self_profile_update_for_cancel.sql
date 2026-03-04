ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Users can update own profile (cancel)'
    ) THEN
        CREATE POLICY "Users can update own profile (cancel)"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid());
    END IF;
END
$$;
