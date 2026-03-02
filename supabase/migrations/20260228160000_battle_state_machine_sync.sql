-- Migration: Battle Sync + Stable Photos (State Machine)
-- Adds stable photo urls and server-timestamp based synchronization to battles.

-- 1) Add columns required for stable rendering + synchronization
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS creator_photo_url text,
  ADD COLUMN IF NOT EXISTS opponent_photo_url text,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 2) Replace status check to use v3 state machine
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_status_check;
ALTER TABLE battles ADD CONSTRAINT battles_status_check
CHECK (status IN (
  'waiting',
  'ready',
  'running',
  'finished',
  'canceled',
  'expired'
));

-- 3) Normalize existing rows (best-effort)
UPDATE battles
SET status = CASE
  WHEN status IN ('waiting_for_opponent', 'matched', 'photo_submission') THEN 'waiting'
  WHEN status IN ('processing', 'reveal_loser') THEN 'running'
  WHEN status IN ('completed') THEN 'finished'
  WHEN status IN ('canceled', 'expired') THEN status
  ELSE 'waiting'
END
WHERE status NOT IN ('waiting', 'ready', 'running', 'finished', 'canceled', 'expired');

-- 4) Ensure battle-photos bucket is public so stored URLs are stable and viewable by both participants.
-- If you need stricter privacy later, swap to signed URLs via edge function and store them in battle row.
INSERT INTO storage.buckets (id, name, public)
VALUES ('battle-photos', 'battle-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5) Helper: server time for client-side offset
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT now();
$$;

-- 6) Update RPCs to new statuses
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
  IF b.opponent_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
  IF b.status <> 'waiting' THEN RETURN json_build_object('success', false, 'error', 'Battle is not pending'); END IF;

  UPDATE battles
  SET matched_at = COALESCE(matched_at, now())
  WHERE id = p_battle_id;

  INSERT INTO battle_events (battle_id, type, payload)
  VALUES (p_battle_id, 'matched', json_build_object('accepted_by', auth.uid()));

  RETURN json_build_object('success', true);
END;
$$;

-- Submit photo URLs (stable) and move to ready/running schedule when both are present.
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
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;

  IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  IF b.created_by <> auth.uid() AND b.opponent_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF b.status IN ('finished', 'canceled', 'expired') THEN
    RETURN json_build_object('success', false, 'error', 'Battle not active');
  END IF;

  IF auth.uid() = b.created_by THEN
    UPDATE battles SET creator_photo_url = p_front_url WHERE id = p_battle_id;
  ELSE
    UPDATE battles SET opponent_photo_url = p_front_url WHERE id = p_battle_id;
  END IF;

  SELECT * INTO b FROM battles WHERE id = p_battle_id;

  -- If both photos exist, schedule start
  IF b.creator_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
    s_at := now() + interval '3 seconds';
    UPDATE battles
    SET status = 'ready',
        ready_at = COALESCE(ready_at, now()),
        start_at = COALESCE(start_at, s_at)
    WHERE id = p_battle_id;

    INSERT INTO battle_events (battle_id, type, payload)
    VALUES (p_battle_id, 'ready', json_build_object('start_at', (SELECT start_at FROM battles WHERE id = p_battle_id)));
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Idempotent transition ready -> running
CREATE OR REPLACE FUNCTION mark_battle_running_v3(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
BEGIN
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  IF b.created_by <> auth.uid() AND b.opponent_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF b.status = 'ready' THEN
    UPDATE battles SET status = 'running' WHERE id = p_battle_id;
    INSERT INTO battle_events (battle_id, type, payload) VALUES (p_battle_id, 'running', json_build_object('at', now()));
  END IF;
  RETURN json_build_object('success', true);
END;
$$;

-- Update mock processor to finish battle (keeps battle_results table)
CREATE OR REPLACE FUNCTION mock_process_battle_result(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
  score1 numeric;
  score2 numeric;
  winner uuid;
  loser uuid;
  w_score numeric;
  l_score numeric;
BEGIN
  SELECT * INTO b FROM battles WHERE id = p_battle_id;
  IF b.status <> 'running' THEN
    RETURN json_build_object('success', false, 'error', 'Battle not ready for processing');
  END IF;

  score1 := floor(random() * (99 - 70 + 1) + 70)::numeric + (floor(random() * 10) / 10.0);
  score2 := floor(random() * (99 - 70 + 1) + 70)::numeric + (floor(random() * 10) / 10.0);
  IF score1 = score2 THEN score1 := score1 + 0.1; END IF;

  IF score1 > score2 THEN
    winner := b.created_by;
    loser := b.opponent_id;
    w_score := score1;
    l_score := score2;
  ELSE
    winner := b.opponent_id;
    loser := b.created_by;
    w_score := score2;
    l_score := score1;
  END IF;

  INSERT INTO battle_results (battle_id, winner_id, loser_id, winner_score, loser_score, summary)
  VALUES (
    p_battle_id,
    winner,
    loser,
    w_score,
    l_score,
    json_build_object(
      'winner_pros', json_build_array('Simetria mandibular', 'Proporção áurea', 'Definição zigomática'),
      'loser_cons', json_build_array('Assimetria leve', 'Recuo mandibular', 'Exposição escleral')
    )
  )
  ON CONFLICT (battle_id) DO UPDATE SET
    winner_id = EXCLUDED.winner_id,
    loser_id = EXCLUDED.loser_id,
    winner_score = EXCLUDED.winner_score,
    loser_score = EXCLUDED.loser_score,
    summary = EXCLUDED.summary;

  UPDATE battles
  SET status = 'finished',
      finished_at = now(),
      result_ready_at = COALESCE(result_ready_at, now())
  WHERE id = p_battle_id;

  RETURN json_build_object('success', true);
END;
$$;
