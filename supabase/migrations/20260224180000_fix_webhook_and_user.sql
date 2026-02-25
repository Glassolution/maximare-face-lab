-- Migration: Fix Webhook Idempotency & Manual User Fix
-- Description: Drops the restrictive unique constraint and fixes the specific user's subscription.

-- 1. Fix Idempotency Schema
ALTER TABLE public.webhook_events DROP CONSTRAINT IF EXISTS unique_event;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS notification_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_notification_id ON public.webhook_events(notification_id);

-- 2. Manual Fix for User xavierluisfelipe12@gmail.com
-- We use a DO block to ensure we find the user
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
            subscription_status = 'active',
            is_premium = true,
            premium_since = now(),
            subscription_expires_at = now() + interval '7 days',
            plan_type = 'weekly',
            premium_plan_id = 'weekly',
            payment_provider = 'manual_fix_mp_delay',
            payment_status = 'approved',
            updated_at = now()
        WHERE id = target_user_id;
    END IF;
END $$;
