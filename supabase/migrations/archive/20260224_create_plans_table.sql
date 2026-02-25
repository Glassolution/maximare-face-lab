-- Migration: Create Plans Table and Seed Data
-- Description: Creates the plans table with fixed prices and intervals, updates profiles schema for payment tracking.

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
    ('weekly', 'Semanal', 2490, 'R$ 24,90', 'weekly', true),
    ('monthly', 'Mensal', 4990, 'R$ 49,90', 'monthly', true),
    ('yearly', 'Anual', 49990, 'R$ 499,90', 'yearly', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    price_display = EXCLUDED.price_display,
    interval = EXCLUDED.interval,
    active = EXCLUDED.active;

-- 3. Update 'profiles' table with new fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_plan_id text REFERENCES public.plans(id),
ADD COLUMN IF NOT EXISTS payment_status text; -- 'approved', 'pending', 'rejected'

-- Ensure previous columns exist (idempotency from clean slate migration)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_since timestamptz,
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS plan_type text,
ADD COLUMN IF NOT EXISTS payment_provider text,
ADD COLUMN IF NOT EXISTS payment_id text;

-- 4. Enable RLS on plans (Public Read-only)
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
