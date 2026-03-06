
-- Add short_id column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_id text UNIQUE;

-- Function to generate unique 4-digit code
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_id text;
  attempts int := 0;
BEGIN
  LOOP
    -- Generate random 4-digit number (0000-9999)
    new_id := lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE short_id = new_id) THEN
      RETURN new_id;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Fallback to 5 digits if 4-digit space is crowded
      new_id := lpad(floor(random() * 100000)::text, 5, '0');
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE short_id = new_id) THEN
        RETURN new_id;
      END IF;
    END IF;
    
    IF attempts > 200 THEN
      RAISE EXCEPTION 'Could not generate unique short_id';
    END IF;
  END LOOP;
END;
$$;

-- Assign short_id to existing profiles that don't have one
UPDATE public.profiles 
SET short_id = public.generate_short_id() 
WHERE short_id IS NULL;

-- Update handle_new_user to auto-assign short_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, short_id)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1),
    public.generate_short_id()
  );
  INSERT INTO public.user_data (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- Update search_users to also search by short_id
CREATE OR REPLACE FUNCTION public.search_users(search_query text, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0)
 RETURNS TABLE(id uuid, username text, display_name text, full_name text, avatar_url text, short_id text, public_id text, friendship_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_uid uuid := auth.uid();
  clean_query text;
BEGIN
  -- Remove @ or # prefix if present
  clean_query := ltrim(search_query, '@#');
  
  RETURN QUERY
  SELECT
    p.user_id AS id,
    p.username::text,
    p.display_name::text,
    p.display_name::text AS full_name,
    p.avatar_url::text,
    COALESCE(p.short_id, '')::text AS short_id,
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
      OR p.short_id = clean_query
    )
  ORDER BY 
    CASE WHEN p.short_id = clean_query THEN 0
         WHEN p.username ILIKE clean_query THEN 1
         WHEN p.username ILIKE clean_query || '%' THEN 2
         ELSE 3
    END,
    p.username
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;
