
-- Migration to make check_payment_status "Self-Healing"
-- If payment is not found in DB (because Edge Function wasn't deployed), fetch from MP and insert it.

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
  payer_email text;
  
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
  data_source text := 'mp_api';
BEGIN
  -- A. SECURITY CHECKS
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Please login.');
  END IF;

  -- B. LOCK & VALIDATE (First Pass: Check DB)
  SELECT * INTO payment_record 
  FROM payments 
  WHERE payment_id = payment_id_input 
  FOR UPDATE; 

  -- AUTO-HEAL: If not found in DB, try to fetch from MP directly
  IF payment_record IS NULL THEN
      -- Proceed to fetch from MP, but mark as "not found in db"
      -- We will INSERT it later if valid.
      NULL; -- Do nothing, let it fall through to MP call
  ELSE
      -- Verify Ownership if record exists
      IF payment_record.user_id != current_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Forbidden: Payment does not belong to user.');
      END IF;

      -- Rate Limiting (Cache Strategy)
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
  END IF;

  -- C. RETRIEVE TOKEN (Secure Vault)
  SELECT value INTO mp_token FROM app_secrets WHERE key = 'MERCADOPAGO_ACCESS_TOKEN';
  IF mp_token IS NULL THEN
     RAISE EXCEPTION 'Server Configuration Error: Missing MP Token';
  END IF;

  -- D. EXTERNAL API CALL
  url := 'https://api.mercadopago.com/v1/payments/' || payment_id_input;
  
  SELECT * INTO response FROM http((
    'GET', 
    url, 
    ARRAY[http_header('Authorization', 'Bearer ' || mp_token)],
    NULL,
    NULL
  )::http_request);

  -- E. HANDLE RESPONSE ERROR
  IF response.status != 200 THEN
    IF payment_record IS NOT NULL THEN
        UPDATE payments 
        SET last_error = 'MP API Error: ' || response.status, 
            last_error_at = NOW(),
            check_count = COALESCE(check_count, 0) + 1,
            last_checked_at = NOW()
        WHERE payment_id = payment_id_input;
    END IF;
    
    RETURN json_build_object('success', false, 'error', 'Failed to fetch from Provider', 'http_status', response.status);
  END IF;

  response_body := response.content::json;
  pay_status := response_body->>'status';
  pay_amount := (response_body->>'transaction_amount')::numeric;
  pay_currency := response_body->>'currency_id';
  pay_metadata := response_body->'metadata';
  payer_email := response_body->'payer'->>'email';
  
  -- Extract User ID safely
  BEGIN
      mp_user_id := (response_body->>'external_reference')::uuid;
  EXCEPTION WHEN OTHERS THEN
      mp_user_id := NULL;
  END;

  -- F. VERIFY OWNERSHIP (Auto-Heal Safety)
  -- If we are creating the record now, we must ensure the user owns this payment
  IF payment_record IS NULL THEN
      IF mp_user_id IS NOT NULL AND mp_user_id != current_user_id THEN
          RETURN json_build_object('success', false, 'error', 'Forbidden: Payment belongs to another user.');
      END IF;
      -- If external_reference is missing, check email? (Optional, strictly external_reference is safer)
      IF mp_user_id IS NULL THEN
           -- Fallback: If no external_reference, we can't safely claim it.
           -- UNLESS we trust the frontend provided ID? No.
           -- We can check if email matches auth email?
           -- For now, let's require external_reference or just log it to current user if it's orphaned?
           -- Safer to require external_reference.
           RETURN json_build_object('success', false, 'error', 'Payment has no user reference.');
      END IF;
  END IF;

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

  -- H. UPDATE DATABASE & LOGIC
  
  -- Calculate Check Count
  IF payment_record IS NOT NULL THEN
      is_status_changed := (payment_record.status IS DISTINCT FROM pay_status);
      IF is_status_changed AND (pay_status = 'approved' OR pay_status = 'rejected') THEN
          new_check_count := 0; 
      ELSE
          new_check_count := COALESCE(payment_record.check_count, 0) + 1;
      END IF;
  ELSE
      new_check_count := 1;
  END IF;

  -- Upsert Payment (Handles both existing and new/auto-healed)
  INSERT INTO public.payments (
      payment_id, user_id, plan_id, status, amount, currency, metadata, 
      updated_at, last_checked_at, check_count, last_error, approved_at, source_of_approval
  )
  VALUES (
      payment_id_input, current_user_id, plan_id, pay_status, pay_amount, pay_currency, pay_metadata, 
      NOW(), NOW(), new_check_count, NULL, 
      CASE WHEN pay_status = 'approved' THEN NOW() ELSE NULL END,
      CASE WHEN pay_status = 'approved' THEN 'polling_autoheal' ELSE NULL END
  )
  ON CONFLICT (payment_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    metadata = EXCLUDED.metadata,
    updated_at = NOW(),
    last_checked_at = NOW(),
    check_count = new_check_count,
    last_error = NULL,
    approved_at = CASE 
        WHEN pay_status = 'approved' AND (payments.status != 'approved' OR payments.status IS NULL) 
        THEN NOW() 
        ELSE payments.approved_at 
    END,
    source_of_approval = CASE 
        WHEN pay_status = 'approved' AND (payments.status != 'approved' OR payments.status IS NULL) 
        THEN 'polling' 
        ELSE payments.source_of_approval 
    END;

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
    'payment_id', payment_id_input,
    'healed', (payment_record IS NULL)
  );
END;
$$;
