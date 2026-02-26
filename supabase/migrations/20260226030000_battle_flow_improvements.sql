-- Migration: Battle Flow Improvements
-- Adds 'reveal_loser' status and 'result_ready_at' column.
-- Updates mock AI function to use the new flow.

-- 1. Add column
ALTER TABLE battles ADD COLUMN IF NOT EXISTS result_ready_at timestamptz;

-- 2. Update Status Constraint
-- We need to drop the old check constraint and add a new one including 'reveal_loser'
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_status_check;

ALTER TABLE battles ADD CONSTRAINT battles_status_check 
CHECK (status IN (
    'waiting_for_opponent', 
    'matched', 
    'photo_submission', 
    'processing', 
    'reveal_loser', -- New status
    'completed', 
    'canceled', 
    'expired'
));

-- 3. Update mock_process_battle_result to use 'reveal_loser' instead of 'completed'
CREATE OR REPLACE FUNCTION mock_process_battle_result(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    b battles%ROWTYPE;
    s1 battle_submissions%ROWTYPE; -- Challenger
    s2 battle_submissions%ROWTYPE; -- Opponent
    score1 numeric;
    score2 numeric;
    winner uuid;
    loser uuid;
    w_score numeric;
    l_score numeric;
BEGIN
    SELECT * INTO b FROM battles WHERE id = p_battle_id;
    -- Allow processing if it's already processing or if we want to re-run (idempotency)
    -- But strict check:
    IF b.status <> 'processing' AND b.status <> 'reveal_loser' THEN 
        RETURN json_build_object('success', false, 'error', 'Battle not ready for processing'); 
    END IF;

    -- If already has result, just return success (idempotency)
    IF b.status = 'reveal_loser' THEN
        RETURN json_build_object('success', true, 'message', 'Already processed');
    END IF;

    SELECT * INTO s1 FROM battle_submissions WHERE battle_id = p_battle_id AND user_id = b.created_by;
    SELECT * INTO s2 FROM battle_submissions WHERE battle_id = p_battle_id AND user_id = b.opponent_id;

    -- Generate random scores (simulating AI)
    -- Ensure they are not equal for this mock
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

    -- Save Result
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

    -- Update Battle Status to 'reveal_loser' (Client will handle animation then move to completed view)
    UPDATE battles 
    SET status = 'reveal_loser', 
        result_ready_at = now() 
    WHERE id = p_battle_id;

    RETURN json_build_object('success', true);
END;
$$;
