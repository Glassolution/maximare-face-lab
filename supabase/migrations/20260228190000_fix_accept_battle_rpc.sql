-- FIX: Update accept_battle_challenge_v2 to match 'waiting' status
-- This ensures the RPC works with the new status values ('waiting' instead of 'waiting_for_opponent')

CREATE OR REPLACE FUNCTION accept_battle_challenge_v2(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
BEGIN
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;
  
  IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  
  -- Security check
  IF b.opponent_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
  
  -- Check for valid pending status (support both new and legacy just in case, but prefer waiting)
  IF b.status NOT IN ('waiting', 'waiting_for_opponent') THEN 
    RETURN json_build_object('success', false, 'error', 'Battle is not pending'); 
  END IF;

  -- Update to 'waiting' (idempotent) and set matched_at
  UPDATE battles 
  SET status = 'waiting',
      matched_at = COALESCE(matched_at, now())
  WHERE id = p_battle_id;

  -- Log event
  INSERT INTO battle_events (battle_id, type, payload)
  VALUES (p_battle_id, 'matched', json_build_object('accepted_by', auth.uid()));

  RETURN json_build_object('success', true);
END;
$$;

-- Ensure create_battle_challenge_v2 also uses 'waiting'
CREATE OR REPLACE FUNCTION create_battle_challenge_v2(target_opponent_id uuid, battle_mode text DEFAULT 'front_lateral')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_battle_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF target_opponent_id = auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Cannot challenge yourself'); END IF;

  INSERT INTO battles (created_by, opponent_id, status, mode)
  VALUES (auth.uid(), target_opponent_id, 'waiting', battle_mode)
  RETURNING id INTO new_battle_id;

  RETURN json_build_object('success', true, 'battle_id', new_battle_id);
END;
$$;
