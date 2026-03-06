
-- Add unique constraint on username (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- Create search_users RPC
CREATE OR REPLACE FUNCTION public.search_users(
  search_query text,
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  full_name text,
  avatar_url text,
  short_id text,
  public_id text,
  friendship_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
  clean_query text;
BEGIN
  -- Remove @ prefix if present
  clean_query := ltrim(search_query, '@');
  
  RETURN QUERY
  SELECT
    p.user_id AS id,
    p.username::text,
    p.display_name::text,
    p.display_name::text AS full_name,
    p.avatar_url::text,
    p.short_id::text,
    COALESCE(p.short_id, '')::text AS public_id,
    COALESCE(
      CASE
        WHEN f.status = 'accepted' THEN 'accepted'
        WHEN f.status = 'pending' AND f.requester_id = current_uid THEN 'pending_sent'
        WHEN f.status = 'pending' AND f.addressee_id = current_uid THEN 'pending_received'
        ELSE 'none'
      END,
      'none'
    )::text AS friendship_status
  FROM public.profiles p
  LEFT JOIN public.friendships f ON (
    (f.requester_id = current_uid AND f.addressee_id = p.user_id)
    OR (f.addressee_id = current_uid AND f.requester_id = p.user_id)
  )
  WHERE p.user_id != current_uid
    AND (
      p.username ILIKE '%' || clean_query || '%'
      OR p.display_name ILIKE '%' || clean_query || '%'
    )
  ORDER BY 
    CASE WHEN p.username ILIKE clean_query THEN 0
         WHEN p.username ILIKE clean_query || '%' THEN 1
         ELSE 2
    END,
    p.username
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- send_friend_request RPC
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
  existing record;
BEGIN
  IF current_uid = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é possível adicionar a si mesmo.');
  END IF;

  -- Check if friendship already exists in either direction
  SELECT * INTO existing FROM public.friendships
  WHERE (requester_id = current_uid AND addressee_id = target_user_id)
     OR (requester_id = target_user_id AND addressee_id = current_uid);

  IF existing IS NOT NULL THEN
    IF existing.status = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Vocês já são amigos.');
    ELSIF existing.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe um pedido pendente.');
    END IF;
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (current_uid, target_user_id, 'pending')
  ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'pending', updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- accept_friend_request RPC
CREATE OR REPLACE FUNCTION public.accept_friend_request(requester_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  UPDATE public.friendships
  SET status = 'accepted', updated_at = now()
  WHERE requester_id = requester_uid AND addressee_id = current_uid AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- reject_friend_request RPC
CREATE OR REPLACE FUNCTION public.reject_friend_request(requester_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  DELETE FROM public.friendships
  WHERE requester_id = requester_uid AND addressee_id = current_uid AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- cancel_friend_request RPC
CREATE OR REPLACE FUNCTION public.cancel_friend_request(target_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  DELETE FROM public.friendships
  WHERE requester_id = current_uid AND addressee_id = target_uid AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- unfriend RPC
CREATE OR REPLACE FUNCTION public.unfriend(target_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  DELETE FROM public.friendships
  WHERE ((requester_id = current_uid AND addressee_id = target_uid)
     OR (requester_id = target_uid AND addressee_id = current_uid))
    AND status = 'accepted';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amizade não encontrada.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- block_user RPC
CREATE OR REPLACE FUNCTION public.block_user(target_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  -- Remove any existing friendship
  DELETE FROM public.friendships
  WHERE (requester_id = current_uid AND addressee_id = target_uid)
     OR (requester_id = target_uid AND addressee_id = current_uid);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- unblock_user RPC
CREATE OR REPLACE FUNCTION public.unblock_user(target_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN jsonb_build_object('success', true);
END;
$$;
