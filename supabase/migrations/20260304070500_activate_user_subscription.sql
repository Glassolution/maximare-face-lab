-- Migration: Centralize subscription activation into RPC
-- Ensures necessary columns and creates activate_user_subscription function

-- 1) Ensure required columns exist on profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_status') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_premium') THEN
    ALTER TABLE public.profiles ADD COLUMN is_premium boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='premium_since') THEN
    ALTER TABLE public.profiles ADD COLUMN premium_since timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_type') THEN
    ALTER TABLE public.profiles ADD COLUMN plan_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='premium_plan_id') THEN
    ALTER TABLE public.profiles ADD COLUMN premium_plan_id text REFERENCES public.plans(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='payment_provider') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_provider text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='payment_id') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='payment_status') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='first_payment_at') THEN
    ALTER TABLE public.profiles ADD COLUMN first_payment_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_payment_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_payment_at timestamptz;
  END IF;
END $$;

-- 2) Create centralized activation function
CREATE OR REPLACE FUNCTION public.activate_user_subscription(
  p_user_id uuid,
  p_plan_type text,
  p_payment_id text,
  p_days int,
  p_provider text DEFAULT 'mercadopago',
  p_plan_id text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at timestamptz;
  v_now timestamptz := now();
  v_log_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'activate_user_subscription: user_id is required';
  END IF;
  IF p_days IS NULL OR p_days <= 0 THEN
    RAISE EXCEPTION 'activate_user_subscription: days must be > 0';
  END IF;

  v_expires_at := v_now + make_interval(days => p_days);

  -- Upsert minimal profile record to ensure row exists
  BEGIN
    INSERT INTO public.profiles (id, user_id, subscription_status, plan_type)
    VALUES (p_user_id, p_user_id, 'free', 'free')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- ignore constraint variations (id vs user_id)
    INSERT INTO public.profiles (user_id, subscription_status, plan_type)
    VALUES (p_user_id, 'free', 'free')
    ON CONFLICT (user_id) DO NOTHING;
  END;

  -- Activate subscription atomically
  UPDATE public.profiles
  SET
    subscription_status = 'active',
    is_premium = true,
    premium_since = COALESCE(premium_since, v_now),
    subscription_expires_at = v_expires_at,
    plan_type = p_plan_type,
    premium_plan_id = p_plan_id,
    payment_provider = p_provider,
    payment_id = p_payment_id,
    payment_status = 'approved',
    first_payment_at = COALESCE(first_payment_at, v_now),
    last_payment_at = v_now,
    updated_at = v_now
  WHERE id = p_user_id OR user_id = p_user_id;

  -- Optional: upsert into payments table for audit
  BEGIN
    INSERT INTO public.payments (payment_id, user_id, plan_id, status, amount, currency, metadata, updated_at)
    VALUES (p_payment_id, p_user_id, p_plan_id, 'approved', p_amount, p_currency, p_metadata, v_now)
    ON CONFLICT (payment_id) DO UPDATE
      SET status = EXCLUDED.status,
          amount = COALESCE(EXCLUDED.amount, public.payments.amount),
          currency = COALESCE(EXCLUDED.currency, public.payments.currency),
          metadata = COALESCE(EXCLUDED.metadata, public.payments.metadata),
          updated_at = EXCLUDED.updated_at;
  EXCEPTION WHEN OTHERS THEN
    -- payments table may not exist in some environments; ignore
    NULL;
  END;

  -- Audit log helper if present
  BEGIN
    SELECT log_payment_event(
      p_payment_id,
      p_user_id,
      'subscription_activated',
      'rpc',
      NULL,
      'active',
      true,
      NULL,
      NULL,
      jsonb_build_object('plan_type', p_plan_type, 'days', p_days, 'provider', p_provider)
    ) INTO v_log_id;
  EXCEPTION WHEN OTHERS THEN
    -- helper may not exist
    v_log_id := NULL;
  END;

  RETURN json_build_object('success', true, 'expires_at', v_expires_at, 'log_id', v_log_id);
END;
$$;

-- 3) Grants
GRANT EXECUTE ON FUNCTION public.activate_user_subscription(uuid, text, text, int, text, text, numeric, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_user_subscription(uuid, text, text, int, text, text, numeric, text, jsonb) TO service_role;

