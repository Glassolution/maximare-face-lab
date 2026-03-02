-- Migration completa para resolver todos os problemas do sistema de referral
-- Esta migration garante que toda a infraestrutura esteja funcionando

-- 1. MIGRATIONS NÃO APLICADAS
-- Criar tabela referral_codes se não existir
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar coluna referral_code na tabela profiles se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'referral_code'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN referral_code text;
    RAISE NOTICE 'Coluna referral_code adicionada à tabela profiles';
  ELSE
    RAISE NOTICE 'Coluna referral_code já existe na tabela profiles';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_creator_id ON public.referral_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- 2. FUNÇÃO RPC NÃO REGISTRADA
-- Remover função se existir para recriar
DROP FUNCTION IF EXISTS public.generate_referral_code(uuid, text);

-- Criar função RPC generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_creator_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_count integer;
BEGIN
  -- Verificar se o usuário é um criador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_creator_id AND is_ugc = true
  ) THEN
    RAISE EXCEPTION 'Only creators can have referral codes';
    RETURN false;
  END IF;

  -- Verificar se já existe um código para este criador
  SELECT COUNT(*) INTO existing_count
  FROM public.referral_codes 
  WHERE creator_id = p_creator_id;

  -- Se não existir, inserir novo código
  IF existing_count = 0 THEN
    INSERT INTO public.referral_codes (creator_id, code)
    VALUES (p_creator_id, p_code);
    
    -- Atualizar também a tabela profiles
    UPDATE public.profiles 
    SET referral_code = p_code
    WHERE id = p_creator_id;
    
    RAISE NOTICE 'New referral code % created for creator %', p_code, p_creator_id;
  ELSE
    -- Se já existir, atualizar o código
    UPDATE public.referral_codes 
    SET code = p_code, updated_at = now()
    WHERE creator_id = p_creator_id;
    
    -- Atualizar também a tabela profiles
    UPDATE public.profiles 
    SET referral_code = p_code
    WHERE id = p_creator_id;
    
    RAISE NOTICE 'Referral code updated to % for creator %', p_code, p_creator_id;
  END IF;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in generate_referral_code: %', SQLERRM;
    RETURN false;
END;
$$;

-- 3. PERMISSÕES RLS BLOQUEANDO
-- Habilitar RLS na tabela referral_codes
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Users can view their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can insert their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can update their own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can delete their own referral codes" ON public.referral_codes;

-- Criar políticas RLS para referral_codes
CREATE POLICY "Users can view their own referral codes"
ON public.referral_codes FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert their own referral codes"
ON public.referral_codes FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own referral codes"
ON public.referral_codes FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own referral codes"
ON public.referral_codes FOR DELETE
USING (auth.uid() = creator_id);

-- Garantir que a tabela profiles também tenha RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para permitir usuários verem o próprio referral_code
DROP POLICY IF EXISTS "Users can view own profile referral_code" ON public.profiles;
CREATE POLICY "Users can view own profile referral_code"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Política para permitir usuários atualizarem o próprio referral_code
DROP POLICY IF EXISTS "Users can update own profile referral_code" ON public.profiles;
CREATE POLICY "Users can update own profile referral_code"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 4. CACHE DO CLIENTE SUPABASE
-- Adicionar função para limpar cache se necessário
CREATE OR REPLACE FUNCTION public.clear_referral_code_cache(p_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Forçar atualização do timestamp para invalidar cache
  UPDATE public.referral_codes 
  SET updated_at = now()
  WHERE creator_id = p_creator_id;
  
  -- Também atualizar profiles
  UPDATE public.profiles 
  SET updated_at = now()
  WHERE id = p_creator_id;
END;
$$;

-- Função para verificar se a infraestrutura está funcionando
CREATE OR REPLACE FUNCTION public.check_referral_infrastructure()
RETURNS TABLE(
  table_exists boolean,
  column_exists boolean,
  function_exists boolean,
  policies_exist boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tbl_exists boolean;
  col_exists boolean;
  func_exists boolean;
  pol_exists boolean;
BEGIN
  -- Verificar se tabela existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'referral_codes' 
    AND table_schema = 'public'
  ) INTO tbl_exists;
  
  -- Verificar se coluna existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'referral_code'
    AND table_schema = 'public'
  ) INTO col_exists;
  
  -- Verificar se função existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'generate_referral_code'
    AND routine_schema = 'public'
  ) INTO func_exists;
  
  -- Verificar se políticas existem
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referral_codes'
    AND schemaname = 'public'
  ) INTO pol_exists;
  
  RETURN VALUES (tbl_exists, col_exists, func_exists, pol_exists);
END;
$$;

-- Log final para confirmação
DO $$
BEGIN
  RAISE NOTICE '=== INFRAESTRUTURA DE REFERRAL CONFIGURADA ===';
  RAISE NOTICE 'Tabela referral_codes: Criada/Verificada';
  RAISE NOTICE 'Coluna profiles.referral_code: Adicionada/Verificada';
  RAISE NOTICE 'Função RPC generate_referral_code: Criada/Registrada';
  RAISE NOTICE 'Políticas RLS: Configuradas';
  RAISE NOTICE 'Função de verificação: check_referral_infrastructure()';
  RAISE NOTICE 'Função de cache: clear_referral_code_cache()';
  RAISE NOTICE '==============================================';
END $$;
