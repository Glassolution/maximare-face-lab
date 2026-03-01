-- Battle progress hardening (no realtime dependency)

ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS running_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('battle-photos', 'battle-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

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
  IF b.status IN ('finished', 'canceled', 'expired') THEN
    RETURN json_build_object('success', true, 'status', b.status);
  END IF;

  IF b.status = 'ready' THEN
    IF b.challenger_photo_url IS NULL OR b.opponent_photo_url IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Missing photos');
    END IF;
    IF b.start_at IS NULL OR now() < b.start_at THEN
      RETURN json_build_object('success', true, 'status', b.status);
    END IF;

    UPDATE battles
    SET status = 'running',
        running_at = COALESCE(running_at, now())
    WHERE id = p_battle_id;

    INSERT INTO battle_events (battle_id, type, payload)
    VALUES (p_battle_id, 'running', json_build_object('at', now()));
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION ensure_battle_progress_v3(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
  res battle_results%ROWTYPE;
  s_at timestamptz;
  should_finish boolean;
BEGIN
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  IF b.created_by <> auth.uid() AND b.opponent_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF b.status IN ('canceled', 'expired') THEN
    RETURN json_build_object('success', true, 'status', b.status);
  END IF;

  IF b.status = 'waiting' THEN
    IF b.challenger_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
      s_at := COALESCE(b.start_at, now() + interval '3 seconds');
      UPDATE battles
      SET status = 'ready',
          ready_at = COALESCE(ready_at, now()),
          start_at = s_at
      WHERE id = p_battle_id;
    END IF;
  END IF;

  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;

  IF b.status = 'ready' THEN
    IF b.challenger_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
      IF b.start_at IS NULL THEN
        UPDATE battles SET start_at = now() + interval '3 seconds' WHERE id = p_battle_id;
        SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;
      END IF;
      IF now() >= b.start_at THEN
        UPDATE battles
        SET status = 'running',
            running_at = COALESCE(running_at, now())
        WHERE id = p_battle_id;
        INSERT INTO battle_events (battle_id, type, payload)
        VALUES (p_battle_id, 'running', json_build_object('at', now()));
      END IF;
    END IF;
  END IF;

  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;

  IF b.status = 'running' THEN
    SELECT * INTO res FROM battle_results WHERE battle_id = p_battle_id;
    IF res.battle_id IS NOT NULL THEN
      UPDATE battles
      SET status = 'finished',
          finished_at = COALESCE(finished_at, now()),
          result_ready_at = COALESCE(result_ready_at, now())
      WHERE id = p_battle_id;
    ELSE
      should_finish := b.start_at IS NOT NULL AND now() >= (b.start_at + interval '9 seconds');
      IF should_finish THEN
        PERFORM mock_process_battle_result(p_battle_id);
      END IF;
    END IF;
  END IF;

  SELECT * INTO b FROM battles WHERE id = p_battle_id;

  RETURN json_build_object(
    'success', true,
    'status', b.status,
    'ready_at', b.ready_at,
    'start_at', b.start_at,
    'running_at', b.running_at,
    'finished_at', b.finished_at,
    'result_ready_at', b.result_ready_at
  );
END;
$$;
