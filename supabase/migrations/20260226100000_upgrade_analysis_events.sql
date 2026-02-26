-- Upgrade face_analysis_events to support full analysis data
-- This replaces the missing 'analysis_history' table

ALTER TABLE public.face_analysis_events
ADD COLUMN IF NOT EXISTS result_json jsonb,
ADD COLUMN IF NOT EXISTS image_meta jsonb,
ADD COLUMN IF NOT EXISTS provider_meta jsonb,
ADD COLUMN IF NOT EXISTS score numeric,
ADD COLUMN IF NOT EXISTS rank text,
ADD COLUMN IF NOT EXISTS analysis_type text; -- 'front', 'front_lateral'

-- Create index on score for ranking queries
CREATE INDEX IF NOT EXISTS idx_face_analysis_events_score ON public.face_analysis_events(score);

-- Create index on image hash for deduplication (inside jsonb)
CREATE INDEX IF NOT EXISTS idx_face_analysis_events_image_hash ON public.face_analysis_events USING btree ((image_meta->'front'->>'hash'));
