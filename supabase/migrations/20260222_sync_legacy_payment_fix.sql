-- Safety Trigger: Sync Legacy Webhook Updates to New System
-- Run this in Supabase SQL Editor BEFORE making a new payment.
-- This ensures that if the old webhook (running in production) updates 'premium_status',
-- the database automatically updates 'subscription_status' to match.

CREATE OR REPLACE FUNCTION public.sync_legacy_premium_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If legacy premium_status is turned ON, sync it to new subscription_status
  IF NEW.premium_status = true AND (OLD.premium_status IS DISTINCT FROM NEW.premium_status) THEN
      NEW.subscription_status := 'active';
      
      -- Sync expiration date
      IF NEW.premium_until IS NOT NULL THEN
          NEW.subscription_expires_at := NEW.premium_until;
      ELSE
          -- Fallback if webhook didn't set date: give 30 days
          NEW.subscription_expires_at := now() + interval '30 days';
      END IF;
      
      -- Ensure plan type is set
      IF NEW.plan_type IS NULL OR NEW.plan_type = 'free' THEN
          NEW.plan_type := 'premium_monthly';
      END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_legacy_premium ON public.profiles;

CREATE TRIGGER trg_sync_legacy_premium
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_legacy_premium_update();
