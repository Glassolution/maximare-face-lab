-- Enable HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- Create function to actively check payment status from Mercado Pago
CREATE OR REPLACE FUNCTION public.check_payment_status(payment_id_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- NOTE: In production, you might want to store this in a secure way or vault
  -- For this implementation, we use the hardcoded token as requested/configured
  mp_token text := 'APP_USR-8613291338536834-022316-72f799587904f3c8cf5765932c696a30-2522145515';
  url text := 'https://api.mercadopago.com/v1/payments/' || payment_id_input;
  response http_response;
  response_body json;
  pay_status text;
  user_id uuid;
  plan_id text;
  pay_description text;
  days int := 30;
  p_type text := 'monthly';
  expires_at timestamptz;
BEGIN
  -- Make HTTP Request
  SELECT * INTO response FROM http((
    'GET', 
    url, 
    ARRAY[http_header('Authorization', 'Bearer ' || mp_token)],
    NULL,
    NULL
  )::http_request);

  IF response.status != 200 THEN
    RETURN json_build_object('error', 'Failed to fetch from MP', 'http_status', response.status);
  END IF;

  response_body := response.content::json;
  pay_status := response_body->>'status';
  
  -- Extract User ID safely (cast to uuid)
  BEGIN
      user_id := (response_body->>'external_reference')::uuid;
  EXCEPTION WHEN OTHERS THEN
      user_id := NULL;
  END;

  -- Logic for Plan Duration
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

  -- If approved, update DB
  IF pay_status = 'approved' AND user_id IS NOT NULL THEN
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
      WHERE id = user_id;
  END IF;

  RETURN json_build_object('status', pay_status, 'updated', (pay_status = 'approved'));
END;
$$;
