-- Drop functions first
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
-- Tenta buscar de 'payments' se 'purchases' não existir
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
    pm.id,
    pm.user_id,
    p.username,
    au.email,
    pm.plan_id::text as plan,
    (pm.amount * 100)::integer as amount_cents,
    'stripe'::text as provider, -- Assumindo stripe/padrão se não tiver provider
    pm.status,
    pm.created_at
  FROM payments pm
  LEFT JOIN profiles p ON p.id = pm.user_id
  LEFT JOIN auth.users au ON au.id = pm.user_id
  WHERE (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  ORDER BY pm.created_at DESC;
$$;

-- Atualiza usuário para admin
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'xavierluisfelipe12@gmail.com');
