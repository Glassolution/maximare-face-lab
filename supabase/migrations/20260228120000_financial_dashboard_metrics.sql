-- Create a function to get financial summary
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_of_month timestamptz := date_trunc('month', now());
  start_of_day timestamptz := date_trunc('day', now());
  revenue_today numeric;
  revenue_month numeric;
  refunds_month numeric;
  active_subscribers integer;
  churned_month integer;
  mrr numeric;
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Revenue Today
  SELECT COALESCE(SUM(amount_cents), 0) / 100.0 INTO revenue_today
  FROM public.purchases
  WHERE status = 'approved'
  AND created_at >= start_of_day;

  -- Revenue Month
  SELECT COALESCE(SUM(amount_cents), 0) / 100.0 INTO revenue_month
  FROM public.purchases
  WHERE status = 'approved'
  AND created_at >= start_of_month;

  -- Refunds Month
  SELECT COALESCE(SUM(amount_cents), 0) / 100.0 INTO refunds_month
  FROM public.purchases
  WHERE status IN ('refunded', 'charged_back')
  AND created_at >= start_of_month;

  -- Active Subscribers
  SELECT COUNT(*) INTO active_subscribers
  FROM public.profiles
  WHERE is_premium = true 
  AND subscription_status = 'active';

  -- Churned Month (Approximate based on updated_at and status)
  SELECT COUNT(*) INTO churned_month
  FROM public.profiles
  WHERE subscription_status IN ('canceled', 'expired')
  AND updated_at >= start_of_month;

  -- MRR Calculation (Approximate based on active plans)
  -- Values: Weekly 24.90, Monthly 49.90, Annual 499.90
  SELECT COALESCE(SUM(
    CASE 
      WHEN plan_type = 'weekly' THEN 24.90 * 4
      WHEN plan_type = 'monthly' THEN 49.90
      WHEN plan_type = 'annual' THEN 499.90 / 12
      ELSE 0
    END
  ), 0) INTO mrr
  FROM public.profiles
  WHERE is_premium = true 
  AND subscription_status = 'active';

  RETURN json_build_object(
    'revenue_today', revenue_today,
    'revenue_month', revenue_month,
    'refunds_month', refunds_month,
    'active_subscribers', active_subscribers,
    'churned_month', churned_month,
    'mrr', mrr
  );
END;
$$;

-- Create a function to get daily financials for charts
CREATE OR REPLACE FUNCTION public.get_daily_financials(days_lookback int DEFAULT 30)
RETURNS TABLE (
  date date,
  revenue numeric,
  refunds numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_lookback || ' days')::interval,
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  )
  SELECT 
    ds.day,
    COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.amount_cents ELSE 0 END) / 100.0, 0) as revenue,
    COALESCE(SUM(CASE WHEN p.status IN ('refunded', 'charged_back') THEN p.amount_cents ELSE 0 END) / 100.0, 0) as refunds
  FROM date_series ds
  LEFT JOIN public.purchases p ON date_trunc('day', p.created_at)::date = ds.day
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

-- Create a function to get recent refunds/cancellations
CREATE OR REPLACE FUNCTION public.get_recent_refunds()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  email varchar,
  plan text,
  amount_cents bigint,
  reason text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    pr.username,
    u.email::varchar,
    p.plan,
    p.amount_cents::bigint,
    'Requested by user'::text as reason, -- Placeholder as we don't have a reason column yet
    p.status,
    p.created_at
  FROM public.purchases p
  LEFT JOIN public.profiles pr ON p.user_id = pr.id
  LEFT JOIN auth.users u ON p.user_id = u.id
  WHERE p.status IN ('refunded', 'charged_back', 'pending_refund')
  ORDER BY p.created_at DESC
  LIMIT 20;
END;
$$;
