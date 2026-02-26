-- Migration: Complete Friend System (v2)
-- Replaces old 'friends' and 'friend_requests' with a unified 'friendships' table and 'blocks' table.

-- 0. Clean up old tables (if they exist) to avoid conflicts
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP FUNCTION IF EXISTS send_friend_request CASCADE;
DROP FUNCTION IF EXISTS respond_friend_request CASCADE;
DROP FUNCTION IF EXISTS cancel_friend_request CASCADE;
DROP FUNCTION IF EXISTS remove_friend CASCADE;

-- 1. Create 'friendships' table
CREATE TABLE IF NOT EXISTS friendships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT not_self_friendship CHECK (requester_id <> addressee_id)
);

-- Ensure uniqueness per pair (A->B is same as B->A logic for uniqueness)
-- Using a unique index on LEAST/GREATEST to prevent duplicate rows for the same pair
CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship_pair 
ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status ON friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 2. Create 'blocks' table
CREATE TABLE IF NOT EXISTS blocks (
    blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT not_self_block CHECK (blocker_id <> blocked_id)
);

-- Indexes for blocks
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- 3. Update 'profiles' table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS friends_count int DEFAULT 0;

-- 4. Triggers

-- 4.1 Update updated_at on friendships
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friendships_updated_at ON friendships;
CREATE TRIGGER trigger_friendships_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_friendships_updated_at();

-- 4.2 Maintain friends_count
CREATE OR REPLACE FUNCTION update_friends_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Case: New friendship accepted
    IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') OR
       (TG_OP = 'UPDATE' AND OLD.status <> 'accepted' AND NEW.status = 'accepted') THEN
        UPDATE profiles SET friends_count = friends_count + 1 WHERE id = NEW.requester_id;
        UPDATE profiles SET friends_count = friends_count + 1 WHERE id = NEW.addressee_id;
    
    -- Case: Friendship removed or status changed from accepted to something else
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'accepted') OR
          (TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status <> 'accepted') THEN
        UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1) WHERE id = OLD.requester_id;
        UPDATE profiles SET friends_count = GREATEST(0, friends_count - 1) WHERE id = OLD.addressee_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_friends_count ON friendships;
CREATE TRIGGER trigger_update_friends_count
AFTER INSERT OR UPDATE OR DELETE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_friends_count();

-- 5. RLS Policies

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Friendships Policies
-- SELECT: Users can see rows where they are involved
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
CREATE POLICY "Users can view their own friendships"
ON friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- INSERT: Only requester can insert, and must not be blocked
DROP POLICY IF EXISTS "Users can insert friendship requests" ON friendships;
CREATE POLICY "Users can insert friendship requests"
ON friendships FOR INSERT
WITH CHECK (
    auth.uid() = requester_id 
    AND NOT EXISTS (
        SELECT 1 FROM blocks 
        WHERE (blocker_id = auth.uid() AND blocked_id = addressee_id)
           OR (blocker_id = addressee_id AND blocked_id = auth.uid())
    )
);

-- UPDATE: 
-- Requester can cancel (pending -> canceled)
-- Addressee can accept/reject (pending -> accepted/rejected)
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
CREATE POLICY "Users can update their friendships"
ON friendships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- DELETE: Only allow if explicitly needed (we prefer update status), but let's allow Unfriend to DELETE if desired.
-- Ideally unfriend should be an RPC that deletes or sets status to canceled. Let's allow delete for now via RPC mainly.
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
CREATE POLICY "Users can delete their friendships"
ON friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);


