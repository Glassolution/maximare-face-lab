
-- 1. App Secrets Security (Operability Improvement)
CREATE TABLE IF NOT EXISTS public.app_secrets (
    key text PRIMARY KEY,
    value text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to enforce "Implicit Deny All" for API
-- This ensures that only Superusers or Service Role (SQL Editor) can access it.
DROP POLICY IF EXISTS "No access for anyone" ON public.app_secrets;
DROP POLICY IF EXISTS "Allow service role" ON public.app_secrets;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_secrets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.app_secrets;

-- 2. Telemetry Columns (Audit & Debug)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS last_error_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS source_of_approval text;

-- 3. Improved RPC with Bug Fixes & Guardrails
CREATE OR REPLACE FUNCTION public.check_payment_status(payment_id_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  mp_token text;
  url text;
  response http_response;
  response_body json;
  pay_status text;
  
  -- User Context
  current_user_id uuid;
  payment_record record;
  
  -- MP Data
  mp_user_id uuid;
  plan_id text;
  pay_description text;
  pay_amount numeric;
  pay_currency text;
  pay_metadata jsonb;
  
  -- Logic
  days int := 30;
  p_type text := 'monthly';
  expires_at timestamptz;
  
  -- Rate Limit Config
  max_checks int := 120;
  min_interval interval := '3 seconds';
  
  -- State Tracking
  is_status_changed boolean;
  new_check_count int;
BEGIN
  -- A. SECURITY CHECKS
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Please login.');
  END IF;

  -- B. LOCK & VALIDATE (BUG FIX #1)
  SELECT * INTO payment_record 
  FROM payments 
  WHERE payment_id = payment_id_input 
  FOR UPDATE; 

  -- Fix: Handle non-existent payment explicitly
  IF payment_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'payment_not_found', 'code', 404);
  END IF;

  -- Fix: Only check ownership if record exists
  IF payment_record.user_id != current_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden: Payment does not belong to user.');
  END IF;

  -- C. RATE LIMITING (Cache Strategy)
  -- If checked recently, return CACHED status (Anti-Spam)
  IF payment_record.last_checked_at > (now() - min_interval) THEN
      RETURN json_build_object(
        'success', (payment_record.status = 'approved'), 
        'status', payment_record.status, 
        'source', 'cache',
        'message', 'Rate limit: Returning cached status.'
      );
  END IF;

  -- Abuse Protection
  IF payment_record.check_count >= max_checks THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Timeout: Too many checks. Please contact support.'
      );
  END IF;

  -- D. RETRIEVE TOKEN (Secure Vault)
  SELECT value INTO mp_token FROM app_secrets WHERE key = 'MERCADOPAGO_ACCESS_TOKEN';
  IF mp_token IS NULL THEN
     RAISE EXCEPTION 'Server Configuration Error: Missing MP Token';
  END IF;

  -- E. EXTERNAL API CALL
  url := 'https://api.mercadopago.com/v1/payments/' || payment_id_input;
  
  SELECT * INTO response FROM http((
    'GET', 
    url, 
    ARRAY[http_header('Authorization', 'Bearer ' || mp_token)],
    NULL,
    NULL
  )::http_request);

  -- F. HANDLE RESPONSE ERROR (Telemetry #4)
  IF response.status != 200 THEN
    UPDATE payments 
    SET last_error = 'MP API Error: ' || response.status, 
        last_error_at = NOW(),
        check_count = COALESCE(check_count, 0) + 1,
        last_checked_at = NOW()
    WHERE payment_id = payment_id_input;
    
    RETURN json_build_object('success', false, 'error', 'Failed to fetch from Provider', 'http_status', response.status);
  END IF;

  response_body := response.content::json;
  pay_status := response_body->>'status';
  pay_amount := (response_body->>'transaction_amount')::numeric;
  pay_currency := response_body->>'currency_id';
  pay_metadata := response_body->'metadata';
  
  -- Extract User ID safely
  BEGIN
      mp_user_id := (response_body->>'external_reference')::uuid;
  EXCEPTION WHEN OTHERS THEN
      mp_user_id := NULL;
  END;

  -- G. PLAN LOGIC
  pay_description := COALESCE(response_body->>'description', '');
  plan_id := response_body->'metadata'->>'plan_id';

  IF plan_id IS NOT NULL THEN
      SELECT interval INTO p_type FROM plans WHERE id = plan_id;
      IF p_type = 'weekly' THEN days := 7; END IF;
      IF p_type = 'yearly' THEN days := 365; END IF;
  ELSIF pay_description ILIKE '%weekly%' OR pay_description ILIKE '%semanal%' THEN
      days := 7;
      p_type := 'weekly';
  ELSIF pay_description ILIKE '%yearly%' OR pay_description ILIKE '%anual%' THEN
      days := 365;
      p_type := 'yearly';
  END IF;
  
  expires_at := NOW() + (days || ' days')::interval;

  -- H. UPDATE DATABASE & LOGIC (Rate Limit Reset #3 & Telemetry #4)
  is_status_changed := (payment_record.status IS DISTINCT FROM pay_status);

  -- Reset check count if we reached a final state (approved/rejected)
  IF is_status_changed AND (pay_status = 'approved' OR pay_status = 'rejected') THEN
      new_check_count := 0; 
  ELSE
      new_check_count := COALESCE(payment_record.check_count, 0) + 1;
  END IF;

  UPDATE public.payments
  SET 
    status = pay_status,
    amount = pay_amount,
    currency = pay_currency,
    metadata = pay_metadata,
    updated_at = NOW(),
    last_checked_at = NOW(),
    check_count = new_check_count,
    last_error = NULL,
    -- Telemetry: Approved At
    approved_at = CASE 
        WHEN pay_status = 'approved' AND (payment_record.status != 'approved' OR payment_record.status IS NULL) 
        THEN NOW() 
        ELSE approved_at 
    END,
    -- Telemetry: Source
    source_of_approval = CASE 
        WHEN pay_status = 'approved' AND (payment_record.status != 'approved' OR payment_record.status IS NULL) 
        THEN 'polling' 
        ELSE source_of_approval 
    END
  WHERE payment_id = payment_id_input;

  -- 3. Update Profiles (Service Role logic)
  IF pay_status = 'approved' THEN
      UPDATE profiles
      SET 
          subscription_status = 'active',
          is_premium = true,
          premium_since = NOW(),
          subscription_expires_at = expires_at,
          plan_type = p_type,
          premium_plan_id = plan_id,
          payment_provider = 'mercadopago',
          payment_id = payment_id_input,
          payment_status = 'approved',
          updated_at = NOW()
      WHERE id = current_user_id;
  END IF;

  RETURN json_build_object(
    'success', (pay_status = 'approved'), 
    'status', pay_status, 
    'source', 'mp_api',
    'payment_id', payment_id_input
  );
END;
$$;
