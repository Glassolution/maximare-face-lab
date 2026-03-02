-- Script para testar e verificar a infraestrutura do sistema de referral
-- Execute este script no SQL Editor do Supabase para verificar se tudo está funcionando

-- 1. VERIFICAR SE TABELAS EXISTEM
SELECT 
  'referral_codes' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'referral_codes' 
    AND table_schema = 'public'
  ) as exists_flag
UNION ALL
SELECT 
  'profiles' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public'
  ) as exists_flag;

-- 2. VERIFICAR SE COLUNA referral_code EXISTE EM profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'referral_code'
AND table_schema = 'public';

-- 3. VERIFICAR SE FUNÇÃO RPC EXISTE
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'generate_referral_code'
AND routine_schema = 'public';

-- 4. VERIFICAR POLÍTICAS RLS DA TABELA referral_codes
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'referral_codes'
AND schemaname = 'public';

-- 5. VERIFICAR ESTRUTURA DA TABELA referral_codes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'referral_codes'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. TESTAR FUNÇÃO DE VERIFICAÇÃO
SELECT * FROM public.check_referral_infrastructure();

-- 7. VERIFICAR SE HÁ DADOS EXISTENTES
SELECT 
  COUNT(*) as total_referral_codes,
  COUNT(DISTINCT creator_id) as unique_creators
FROM public.referral_codes;

-- 8. VERIFICAR PERFIS COM referral_code
SELECT 
  COUNT(*) as profiles_with_referral_code,
  COUNT(*) as total_profiles
FROM public.profiles
WHERE referral_code IS NOT NULL;

-- 9. TESTAR INSERÇÃO MANUAL (descomente para testar)
/*
SELECT public.generate_referral_code(
  'TEST_USER_ID_HERE', -- Substitua por um ID real de usuário
  'MAX1234'
);
*/

-- 10. VERIFICAR ÚLTIMA ATUALIZAÇÃO DAS TABELAS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_stat_get_last_vacuum_time(c.oid) as last_vacuum,
  pg_stat_get_last_autovacuum_time(c.oid) as last_autovacuum
FROM pg_stat_user_tables c
WHERE tablename IN ('referral_codes', 'profiles')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
