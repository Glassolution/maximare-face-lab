-- Migration: Create subscription cancellation feedback and ensure profile fields

-- 1. Ensure profiles table has necessary fields for subscription tracking
DO $$
BEGIN
    -- subscription_started_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_started_at') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_started_at timestamptz;
    END IF;

    -- first_payment_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_payment_at') THEN
        ALTER TABLE public.profiles ADD COLUMN first_payment_at timestamptz;
    END IF;

    -- provider_subscription_id (e.g. preapproval_id from MP)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_subscription_id') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_subscription_id text;
    END IF;

    -- provider_payment_id (e.g. payment_id from MP)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'provider_payment_id') THEN
        ALTER TABLE public.profiles ADD COLUMN provider_payment_id text;
    END IF;

    -- cancel_at_period_end (to mark if user cancelled but still has access)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cancel_at_period_end') THEN
        ALTER TABLE public.profiles ADD COLUMN cancel_at_period_end boolean DEFAULT false;
    END IF;

     -- cancelled_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cancelled_at') THEN
        ALTER TABLE public.profiles ADD COLUMN cancelled_at timestamptz;
    END IF;

    -- cancel_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cancel_reason') THEN
        ALTER TABLE public.profiles ADD COLUMN cancel_reason text;
    END IF;
END $$;

-- 2. Create subscription_cancellation_feedback table
CREATE TABLE IF NOT EXISTS public.subscription_cancellation_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'mercadopago',
    provider_subscription_id text,
    provider_payment_id text,
    plan_type text,
    price numeric,
    is_within_7_days boolean NOT NULL,
    reason_primary text NOT NULL,
    reason_details text,
    nps integer,
    had_issues boolean,
    issue_details text,
    retention_offer_shown text,
    retention_offer_accepted boolean,
    final_action text NOT NULL, -- 'cancelled_with_refund', 'cancelled_at_period_end', 'kept_subscription'
    refund_status text NOT NULL DEFAULT 'not_applicable', -- 'processed', 'failed', 'pending', 'not_applicable'
    provider_payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE public.subscription_cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert their own cancellation feedback"
ON public.subscription_cancellation_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own cancellation feedback"
ON public.subscription_cancellation_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- (Optional) Allow service_role to do everything
CREATE POLICY "Service role has full access to cancellation feedback"
ON public.subscription_cancellation_feedback
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
