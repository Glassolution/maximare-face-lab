-- Consolidation of face_analysis_events schema and RLS
-- Ensures all columns exist and permissions are strict

-- 1. Ensure Columns Exist (Idempotent)
DO $$
BEGIN
    -- result_json
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='face_analysis_events' AND column_name='result_json') THEN
        ALTER TABLE public.face_analysis_events ADD COLUMN result_json jsonb;
    END IF;
    -- image_meta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='face_analysis_events' AND column_name='image_meta') THEN
        ALTER TABLE public.face_analysis_events ADD COLUMN image_meta jsonb;
    END IF;
    -- provider_meta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='face_analysis_events' AND column_name='provider_meta') THEN
        ALTER TABLE public.face_analysis_events ADD COLUMN provider_meta jsonb;
    END IF;
    -- score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='face_analysis_events' AND column_name='score') THEN
        ALTER TABLE public.face_analysis_events ADD COLUMN score numeric;
    END IF;
    -- rank
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='face_analysis_events' AND column_name='rank') THEN
        ALTER TABLE public.face_analysis_events ADD COLUMN rank text;
    END IF;
    -- analysis_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='face_analysis_events' AND column_name='analysis_type') THEN
        ALTER TABLE public.face_analysis_events ADD COLUMN analysis_type text;
    END IF;
END $$;

-- 2. Indexes (Idempotent)
CREATE INDEX IF NOT EXISTS idx_face_analysis_events_score ON public.face_analysis_events(score);
CREATE INDEX IF NOT EXISTS idx_face_analysis_events_image_hash ON public.face_analysis_events USING btree ((image_meta->'front'->>'hash'));

-- 3. Strict RLS
ALTER TABLE public.face_analysis_events ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their own analysis events" ON public.face_analysis_events;
DROP POLICY IF EXISTS "Users can insert their own analysis events" ON public.face_analysis_events; -- If any
DROP POLICY IF EXISTS "Service role can do everything" ON public.face_analysis_events; -- If any

-- Create SELECT policy for owners
CREATE POLICY "Users can view their own analysis events"
ON public.face_analysis_events FOR SELECT
USING (auth.uid() = user_id);

-- Explicitly NO INSERT/UPDATE/DELETE policies for 'authenticated' or 'anon'.
-- This means ONLY the service_role (which bypasses RLS) can modify this table.
-- This secures the table from client-side tampering.

-- 4. Workaround for PostgREST Schema Cache
-- Notifying pgrst to reload schema cache
NOTIFY pgrst, 'reload config';
