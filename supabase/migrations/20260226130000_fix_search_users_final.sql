-- Fix search_users RPC to use correct column names and logic
-- Replaces f.receiver_id with f.addressee_id
-- Adds block filtering

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
SECURITY DEFINER
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
            WHEN f.status = 'pending' AND f.addressee_id = current_uid THEN 'pending_received'::text
            ELSE 'none'::text
        END as friendship_status
    FROM profiles p
    -- Join with friendships to check status
    LEFT JOIN friendships f ON 
        (f.requester_id = current_uid AND f.addressee_id = p.id) OR 
        (f.addressee_id = current_uid AND f.requester_id = p.id)
    -- Join with blocks to exclude blocked users
    LEFT JOIN blocks b1 ON b1.blocker_id = current_uid AND b1.blocked_id = p.id
    LEFT JOIN blocks b2 ON b2.blocker_id = p.id AND b2.blocked_id = current_uid
    WHERE 
        p.id != current_uid AND -- Exclude self
        b1.id IS NULL AND       -- Exclude users I blocked
        b2.id IS NULL AND       -- Exclude users who blocked me
        (
            p.username ILIKE '%' || search_query || '%' OR
            p.display_name ILIKE '%' || search_query || '%' OR
            p.short_id = search_query -- Exact match for ID
        )
    ORDER BY 
        CASE WHEN p.short_id = search_query THEN 0 ELSE 1 END, -- Prioritize ID match
        p.username ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION search_users(text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_users(text, int, int) TO anon; -- Optional depending on app needs, usually authenticated only
