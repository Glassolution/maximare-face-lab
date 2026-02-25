-- Migration: 20260221_audit_fix_premium.sql
-- Description: Unifies premium system, secures RLS, and migrates legacy data.

-- 1. Unify Source of Truth & Clean Data
-- Ensure subscription_status has valid values
UPDATE public.profiles
SET subscription_status = 'expired'
WHERE subscription_status NOT IN ('active', 'canceled', 'past_due', 'refunded', 'expired', 'trialing', 'free') 
   OR subscription_status IS NULL;

-- Migrate legacy premium_status/premium_until to subscription_status
UPDATE public.profiles
SET 
    subscription_status = 'active',
    subscription_expires_at = premium_until,
    plan_type = CASE 
        WHEN premium_plan::text = 'monthly' THEN 'premium_monthly'
        WHEN premium_plan::text = 'yearly' THEN 'premium_yearly'
        WHEN premium_plan::text = 'weekly' THEN 'premium_weekly'
        ELSE 'premium_monthly'
    END
WHERE 
    (premium_until > now()) 
    AND (subscription_status = 'free' OR subscription_status IS NULL);

-- Ensure all expired subscriptions are marked correctly
UPDATE public.profiles
SET subscription_status = 'expired'
WHERE 
    subscription_expires_at < now() 
    AND subscription_status = 'active';

-- 2. Security & RLS Hardening
-- Revoke broad update permissions
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

-- Grant update ONLY on safe columns for users
GRANT UPDATE (display_name, avatar_url, username) ON public.profiles TO authenticated;

-- Ensure Service Role still has full access (it bypasses RLS, but grants might be needed if role was revoked explicitly, usually service_role is superuser equivalent in Supabase context or bypasses RLS)
-- Note: In Supabase, service_role bypasses RLS, but standard grants apply.

-- 3. Create Server-Side Validation Function (Optional but recommended for RPC calls)
CREATE OR REPLACE FUNCTION public.is_premium(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = check_user_id 
      AND subscription_status = 'active' 
      AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
  );
END;
$$;

-- 4. Database Trigger for Auto-Expiration (Lazy Check on Update or Scheduled?)
-- Since we can't easily schedule within standard SQL without pg_cron extension enabling (which might not be active),
-- We will rely on the Application/Webhook to handle expiration transitions, 
-- BUT we add a trigger to enforce consistency on any write.

CREATE OR REPLACE FUNCTION public.enforce_premium_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- If expiration date is passed, force status to expired
  IF NEW.subscription_expires_at < now() AND NEW.subscription_status = 'active' THEN
     NEW.subscription_status := 'expired';
  END IF;
  
  -- Sync legacy columns for backward compatibility (Optional: Remove if we want to kill legacy fully)
  -- We will STOP syncing to legacy to force frontend to use new columns.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_premium_consistency
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_premium_consistency();
