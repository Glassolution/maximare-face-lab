-- Add public_id column to profiles and migrate existing short_ids
-- This standardizes the ID system to BIGINT with a sequence

-- 1. Create Sequence
CREATE SEQUENCE IF NOT EXISTS profiles_public_id_seq START 10000;

-- 2. Add Column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_id bigint;

-- 3. Backfill Data (Preserve existing short_ids if numeric)
DO $$
BEGIN
    -- Try to cast valid numeric short_ids to public_id
    UPDATE profiles 
    SET public_id = short_id::bigint 
    WHERE public_id IS NULL 
    AND short_id ~ '^[0-9]+$';
    
    -- For any remaining nulls (non-numeric short_id or null), use sequence
    UPDATE profiles 
    SET public_id = nextval('profiles_public_id_seq') 
    WHERE public_id IS NULL;
END $$;

-- 4. Set Constraints and Defaults
ALTER TABLE profiles ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_public_id_key UNIQUE (public_id);
ALTER TABLE profiles ALTER COLUMN public_id SET DEFAULT nextval('profiles_public_id_seq');

-- 5. Sync Sequence to Max ID
SELECT setval('profiles_public_id_seq', (SELECT MAX(public_id) FROM profiles));

-- 6. Update Trigger for New Users
-- We need to ensure new users get a public_id. The DEFAULT nextval(...) handles this, 
-- but if we insert with explicit NULL, it might fail or use default depending on query.
-- Default is safer.

-- 7. Update Search RPC to use public_id
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
    public_id bigint, -- Changed from short_id to public_id (bigint)
    friendship_status text
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
        p.username,
        p.display_name,
        p.avatar_url,
        p.public_id,
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
        b1.blocker_id IS NULL AND       -- Exclude users I blocked
        b2.blocker_id IS NULL AND       -- Exclude users who blocked me
        (
            p.username ILIKE '%' || search_query || '%' OR
            p.display_name ILIKE '%' || search_query || '%' OR
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
