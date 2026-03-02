-- Create referral codes table for creators
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add referral_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text;

-- Create referral purchases table to track purchases made with referral codes
CREATE TABLE IF NOT EXISTS public.referral_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchaser_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  amount_cents bigint NOT NULL,
  commission_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_creator_id ON public.referral_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_purchases_creator_id ON public.referral_purchases(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_purchases_purchaser_id ON public.referral_purchases(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_referral_purchases_created_at ON public.referral_purchases(created_at DESC);

-- Function to generate unique referral code for a creator
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_creator_id uuid, p_code text)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a creator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_creator_id AND is_ugc = true
  ) THEN
    RAISE EXCEPTION 'Only creators can have referral codes';
  END IF;

  -- Insert or update referral code
  INSERT INTO public.referral_codes (creator_id, code)
  VALUES (p_creator_id, p_code)
  ON CONFLICT (creator_id) 
  DO UPDATE SET 
    code = p_code,
    updated_at = now();

  -- Update creator's referral code in profiles
  UPDATE public.profiles 
  SET referral_code = p_code
  WHERE id = p_creator_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to apply referral code during purchase
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_referral_code text, p_purchase_id uuid, p_purchaser_id uuid, p_plan_type text, p_amount_cents bigint)
RETURNS TABLE (
  success boolean,
  creator_id uuid,
  commission_cents bigint
)
SECURITY DEFINER
AS $$
DECLARE
  v_referral RECORD;
  v_commission_rate numeric := 0.10; -- 10% commission
  v_commission_cents bigint;
BEGIN
  -- Find active referral code
  SELECT rc.*, p.username as creator_username 
  INTO v_referral
  FROM public.referral_codes rc
  JOIN public.profiles p ON rc.creator_id = p.id
  WHERE rc.code = p_referral_code 
    AND rc.is_active = true;

  -- Check if referral code exists and is valid
  IF v_referral IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::bigint;
  END IF;

  -- Calculate commission (10% of purchase amount)
  v_commission_cents := FLOOR(p_amount_cents * v_commission_rate);

  -- Record referral purchase
  INSERT INTO public.referral_purchases (
    referral_code_id,
    creator_id,
    purchaser_id,
    purchase_id,
    plan_type,
    amount_cents,
    commission_cents
  ) VALUES (
    v_referral.id,
    v_referral.creator_id,
    p_purchaser_id,
    p_purchase_id,
    p_plan_type,
    p_amount_cents,
    v_commission_cents
  );

  RETURN QUERY SELECT true, v_referral.creator_id, v_commission_cents;
END;
$$ LANGUAGE plpgsql;

-- Function to get creator referral stats
CREATE OR REPLACE FUNCTION public.get_creator_referral_stats(p_creator_id uuid)
RETURNS TABLE (
  total_uses bigint,
  total_commission bigint,
  recent_purchases TABLE (
    id uuid,
    purchaser_username text,
    plan_type text,
    amount_cents bigint,
    commission_cents bigint,
    created_at timestamptz
  )
)
SECURITY DEFINER
AS $$
BEGIN
  -- Get total stats
  RETURN QUERY
  SELECT 
    COUNT(rp.id) as total_uses,
    COALESCE(SUM(rp.commission_cents), 0) as total_commission,
    (
      SELECT 
        jsonb_agg(
          jsonb_build_object(
            'id', rp.id,
            'purchaser_username', pp.username,
            'plan_type', rp.plan_type,
            'amount_cents', rp.amount_cents,
            'commission_cents', rp.commission_cents,
            'created_at', rp.created_at
          )
          ORDER BY rp.created_at DESC
          LIMIT 10
        )
      FROM public.referral_purchases rp
      JOIN public.profiles pp ON rp.purchaser_id = pp.id
      WHERE rp.creator_id = p_creator_id
    )::jsonb ->> 'recent_purchases' as recent_purchases
  FROM public.referral_purchases rp
  WHERE rp.creator_id = p_creator_id;
END;
$$ LANGUAGE plpgsql;

-- Generate referral codes for existing creators
INSERT INTO public.referral_codes (creator_id, code)
SELECT 
  p.id,
  UPPER(LEFT(REPLACE(p.username, ' ', ''), 6) || 
  CASE 
    WHEN LENGTH(p.username) >= 6 THEN '10'
    ELSE '10'
  END
) as code
FROM public.profiles p
WHERE p.is_ugc = true 
  AND p.referral_code IS NULL
ON CONFLICT (creator_id) DO NOTHING;

-- Update profiles with generated codes
UPDATE public.profiles 
SET referral_code = UPPER(LEFT(REPLACE(username, ' ', ''), 6) || '10')
WHERE is_ugc = true 
  AND referral_code IS NULL;
