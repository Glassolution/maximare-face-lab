-- Fix search_users RPC to ensure it returns profile data correctly
-- This function needs to be SECURITY DEFINER to bypass RLS for searching, 
-- or we rely on the public RLS we just added. 
-- Let's make it robust and explicit about what it returns.

-- Drop function first because return type might have changed or been ambiguous
DROP FUNCTION IF EXISTS search_users(text, int, int);

CREATE OR REPLACE FUNCTION search_users(
    search_query text,
    limit_count int DEFAULT 20,
    offset_count int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    username text,
    display_name text,
    avatar_url text,
    short_id text,
    friendship_status text
) 
SECURITY DEFINER -- Use security definer to ensure we can read profiles even if RLS is tricky, but we should be careful.
SET search_path = public
AS $$
DECLARE
    current_uid uuid := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.short_id,
        CASE 
            WHEN f.status = 'accepted' THEN 'accepted'::text
            WHEN f.status = 'pending' AND f.requester_id = current_uid THEN 'pending_sent'::text
            WHEN f.status = 'pending' AND f.receiver_id = current_uid THEN 'pending_received'::text
            ELSE 'none'::text
        END as friendship_status
    FROM profiles p
    LEFT JOIN friendships f ON 
        (f.requester_id = current_uid AND f.receiver_id = p.id) OR 
        (f.receiver_id = current_uid AND f.requester_id = p.id)
    WHERE 
        p.id != current_uid AND (
            p.username ILIKE '%' || search_query || '%' OR
            p.display_name ILIKE '%' || search_query || '%' OR
            p.short_id = search_query -- Exact match for ID usually
        )
    ORDER BY 
        CASE WHEN p.short_id = search_query THEN 0 ELSE 1 END, -- Prioritize ID match
        p.username ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
