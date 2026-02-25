-- Migration: Consolidated Payment Setup
-- Description: Sets up plans, webhook_events, updates profiles, and adds helper functions.

-- 1. Create 'plans' table
CREATE TABLE IF NOT EXISTS public.plans (
    id text PRIMARY KEY,
    name text NOT NULL,
    price_cents integer NOT NULL,
    price_display text NOT NULL,
    interval text NOT NULL CHECK (interval IN ('weekly', 'monthly', 'yearly')),
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Seed Plans (Idempotent Insert)
INSERT INTO public.plans (id, name, price_cents, price_display, interval, active)
VALUES 
    ('weekly', 'Semanal', 100, 'R$ 1,00', 'weekly', true),
    ('monthly', 'Mensal', 4990, 'R$ 49,90', 'monthly', true),
    ('yearly', 'Anual', 49990, 'R$ 499,90', 'yearly', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    price_display = EXCLUDED.price_display,
    interval = EXCLUDED.interval,
    active = EXCLUDED.active;

-- 3. Create 'webhook_events' table for Idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider text NOT NULL,
    event_type text NOT NULL,
    resource_id text NOT NULL,
    payload jsonb,
    processed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    UNIQUE(provider, event_type, resource_id)
);

-- 4. Update 'profiles' table with new fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_plan_id text REFERENCES public.plans(id),
ADD COLUMN IF NOT EXISTS payment_status text, -- 'approved', 'pending', 'rejected'
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_since timestamptz,
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS plan_type text,
ADD COLUMN IF NOT EXISTS payment_provider text,
ADD COLUMN IF NOT EXISTS payment_id text;

-- 5. Helper Function: get_user_id_by_email (Secure RPC)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email text)
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
  WHERE email = $1;
  
  RETURN uid;
END;
$$;

-- 6. RLS Policies

-- Plans: Public Read-only
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Allow public read access to plans'
    ) THEN
        CREATE POLICY "Allow public read access to plans"
        ON public.plans FOR SELECT
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Service role can manage plans'
    ) THEN
        CREATE POLICY "Service role can manage plans"
        ON public.plans FOR ALL
        USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- Webhook Events: Service Role Only
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'Service role can manage webhook_events'
    ) THEN
        CREATE POLICY "Service role can manage webhook_events"
        ON public.webhook_events FOR ALL
        USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- Profiles: Allow Service Role updates (already likely exists, but ensuring)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Service role can update profiles'
    ) THEN
        CREATE POLICY "Service role can update profiles"
        ON public.profiles FOR UPDATE
        USING (auth.role() = 'service_role');
    END IF;
END
$$;
