-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  interval text NOT NULL DEFAULT 'monthly',
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.plans (id, name, interval, price_cents) VALUES
  ('weekly', 'Semanal', 'weekly', 100),
  ('monthly', 'Mensal', 'monthly', 4990),
  ('yearly', 'Anual', 'yearly', 49990)
ON CONFLICT (id) DO NOTHING;

-- RLS for plans (public read, service_role manage)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable" ON public.plans
  FOR SELECT USING (true);

CREATE POLICY "Service role manages plans" ON public.plans
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  plan_id text REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'pending',
  amount numeric,
  currency text DEFAULT 'BRL',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages payments" ON public.payments
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Create subscription_cancellation_feedback table
CREATE TABLE IF NOT EXISTS public.subscription_cancellation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text DEFAULT 'mercadopago',
  provider_subscription_id text,
  provider_payment_id text,
  plan_type text,
  price numeric,
  is_within_7_days boolean,
  reason_primary text NOT NULL,
  reason_details text,
  nps integer,
  had_issues boolean,
  issue_details text,
  retention_offer_shown text,
  retention_offer_accepted boolean,
  final_action text,
  refund_status text DEFAULT 'not_applicable',
  provider_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_cancellation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages cancellation feedback" ON public.subscription_cancellation_feedback
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own cancellation feedback" ON public.subscription_cancellation_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Add missing columns to profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_premium') THEN
    ALTER TABLE public.profiles ADD COLUMN is_premium boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='premium_since') THEN
    ALTER TABLE public.profiles ADD COLUMN premium_since timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='premium_plan_id') THEN
    ALTER TABLE public.profiles ADD COLUMN premium_plan_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_provider') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_provider text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_id') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_status') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='first_payment_at') THEN
    ALTER TABLE public.profiles ADD COLUMN first_payment_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_payment_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_payment_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='provider_payment_id') THEN
    ALTER TABLE public.profiles ADD COLUMN provider_payment_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='provider_subscription_id') THEN
    ALTER TABLE public.profiles ADD COLUMN provider_subscription_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cancelled_at') THEN
    ALTER TABLE public.profiles ADD COLUMN cancelled_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cancel_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN cancel_reason text;
  END IF;
END $$;

-- Add notification_id and payload columns to webhook_events if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='webhook_events' AND column_name='notification_id') THEN
    ALTER TABLE public.webhook_events ADD COLUMN notification_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='webhook_events' AND column_name='payload') THEN
    ALTER TABLE public.webhook_events ADD COLUMN payload jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='webhook_events' AND column_name='processed_at') THEN
    ALTER TABLE public.webhook_events ADD COLUMN processed_at timestamptz;
  END IF;
END $$;