
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
  clean_query := ltrim(search_query, '@');
  
  RETURN QUERY
  SELECT
    p.user_id AS id,
    p.username::text,
    p.display_name::text,
    p.display_name::text AS full_name,
    p.avatar_url::text,
    ''::text AS short_id,
    ''::text AS public_id,
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
$function$;
