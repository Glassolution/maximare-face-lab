-- Ensure referral system is properly set up
-- This migration ensures the RPC function exists and tables are ready

-- Check if referral_code column exists in profiles table
DO $$
BEGIN
  -- Add referral_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN referral_code text;
  END IF;
END $$;

-- Ensure the generate_referral_code function exists
DROP FUNCTION IF EXISTS public.generate_referral_code(uuid, text);
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_creator_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
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

  -- Update creator's referral code in profiles table
  UPDATE public.profiles 
  SET referral_code = p_code
  WHERE id = p_creator_id;

  RETURN true;
END;
$$;

-- Ensure the get_creator_referral_stats function exists
DROP FUNCTION IF EXISTS public.get_creator_referral_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_creator_referral_stats(p_creator_id uuid)
RETURNS TABLE (
  total_uses bigint,
  total_commission bigint,
  recent_purchases json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(rp.id) as total_uses,
    COALESCE(SUM(rp.commission_cents), 0) as total_commission,
    COALESCE(
      (
        SELECT jsonb_agg(row_data)
        FROM (
          SELECT jsonb_build_object(
            'id', rp2.id,
            'purchaser_username', pp2.username,
            'plan_type', rp2.plan_type,
            'amount_cents', rp2.amount_cents,
            'commission_cents', rp2.commission_cents,
            'created_at', rp2.created_at
          ) as row_data
          FROM public.referral_purchases rp2
          LEFT JOIN public.profiles pp2 ON rp2.purchaser_id = pp2.id
          WHERE rp2.creator_id = p_creator_id
          ORDER BY rp2.created_at DESC
          LIMIT 10
        ) sub
      ),
      '[]'::jsonb
    ) as recent_purchases
  FROM public.referral_purchases rp
  LEFT JOIN public.profiles pp ON rp.purchaser_id = pp.id
  WHERE rp.creator_id = p_creator_id
  GROUP BY rp.creator_id;
END;
$$;

-- Ensure RLS policies for referral tables
DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;
CREATE POLICY "Users can view their own referral codes"
ON public.referral_codes FOR SELECT
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can insert their own referral codes" ON public.referral_codes;
CREATE POLICY "Users can insert their own referral codes"
ON public.referral_codes FOR INSERT
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their own referral codes" ON public.referral_codes;
CREATE POLICY "Users can update their own referral codes"
ON public.referral_codes FOR UPDATE
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete their own referral codes" ON public.referral_codes;
CREATE POLICY "Users can delete their own referral codes"
ON public.referral_codes FOR DELETE
USING (auth.uid() = creator_id);

-- Enable RLS on referral tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referral_purchases'
  ) THEN
    ALTER TABLE public.referral_purchases ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
