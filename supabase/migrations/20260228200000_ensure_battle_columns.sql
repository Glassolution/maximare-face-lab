-- CRITICAL FIX: Ensure battle columns exist and RPC is consistent
-- This migration fixes the "column ready_at does not exist" error

-- 1. Idempotently add missing columns
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ready_at timestamptz;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS start_at timestamptz;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_photo_url text;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_photo_url text;

-- 2. Add indexes for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_battles_ready_at ON battles(ready_at);

-- 3. Re-apply the RPC to ensure it references the now-guaranteed columns
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
