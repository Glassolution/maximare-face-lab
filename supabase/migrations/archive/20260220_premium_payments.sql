
-- Create ENUMs for status and plans
CREATE TYPE premium_status AS ENUM ('free', 'premium');
CREATE TYPE premium_plan AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE payment_provider AS ENUM ('mercadopago');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'chargeback');

-- Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS premium_status premium_status DEFAULT 'free',
ADD COLUMN IF NOT EXISTS premium_plan premium_plan,
ADD COLUMN IF NOT EXISTS premium_since timestamptz,
ADD COLUMN IF NOT EXISTS premium_until timestamptz,
ADD COLUMN IF NOT EXISTS last_paywall_shown_at timestamptz,
ADD COLUMN IF NOT EXISTS paywall_show_count_7d int DEFAULT 0;

-- Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider payment_provider NOT NULL,
  plan premium_plan NOT NULL,
  amount_cents int NOT NULL,
  currency text DEFAULT 'BRL',
  status payment_status DEFAULT 'pending',
  mp_preference_id text UNIQUE,
  mp_payment_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider payment_provider NOT NULL,
  event_type text NOT NULL,
  resource_id text NOT NULL,
  request_id text,
  processed_at timestamptz DEFAULT now(),
  UNIQUE(provider, event_type, resource_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_mp_preference_id ON public.purchases(mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_purchases_mp_payment_id ON public.purchases(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resource_id ON public.webhook_events(resource_id);

-- RLS Policies
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" 
ON public.purchases FOR SELECT 
USING (auth.uid() = user_id);

-- Only service role can insert/update purchases via functions
CREATE POLICY "Service role can manage purchases" 
ON public.purchases FOR ALL 
USING (auth.role() = 'service_role');

-- Webhook events are internal, only service role
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage webhook events" 
ON public.webhook_events FOR ALL 
USING (auth.role() = 'service_role');
