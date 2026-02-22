-- Add missing columns to analysis_history to support the new deterministic AI logic
ALTER TABLE public.analysis_history 
ADD COLUMN IF NOT EXISTS image_meta JSONB,
ADD COLUMN IF NOT EXISTS provider_meta JSONB,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS rank TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS analysis_id UUID;

-- Create a unique constraint for upsert compatibility (idempotency)
-- This allows us to avoid inserting duplicates if the same analysis_id is retried
ALTER TABLE public.analysis_history 
ADD CONSTRAINT analysis_history_user_id_analysis_id_key UNIQUE (user_id, analysis_id);

-- Create index for faster lookups on image hashes
CREATE INDEX IF NOT EXISTS idx_analysis_history_image_meta_front_hash 
ON public.analysis_history ((image_meta->'front'->>'hash'));

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id_created_at 
ON public.analysis_history (user_id, created_at DESC);
