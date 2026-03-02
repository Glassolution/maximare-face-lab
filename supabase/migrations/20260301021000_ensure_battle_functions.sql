-- Ensure battle functions exist and are up-to-date
-- Function: ensure_battle_progress_v3
CREATE OR REPLACE FUNCTION ensure_battle_progress_v3(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
  res battle_results%ROWTYPE;
  new_status text;
  new_ready_at timestamptz;
  new_start_at timestamptz;
  new_running_at timestamptz;
  new_finished_at timestamptz;
  new_result_ready_at timestamptz;
  do_update boolean := false;
BEGIN
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;
  IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  IF b.created_by <> auth.uid() AND b.opponent_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  new_status := b.status;
  new_ready_at := b.ready_at;
  new_start_at := b.start_at;
  new_running_at := b.running_at;
  new_finished_at := b.finished_at;
  new_result_ready_at := b.result_ready_at;

  IF b.status IN ('canceled', 'expired') THEN
    RETURN json_build_object('success', true, 'status', b.status);
  END IF;

  IF new_status = 'waiting' AND b.challenger_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
    new_status := 'ready';
    new_ready_at := COALESCE(new_ready_at, now());
    new_start_at := COALESCE(new_start_at, now() + interval '3 seconds');
    do_update := true;
  END IF;

  IF new_status = 'ready' AND b.challenger_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
    IF new_start_at IS NULL THEN
      new_start_at := now() + interval '3 seconds';
      do_update := true;
    END IF;
    IF now() >= new_start_at THEN
      new_status := 'running';
      new_running_at := COALESCE(new_running_at, now());
      do_update := true;
      INSERT INTO battle_events (battle_id, type, payload)
      VALUES (p_battle_id, 'running', json_build_object('at', now()));
    END IF;
  END IF;

  IF new_status = 'running' THEN
    SELECT * INTO res FROM battle_results WHERE battle_id = p_battle_id;
    IF res.battle_id IS NOT NULL THEN
      new_status := 'finished';
      new_finished_at := COALESCE(new_finished_at, now());
      new_result_ready_at := COALESCE(new_result_ready_at, now());
      do_update := true;
    ELSE
      IF new_start_at IS NOT NULL AND now() >= (new_start_at + interval '9 seconds') THEN
        PERFORM mock_process_battle_result(p_battle_id);
      END IF;
    END IF;
  END IF;

  IF do_update THEN
    UPDATE battles
    SET status = new_status,
        ready_at = new_ready_at,
        start_at = new_start_at,
        running_at = new_running_at,
        finished_at = new_finished_at,
        result_ready_at = new_result_ready_at
    WHERE id = p_battle_id;
    SELECT * INTO b FROM battles WHERE id = p_battle_id;
  END IF;

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

-- Function: mock_process_battle_result
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
