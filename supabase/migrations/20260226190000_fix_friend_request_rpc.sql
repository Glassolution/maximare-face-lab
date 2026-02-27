-- Fix send_friend_request RPC to avoid ON CONFLICT error with expression index
-- Instead of relying on ON CONFLICT (LEAST(...), GREATEST(...)), we will manually check and Insert/Update.

CREATE OR REPLACE FUNCTION send_friend_request(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
    existing_record RECORD;
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
    SELECT * INTO existing_record 
    FROM friendships 
    WHERE (requester_id = current_uid AND addressee_id = target_user_id)
       OR (requester_id = target_user_id AND addressee_id = current_uid);

    IF existing_record.id IS NOT NULL THEN
        -- Record exists, check status
        IF existing_record.status = 'accepted' THEN
            RETURN json_build_object('success', false, 'error', 'Already friends');
        ELSIF existing_record.status = 'pending' THEN
            RETURN json_build_object('success', false, 'error', 'Request already pending');
        ELSIF existing_record.status = 'blocked' THEN 
            RETURN json_build_object('success', false, 'error', 'Action not allowed');
        ELSE
            -- Status is 'rejected', 'canceled', or 'none'. We can reactivate it.
            UPDATE friendships 
            SET 
                status = 'pending',
                requester_id = current_uid, -- Reset who is requesting (current user is now requester)
                addressee_id = target_user_id,
                updated_at = now()
            WHERE id = existing_record.id;
            
            RETURN json_build_object('success', true);
        END IF;
    ELSE
        -- No record exists, Insert new
        INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES (current_uid, target_user_id, 'pending');
        
        RETURN json_build_object('success', true);
    END IF;
END;
$$;
