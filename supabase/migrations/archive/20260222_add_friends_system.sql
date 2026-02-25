-- Migration: Add Friends System

-- 1. Alter profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS visibility_score text DEFAULT 'friends',
ADD COLUMN IF NOT EXISTS allow_friend_requests text DEFAULT 'public';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_visibility_score') THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT check_visibility_score CHECK (visibility_score IN ('public', 'friends', 'private'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_allow_friend_requests') THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT check_allow_friend_requests CHECK (allow_friend_requests IN ('public', 'username_only', 'none'));
    END IF;
END $$;

-- 2. Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_friend_request UNIQUE (requester_id, addressee_id),
    CONSTRAINT not_self_request CHECK (requester_id <> addressee_id)
);

-- 3. Create friends table
CREATE TABLE IF NOT EXISTS friends (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT not_self_friend CHECK (user_id <> friend_id)
);

-- 4. Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- friend_requests
DROP POLICY IF EXISTS "Users can view their own sent or received requests" ON friend_requests;
CREATE POLICY "Users can view their own sent or received requests"
    ON friend_requests FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can insert requests where they are the requester" ON friend_requests;
CREATE POLICY "Users can insert requests where they are the requester"
    ON friend_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update requests involved in" ON friend_requests;
CREATE POLICY "Users can update requests involved in"
    ON friend_requests FOR UPDATE
    USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

-- friends
DROP POLICY IF EXISTS "Users can view their own friends" ON friends;
CREATE POLICY "Users can view their own friends"
    ON friends FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own friend connections" ON friends;
CREATE POLICY "Users can delete their own friend connections"
    ON friends FOR DELETE
    USING (auth.uid() = user_id);

-- 6. RPC Functions

-- 1. Send Friend Request
CREATE OR REPLACE FUNCTION send_friend_request(target_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_uid uuid;
    target_allow_requests text;
    existing_request_id uuid;
    existing_status text;
    is_already_friend boolean;
BEGIN
    -- Get target user ID and settings
    SELECT user_id, allow_friend_requests INTO target_uid, target_allow_requests
    FROM profiles
    WHERE username = target_username;

    IF target_uid IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF target_uid = auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Cannot send request to yourself');
    END IF;

    -- Check privacy settings
    IF target_allow_requests = 'none' THEN
        RETURN json_build_object('success', false, 'error', 'User does not accept friend requests');
    END IF;

    -- Check if already friends
    SELECT EXISTS(SELECT 1 FROM friends WHERE user_id = auth.uid() AND friend_id = target_uid) INTO is_already_friend;
    IF is_already_friend THEN
        RETURN json_build_object('success', false, 'error', 'Already friends');
    END IF;

    -- Check for existing request (in either direction)
    SELECT id, status INTO existing_request_id, existing_status
    FROM friend_requests
    WHERE (requester_id = auth.uid() AND addressee_id = target_uid)
       OR (requester_id = target_uid AND addressee_id = auth.uid())
    ORDER BY created_at DESC
    LIMIT 1;

    IF existing_request_id IS NOT NULL THEN
        IF existing_status = 'pending' THEN
             RETURN json_build_object('success', false, 'error', 'Pending request already exists');
        ELSIF existing_status = 'accepted' THEN
             RETURN json_build_object('success', false, 'error', 'Already friends');
        END IF;
    END IF;

    -- Insert new request
    INSERT INTO friend_requests (requester_id, addressee_id, status)
    VALUES (auth.uid(), target_uid, 'pending');

    RETURN json_build_object('success', true);
END;
$$;

-- 2. Respond to Friend Request
CREATE OR REPLACE FUNCTION respond_friend_request(request_id uuid, action text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req_record record;
BEGIN
    IF action NOT IN ('accepted', 'rejected') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid action');
    END IF;

    SELECT * INTO req_record FROM friend_requests WHERE id = request_id;

    IF req_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF req_record.addressee_id <> auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    IF req_record.status <> 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Request is not pending');
    END IF;

    -- Update request status
    UPDATE friend_requests
    SET status = action, updated_at = now()
    WHERE id = request_id;

    -- If accepted, create friend connections
    IF action = 'accepted' THEN
        -- Check if friend connection already exists to avoid unique violation
        IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = req_record.requester_id AND friend_id = req_record.addressee_id) THEN
             INSERT INTO friends (user_id, friend_id) VALUES (req_record.requester_id, req_record.addressee_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = req_record.addressee_id AND friend_id = req_record.requester_id) THEN
             INSERT INTO friends (user_id, friend_id) VALUES (req_record.addressee_id, req_record.requester_id);
        END IF;
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- 3. Cancel Friend Request
CREATE OR REPLACE FUNCTION cancel_friend_request(request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req_record record;
BEGIN
    SELECT * INTO req_record FROM friend_requests WHERE id = request_id;

    IF req_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF req_record.requester_id <> auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    IF req_record.status <> 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Request is not pending');
    END IF;

    UPDATE friend_requests
    SET status = 'canceled', updated_at = now()
    WHERE id = request_id;

    RETURN json_build_object('success', true);
END;
$$;

-- 4. Remove Friend
CREATE OR REPLACE FUNCTION remove_friend(target_friend_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete both directions
    DELETE FROM friends 
    WHERE (user_id = auth.uid() AND friend_id = target_friend_id)
       OR (user_id = target_friend_id AND friend_id = auth.uid());
       
    RETURN json_build_object('success', true);
END;
$$;
