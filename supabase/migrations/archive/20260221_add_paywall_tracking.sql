-- Add paywall tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_paywall_dismissed_at timestamptz,
ADD COLUMN IF NOT EXISTS paywall_dismiss_count_7d int DEFAULT 0;
