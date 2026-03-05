-- =============================================================================
-- SCRIPT DE VERIFICAÇÃO DO BANCO DE DADOS
-- Execute no Supabase SQL Editor para diagnosticar problemas
-- =============================================================================

-- 1. Verificar se a tabela plans existe e tem dados
SELECT 'TABELA PLANS' as check_item;
SELECT 
    id, 
    name, 
    interval, 
    price_cents,
    CASE WHEN active THEN 'ATIVO' ELSE 'INATIVO' END as status
FROM public.plans 
ORDER BY id;

-- 2. Verificar se a tabela payments existe com todas as colunas
SELECT 'TABELA PAYMENTS - ESTRUTURA' as check_item;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 3. Verificar RLS nas tabelas
SELECT 'ROW LEVEL SECURITY (RLS)' as check_item;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('plans', 'payments', 'profiles', 'webhook_events');

-- 4. Verificar políticas RLS
SELECT 'POLITICAS RLS' as check_item;
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('plans', 'payments', 'profiles')
ORDER BY tablename, policyname;

-- 5. Contar registros
SELECT 'CONTAGEM DE REGISTROS' as check_item;
SELECT 'plans' as tabela, COUNT(*) as total FROM public.plans
UNION ALL
SELECT 'payments' as tabela, COUNT(*) as total FROM public.payments
UNION ALL
SELECT 'profiles com is_premium=true' as tabela, COUNT(*) as total FROM public.profiles WHERE is_premium = true
UNION ALL
SELECT 'webhook_events' as tabela, COUNT(*) as total FROM public.webhook_events;

-- 6. Verificar funções RPC relacionadas a pagamento
SELECT 'FUNCOES RPC' as check_item;
SELECT 
    routine_name, 
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('activate_user_subscription', 'check_payment_status', 'get_user_id_by_email')
ORDER BY routine_name;

-- 7. Teste: Inserir um plano se não existir (apenas para teste)
-- DESCOMENTE AS LINHAS ABAIXO SE PRECISAR CRIAR OS PLANOS
/*
INSERT INTO public.plans (id, name, interval, price_cents) VALUES
  ('weekly', 'Semanal', 'weekly', 100),
  ('monthly', 'Mensal', 'monthly', 4990),
  ('yearly', 'Anual', 'yearly', 49990)
ON CONFLICT (id) DO NOTHING;

SELECT 'Planos criados/atualizados' as resultado;
*/

-- 8. Verificar últimos pagamentos (para debug)
SELECT 'ULTIMOS 5 PAGAMENTOS' as check_item;
SELECT 
    payment_id, 
    user_id, 
    plan_id, 
    status, 
    amount, 
    created_at
FROM public.payments 
ORDER BY created_at DESC 
LIMIT 5;

-- 9. Verificar se há pagamentos com payment_id NULL (problema conhecido)
SELECT 'PAGAMENTOS COM payment_id NULL' as check_item;
SELECT COUNT(*) as total_null_payment_ids 
FROM public.payments 
WHERE payment_id IS NULL;

-- 10. Verificar variáveis de ambiente (apenas service_role pode ver)
-- NOTA: Isso só funciona se executado com service_role
SELECT 'CONFIGURACAO' as check_item;
SELECT 
    current_user as usuario_atual,
    current_database() as banco_atual;
