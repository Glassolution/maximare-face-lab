-- Migration: Final Clean Slate & Payment Structure
-- Description: Drops legacy tables and sets up the complete schema for the new Transparent Checkout flow.

-- 1. CLEAN SLATE (Drop legacy/existing tables to ensure schema matches)
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;

-- 2. CREATE PLANS TABLE
CREATE TABLE public.plans (
    id text PRIMARY KEY,
    name text NOT NULL,
    price_cents integer NOT NULL,
    price_display text NOT NULL,
    interval text NOT NULL CHECK (interval IN ('weekly', 'monthly', 'yearly')),
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed Plans
INSERT INTO public.plans (id, name, price_cents, price_display, interval, active)
VALUES 
    ('weekly', 'Semanal', 100, 'R$ 1,00', 'weekly', true),
    ('monthly', 'Mensal', 4990, 'R$ 49,90', 'monthly', true),
    ('yearly', 'Anual', 49990, 'R$ 499,90', 'yearly', true);

-- Enable RLS on Plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to plans"
ON public.plans FOR SELECT
USING (true);

CREATE POLICY "Service role can manage plans"
ON public.plans FOR ALL
USING (auth.role() = 'service_role');

-- 3. CREATE WEBHOOK_EVENTS TABLE (Idempotency)
CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider text NOT NULL,
    event_type text NOT NULL,
    resource_id text NOT NULL,
    payload jsonb,
    processed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_event UNIQUE(provider, event_type, resource_id)
);

-- Enable RLS on Webhook Events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook_events"
ON public.webhook_events FOR ALL
USING (auth.role() = 'service_role');

-- 4. UPDATE PROFILES TABLE
-- We use DO block to add columns if they don't exist to avoid errors if partially applied
DO $$
BEGIN
    -- premium_plan_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='premium_plan_id') THEN
        ALTER TABLE public.profiles ADD COLUMN premium_plan_id text REFERENCES public.plans(id);
    END IF;

    -- payment_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='payment_status') THEN
        ALTER TABLE public.profiles ADD COLUMN payment_status text;
    END IF;

    -- subscription_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status text;
    END IF;

    -- is_premium
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_premium') THEN
        ALTER TABLE public.profiles ADD COLUMN is_premium boolean DEFAULT false;
    END IF;

    -- premium_since
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='premium_since') THEN
        ALTER TABLE public.profiles ADD COLUMN premium_since timestamptz;
    END IF;

    -- subscription_expires_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_expires_at') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_expires_at timestamptz;
    END IF;

    -- plan_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_type') THEN
        ALTER TABLE public.profiles ADD COLUMN plan_type text;
    END IF;

    -- payment_provider
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='payment_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN payment_provider text;
    END IF;

    -- payment_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='payment_id') THEN
        ALTER TABLE public.profiles ADD COLUMN payment_id text;
    END IF;
END
$$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium);

-- 5. HELPER FUNCTION: get_user_id_by_email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM auth.users
  WHERE email = email_input;
  
  RETURN uid;
END;
$$;
