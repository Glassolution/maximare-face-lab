-- Update search_users to return all required fields and handle fallbacks

DROP FUNCTION IF EXISTS search_users(text, int, int);

CREATE OR REPLACE FUNCTION search_users(
    search_query text,
    limit_count int DEFAULT 20,
    offset_count int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    short_id text,
    username text,
    full_name text,
    display_name text,
    avatar_url text,
    public_id bigint,
    relationship_status text -- standardized name from 'friendship_status'
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid uuid := auth.uid();
    search_num bigint;
BEGIN
    -- Try to parse search_query as number for ID search
    BEGIN
        search_num := search_query::bigint;
    EXCEPTION WHEN OTHERS THEN
        search_num := NULL;
    END;

    RETURN QUERY
    SELECT 
        p.id,
        p.short_id,
        p.username,
        -- Fetch full_name from metadata if not in columns, but assuming column exists or we select null
        -- Checking schema, we don't have full_name column in profiles usually, it's in metadata.
        -- But let's check if the user asked for it. 
        -- "Tabela public.profiles tem colunas: ... full_name ..." 
        -- If it exists, we select it. If not, we cast null.
        -- SAFEST: Select explicit columns we know exist. 
        -- If full_name column exists in your schema, uncomment next line. 
        -- Otherwise, we can extract from raw_user_meta_data if we join auth.users, but we can't join auth.users easily here due to permissions.
        -- Let's assume full_name is NOT in profiles table based on standard Supabase starter, unless added.
        -- User said: "Tabela public.profiles tem colunas: ... full_name ..." -> So we assume it exists.
        -- We will use a safe selection:
        p.full_name, 
        p.display_name,
        p.avatar_url,
        p.public_id,
        CASE 
            WHEN f.status = 'accepted' THEN 'accepted'::text
            WHEN f.status = 'pending' AND f.requester_id = current_uid THEN 'pending_sent'::text
            WHEN f.status = 'pending' AND f.addressee_id = current_uid THEN 'pending_received'::text
            ELSE 'none'::text
        END as relationship_status
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
        b1.blocker_id IS NULL AND       -- Exclude users I blocked
        b2.blocker_id IS NULL AND       -- Exclude users who blocked me
        (
            p.username ILIKE '%' || search_query || '%' OR
            p.display_name ILIKE '%' || search_query || '%' OR
            p.full_name ILIKE '%' || search_query || '%' OR
            (search_num IS NOT NULL AND p.public_id = search_num) -- Exact match for Public ID
        )
    ORDER BY 
        CASE WHEN (search_num IS NOT NULL AND p.public_id = search_num) THEN 0 ELSE 1 END, -- Prioritize ID match
        p.username ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION search_users(text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_users(text, int, int) TO anon;
