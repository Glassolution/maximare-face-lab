-- Add new subscription columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';

-- Migrate existing data (best effort mapping)
UPDATE public.profiles
SET 
  subscription_status = CASE 
    WHEN premium_until > now() THEN 'premium_active'
    WHEN premium_until <= now() THEN 'premium_expired'
    ELSE 'free'
  END,
  subscription_expires_at = premium_until,
  plan_type = CASE 
    WHEN plan = 'premium' THEN 'premium_monthly' 
    ELSE 'free' 
  END
WHERE subscription_status = 'free'; -- Only update if not already set (safety check)

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
