-- Remove políticas com recursão que causam erro "infinite recursion detected"
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recria sem recursão usando auth.uid() diretamente e simplificando
-- Permitir leitura pública de perfis (necessário para batalhas, busca de amigos, etc)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Permitir que usuários atualizem apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Permitir que usuários insiram seu próprio perfil (caso não exista trigger automático)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