-- Blocks Policies
-- SELECT: Only blocker can see who they blocked (Privacy: blocked user shouldn't verify easily via table select, but RPC handles logic)
DROP POLICY IF EXISTS "Users can view blocks they created" ON blocks;
CREATE POLICY "Users can view blocks they created"
ON blocks FOR SELECT
USING (auth.uid() = blocker_id);

-- INSERT: Only blocker can insert
DROP POLICY IF EXISTS "Users can block others" ON blocks;
CREATE POLICY "Users can block others"
ON blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- DELETE: Only blocker can unblock
DROP POLICY IF EXISTS "Users can unblock" ON blocks;
CREATE POLICY "Users can unblock"
ON blocks FOR DELETE
USING (auth.uid() = blocker_id);


-- 6. RPC Functions (The Core Logic)

-- 6.1 Send Friend Request
CREATE OR REPLACE FUNCTION send_friend_request(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
    existing_status text;
    has_block boolean;
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
    IF target_user_id = current_uid THEN RETURN json_build_object('success', false, 'error', 'Cannot add yourself'); END IF;

    -- Check for blocks
    SELECT EXISTS(
        SELECT 1 FROM blocks 
        WHERE (blocker_id = current_uid AND blocked_id = target_user_id)
           OR (blocker_id = target_user_id AND blocked_id = current_uid)
    ) INTO has_block;
    
    IF has_block THEN RETURN json_build_object('success', false, 'error', 'Action not allowed'); END IF;

    -- Check existing friendship
    SELECT status INTO existing_status 
    FROM friendships 
    WHERE (requester_id = current_uid AND addressee_id = target_user_id)
       OR (requester_id = target_user_id AND addressee_id = current_uid);

    IF existing_status = 'accepted' THEN
        RETURN json_build_object('success', false, 'error', 'Already friends');
    ELSIF existing_status = 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Request already pending');
    ELSIF existing_status = 'blocked' THEN -- (if we used status for block, but we use table)
        RETURN json_build_object('success', false, 'error', 'Action not allowed');
    END IF;

    -- Insert or Update (Upsert logic if canceled/rejected previously)
    -- We delete previous record if exists (rejected/canceled) to clean up or update it?
    -- Better to delete old rejected/canceled and insert new pending to keep history clean or just update.
    -- Let's use INSERT ON CONFLICT UPDATE
    INSERT INTO friendships (requester_id, addressee_id, status)
    VALUES (current_uid, target_user_id, 'pending')
    ON CONFLICT (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
    DO UPDATE SET 
        status = 'pending',
        requester_id = current_uid, -- Reset who is requesting
        addressee_id = target_user_id,
        updated_at = now()
    WHERE friendships.status IN ('rejected', 'canceled'); -- Only update if previous was not active

    RETURN json_build_object('success', true);
END;
$$;

-- 6.2 Accept Friend Request
CREATE OR REPLACE FUNCTION accept_friend_request(requester_uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
    row_exists boolean;
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

    UPDATE friendships
    SET status = 'accepted', updated_at = now()
    WHERE requester_id = requester_uid AND addressee_id = current_uid AND status = 'pending'
    RETURNING true INTO row_exists;

    IF row_exists THEN
        RETURN json_build_object('success', true);
    ELSE
        RETURN json_build_object('success', false, 'error', 'No pending request found');
    END IF;
END;
$$;

-- 6.3 Reject Friend Request
CREATE OR REPLACE FUNCTION reject_friend_request(requester_uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

    UPDATE friendships
    SET status = 'rejected', updated_at = now()
    WHERE requester_id = requester_uid AND addressee_id = current_uid AND status = 'pending';

    RETURN json_build_object('success', true);
END;
$$;

-- 6.4 Cancel Friend Request
CREATE OR REPLACE FUNCTION cancel_friend_request(target_uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

    -- Delete or set to canceled? Deleting keeps table smaller. Canceled keeps history.
    -- Prompt asked for 'cancelar pedido enviado'. Let's delete it to allow fresh start easily.
    DELETE FROM friendships
    WHERE requester_id = current_uid AND addressee_id = target_uid AND status = 'pending';

    RETURN json_build_object('success', true);
END;
$$;

-- 6.5 Unfriend
CREATE OR REPLACE FUNCTION unfriend(target_uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

    DELETE FROM friendships
    WHERE ((requester_id = current_uid AND addressee_id = target_uid)
        OR (requester_id = target_uid AND addressee_id = current_uid))
      AND status = 'accepted';

    RETURN json_build_object('success', true);
END;
$$;

-- 6.6 Block User
CREATE OR REPLACE FUNCTION block_user(target_uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
    IF target_uid = current_uid THEN RETURN json_build_object('success', false, 'error', 'Cannot block yourself'); END IF;

    -- 1. Insert block
    INSERT INTO blocks (blocker_id, blocked_id)
    VALUES (current_uid, target_uid)
    ON CONFLICT DO NOTHING;

    -- 2. Remove any friendship/request
    DELETE FROM friendships
    WHERE (requester_id = current_uid AND addressee_id = target_uid)
       OR (requester_id = target_uid AND addressee_id = current_uid);

    RETURN json_build_object('success', true);
END;
$$;

-- 6.7 Unblock User
CREATE OR REPLACE FUNCTION unblock_user(target_uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

    DELETE FROM blocks
    WHERE blocker_id = current_uid AND blocked_id = target_uid;

    RETURN json_build_object('success', true);
END;
$$;

-- 6.8 Search Users (Optimized)
-- Returns profiles that match query, excluding blocks
DROP FUNCTION IF EXISTS search_users(text, int, int);
CREATE OR REPLACE FUNCTION search_users(search_query text, limit_count int DEFAULT 10, offset_count int DEFAULT 0)
RETURNS TABLE (
    id uuid,
    username text,
    display_name text,
    avatar_url text,
    short_id text,
    friendship_status text, -- 'none', 'pending_sent', 'pending_received', 'accepted', 'blocked'
    is_blocked_by_me boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
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
            WHEN b_me.blocked_id IS NOT NULL THEN 'blocked' -- I blocked them
            WHEN f.status = 'accepted' THEN 'accepted'
            WHEN f.status = 'pending' AND f.requester_id = current_uid THEN 'pending_sent'
            WHEN f.status = 'pending' AND f.addressee_id = current_uid THEN 'pending_received'
            ELSE 'none'
        END as friendship_status,
        (b_me.blocked_id IS NOT NULL) as is_blocked_by_me
    FROM profiles p
    -- Join with friendship status
    LEFT JOIN friendships f ON 
        (f.requester_id = current_uid AND f.addressee_id = p.id) OR 
        (f.addressee_id = current_uid AND f.requester_id = p.id)
    -- Join with blocks (I blocked them)
    LEFT JOIN blocks b_me ON b_me.blocker_id = current_uid AND b_me.blocked_id = p.id
    -- Join with blocks (They blocked me) - to filter out
    LEFT JOIN blocks b_them ON b_them.blocker_id = p.id AND b_them.blocked_id = current_uid
    WHERE 
        p.id <> current_uid
        AND b_them.blocker_id IS NULL -- Don't show users who blocked me
        AND (
            p.username ILIKE '%' || search_query || '%' OR
            p.display_name ILIKE '%' || search_query || '%' OR
            p.short_id = search_query -- Exact match for ID
        )
    ORDER BY 
        CASE WHEN p.username ILIKE search_query THEN 0 ELSE 1 END, -- Exact matches first
        p.username
    LIMIT limit_count OFFSET offset_count;
END;
$$;
