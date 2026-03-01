-- FORCE FIX: Battle Status Constraint and Data Cleanup
-- Run this to resolve "battles_status_check" violation errors

-- 1. Drop the problematic constraint
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_status_check;

-- 2. Update all battles to have valid status values
-- Normalize 'waiting' variations
UPDATE battles SET status = 'waiting' 
WHERE status IN ('waiting_for_opponent', 'matched', 'photo_submission');

-- Normalize 'running' variations
UPDATE battles SET status = 'running' 
WHERE status IN ('processing', 'reveal_loser');

-- Normalize 'finished' variations
UPDATE battles SET status = 'finished' 
WHERE status IN ('completed');

-- Fix any other unknown statuses to 'canceled'
UPDATE battles SET status = 'canceled' 
WHERE status NOT IN ('waiting', 'ready', 'running', 'finished', 'canceled', 'expired');

-- 3. Re-add the constraint with correct allowed values
ALTER TABLE battles ADD CONSTRAINT battles_status_check
CHECK (status IN (
  'waiting',
  'ready',
  'running',
  'finished',
  'canceled',
  'expired'
));

-- 4. Ensure RPC function is correct
CREATE OR REPLACE FUNCTION submit_battle_photo_urls_v3(
  p_battle_id uuid,
  p_front_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
  s_at timestamptz;
BEGIN
  -- Lock the row
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;

  IF b.id IS NULL THEN 
    RETURN json_build_object('success', false, 'error', 'Battle not found'); 
  END IF;
  
  -- Strict status check
  IF b.status NOT IN ('waiting', 'ready') THEN
    RETURN json_build_object('success', false, 'error', 'Battle not active');
  END IF;

  -- Update appropriate column
  IF auth.uid() = b.created_by THEN
    UPDATE battles SET challenger_photo_url = p_front_url WHERE id = p_battle_id;
  ELSIF auth.uid() = b.opponent_id THEN
    UPDATE battles SET opponent_photo_url = p_front_url WHERE id = p_battle_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Refresh data
  SELECT * INTO b FROM battles WHERE id = p_battle_id;

  -- Check if ready to start
  IF b.challenger_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
    s_at := now() + interval '3 seconds';
    UPDATE battles
    SET status = 'ready',
        ready_at = COALESCE(ready_at, now()),
        start_at = COALESCE(start_at, s_at)
    WHERE id = p_battle_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
