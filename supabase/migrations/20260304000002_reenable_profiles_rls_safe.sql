-- =============================================================================
-- MIGRATION: Reabilitar RLS em profiles com políticas seguras (sem recursão)
-- =============================================================================
-- Este migration reverte o estado de emergência (RLS desabilitado) e implementa
-- políticas simples que NÃO causam recursão infinita.
-- 
-- ESTRATÉGIA: Usar apenas auth.uid() nas condições (função da camada de auth,
-- não consulta a tabela profiles, evitando recursão)
-- =============================================================================

-- 1. Remover políticas existentes (cleanup)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas simples e seguras

-- SELECT: Perfis são públicos para leitura (necessário para features sociais)
-- Não causa recursão pois USING(true) não consulta nenhuma tabela
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT
  USING (true);

-- INSERT: Usuário só pode criar seu próprio perfil
-- auth.uid() é uma função do Supabase Auth, não consulta profiles
CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Usuário só pode atualizar seu próprio perfil
-- auth.uid() é uma função do Supabase Auth, não consulta profiles
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Não permitido via API (apenas service_role pode deletar)
-- Sem política = negado por padrão quando RLS está habilitado

-- 4. Garantir que service_role bypass RLS (padrão do Supabase, mas explicitando)
-- Service role já bypassa RLS por padrão, não precisa de política especial

-- 5. Comentário para documentação
COMMENT ON TABLE profiles IS 'Perfis de usuário com RLS habilitado. SELECT público, INSERT/UPDATE restrito ao próprio usuário.';
