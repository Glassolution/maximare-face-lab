-- Drop functions first to allow return type changes
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS get_admin_purchases();

-- Função para listar usuários (admin only)
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  is_premium boolean,
  plan_type text,
  is_ugc boolean,
  banned boolean,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.username,
    au.email,
    p.is_premium,
    p.plan_type,
    p.is_ugc,
    p.banned,
    p.display_name,
    p.avatar_url,
    au.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  ORDER BY au.created_at DESC;
$$;

-- Função para listar compras (admin only)
CREATE OR REPLACE FUNCTION get_admin_purchases()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  email text,
  plan text,
  amount_cents integer,
  provider text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    pu.id,
    pu.user_id,
    p.username,
    au.email,
    pu.plan,
    pu.amount_cents,
    pu.provider,
    pu.status,
    pu.created_at
  FROM purchases pu
  LEFT JOIN profiles p ON p.id = pu.user_id
  LEFT JOIN auth.users au ON au.id = pu.user_id
  WHERE (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  ORDER BY pu.created_at DESC;
$$;

-- Atualiza usuário para admin (conforme solicitado)
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com');
