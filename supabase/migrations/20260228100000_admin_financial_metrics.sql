-- Resumo financeiro com estornos e churn
CREATE OR REPLACE FUNCTION get_financial_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue_today numeric;
  v_revenue_month numeric;
  v_refunds_month numeric;
  v_active_subscribers int;
  v_churned_month int;
  v_mrr numeric;
  v_total_historical numeric;
BEGIN
  -- Verificar se é admin
  IF NOT (SELECT is_admin FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Receita Hoje (usando payments)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_revenue_today
  FROM payments
  WHERE status = 'approved'
  AND created_at >= CURRENT_DATE;

  -- Receita Mês (usando payments)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_revenue_month
  FROM payments
  WHERE status = 'approved'
  AND created_at >= date_trunc('month', NOW());

  -- Total Histórico
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_historical
  FROM payments
  WHERE status = 'approved';

  -- Estornos Mês (usando payments - status 'refunded' ou 'charged_back')
  SELECT COALESCE(SUM(amount), 0)
  INTO v_refunds_month
  FROM payments
  WHERE status IN ('refunded', 'charged_back')
  AND created_at >= date_trunc('month', NOW());

  -- Assinantes Ativos
  SELECT COUNT(*)
  INTO v_active_subscribers
  FROM profiles
  WHERE is_premium = true
  AND subscription_status = 'active';

  -- Churn Mês (usuários que cancelaram ou expiraram este mês)
  -- Aproximação usando updated_at, já que não temos tabela de eventos de assinatura
  SELECT COUNT(*)
  INTO v_churned_month
  FROM profiles
  WHERE subscription_status IN ('canceled', 'expired')
  AND updated_at >= date_trunc('month', NOW());

  -- Cálculo MRR (Estimativa baseada nos planos ativos)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN plan_type = 'weekly' THEN 24.90 * 4
        WHEN plan_type = 'monthly' THEN 49.90
        WHEN plan_type = 'yearly' OR plan_type = 'annual' THEN 499.90 / 12
        ELSE 0
      END
    ), 0)
  INTO v_mrr
  FROM profiles
  WHERE is_premium = true AND subscription_status = 'active';

  RETURN json_build_object(
    'revenue_today', v_revenue_today,
    'revenue_month', v_revenue_month,
    'total_historical', v_total_historical,
    'refunds_month', v_refunds_month,
    'active_subscribers', v_active_subscribers,
    'churned_month', v_churned_month,
    'mrr', v_mrr
  );
END;
$$;

-- Função para buscar estornos pendentes/recentes
CREATE OR REPLACE FUNCTION get_admin_refunds()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  plan text,
  amount numeric,
  status text,
  reason text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    pm.id,
    pm.user_id,
    p.username,
    pm.plan_id::text as plan,
    pm.amount,
    pm.status,
    'Solicitado pelo usuário'::text as reason, -- Placeholder
    pm.created_at
  FROM payments pm
  LEFT JOIN profiles p ON p.id = pm.user_id
  WHERE (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  AND pm.status IN ('refunded', 'charged_back', 'pending_refund', 'dispute')
  ORDER BY pm.created_at DESC;
$$;

-- Função para dados do gráfico (Receita vs Estornos por dia)
CREATE OR REPLACE FUNCTION get_daily_financial_stats(days_limit int DEFAULT 30)
RETURNS TABLE (
  date date,
  revenue numeric,
  refunds numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    date_trunc('day', created_at)::date as date,
    SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as revenue,
    SUM(CASE WHEN status IN ('refunded', 'charged_back') THEN amount ELSE 0 END) as refunds
  FROM payments
  WHERE created_at >= (CURRENT_DATE - (days_limit || ' days')::interval)
  GROUP BY 1
  ORDER BY 1;
$$;
