-- Migration: Fix Purchases Table
-- Add missing column used by create-checkout function

ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_purchases_mp_preference_id ON public.purchases(mp_preference_id);
