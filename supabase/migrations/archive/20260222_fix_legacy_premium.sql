-- Fix for "Lost" Premium Users (Migration Cleanup)
-- Run this in Supabase SQL Editor to restore access for legacy users.

-- 1. Migrate users who have premium_status = true but were missed by the first migration
-- This covers cases where premium_until might be NULL (e.g., lifetime or old manual entry)
-- We default them to 1 year of access from today to be safe and generous.
UPDATE public.profiles
SET 
    subscription_status = 'active',
    subscription_expires_at = COALESCE(premium_until, now() + interval '1 year'),
    plan_type = COALESCE(plan_type, 'premium_yearly')
WHERE 
    premium_status = true 
    AND (subscription_status IS NULL OR subscription_status = 'free' OR subscription_status = 'expired');

-- 2. Ensure consistency: If someone is marked 'active' but has no expiration, give them 1 year.
UPDATE public.profiles
SET subscription_expires_at = now() + interval '1 year'
WHERE subscription_status = 'active' AND subscription_expires_at IS NULL;

-- 3. Log the fix (optional, just for verification)
-- SELECT count(*) as fixed_users FROM public.profiles WHERE subscription_status = 'active';
