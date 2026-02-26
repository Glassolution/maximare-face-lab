-- Migration: Fix Ambiguous Column Reference in submit_battle_move
-- Renames parameter 'analysis_id' to 'p_analysis_id' to avoid conflict with table column 'analysis_id' (if it exists in join) or general ambiguity.

-- Drop the function first because we are changing parameter names
DROP FUNCTION IF EXISTS submit_battle_move(uuid, uuid);

CREATE OR REPLACE FUNCTION submit_battle_move(battle_id uuid, p_analysis_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    b battles%ROWTYPE;
    a analysis_history%ROWTYPE;
    is_challenger boolean;
    analysis_score numeric;
BEGIN
    -- 1. Get Battle
    SELECT * INTO b FROM battles WHERE id = battle_id;
    
    IF b.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Battle not found');
    END IF;

    -- 2. Verify User & Role
    IF b.challenger_id = auth.uid() THEN
        is_challenger := true;
    ELSIF b.opponent_id = auth.uid() THEN
        is_challenger := false;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- 3. Verify Battle Status
    IF b.status NOT IN ('waiting_upload', 'analyzing') THEN
        RETURN json_build_object('success', false, 'error', 'Battle is not accepting moves');
    END IF;

    -- 4. Get Analysis (Using explicit parameter name p_analysis_id)
    SELECT * INTO a FROM analysis_history WHERE id = p_analysis_id;
    
    IF a.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Analysis not found');
    END IF;

    IF a.user_id <> auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Analysis does not belong to you');
    END IF;

    -- 5. Extract Score
    analysis_score := a.score;
    
    IF analysis_score IS NULL THEN
         RETURN json_build_object('success', false, 'error', 'Analysis score is invalid');
    END IF;

    -- 6. Update Battle with Score and Analysis ID
    IF is_challenger THEN
        IF b.challenger_analysis_id IS NOT NULL THEN
             RETURN json_build_object('success', false, 'error', 'You have already submitted');
        END IF;
        
        UPDATE battles 
        SET challenger_score = analysis_score,
            challenger_analysis_id = p_analysis_id, -- Explicit use of parameter
            updated_at = now()
        WHERE id = battle_id;
    ELSE
        IF b.opponent_analysis_id IS NOT NULL THEN
             RETURN json_build_object('success', false, 'error', 'You have already submitted');
        END IF;

        UPDATE battles 
        SET opponent_score = analysis_score,
            opponent_analysis_id = p_analysis_id, -- Explicit use of parameter
            updated_at = now()
        WHERE id = battle_id;
    END IF;

    -- 7. Check if both are ready to determine winner
    SELECT * INTO b FROM battles WHERE id = battle_id;
    
    IF b.challenger_score IS NOT NULL AND b.opponent_score IS NOT NULL THEN
        -- Both have scores, determine winner immediately
        PERFORM determine_battle_winner_internal(battle_id);
    ELSE
        -- Update status to analyzing if it was waiting_upload (one person submitted)
        UPDATE battles SET status = 'analyzing' WHERE id = battle_id AND status = 'waiting_upload';
    END IF;

    RETURN json_build_object('success', true);
END;
$$;
