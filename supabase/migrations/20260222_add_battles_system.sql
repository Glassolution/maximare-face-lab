-- Migration: Add Battles System

-- 1. Create battles table
CREATE TABLE IF NOT EXISTS battles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'waiting_upload', 'analyzing', 'finished', 'canceled')),
    
    challenger_photo_url text,
    opponent_photo_url text,
    
    challenger_score numeric, -- GER Score (0-99)
    opponent_score numeric,
    
    challenger_analysis_id uuid REFERENCES analysis_history(id),
    opponent_analysis_id uuid REFERENCES analysis_history(id),

    winner_id uuid REFERENCES auth.users(id),
    loser_id uuid REFERENCES auth.users(id),
    
    win_reason text, -- "Venceu por maior simetria e harmonia facial"
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    finished_at timestamptz,

    CONSTRAINT not_self_battle CHECK (challenger_id <> opponent_id)
);

-- Index for faster queries
CREATE INDEX idx_battles_users ON battles(challenger_id, opponent_id);
CREATE INDEX idx_battles_status ON battles(status);

-- 2. Enable RLS
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can view battles they are part of
CREATE POLICY "Users can view their own battles"
    ON battles FOR SELECT
    USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Users can insert battles where they are the challenger
CREATE POLICY "Users can create battles"
    ON battles FOR INSERT
    WITH CHECK (auth.uid() = challenger_id);

-- Users can update battles they are part of (via RPC mostly, but allow status updates if needed)
CREATE POLICY "Users can update their own battles"
    ON battles FOR UPDATE
    USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 4. RPC Functions

-- Create Battle Challenge
CREATE OR REPLACE FUNCTION create_battle_challenge(target_opponent_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_friend boolean;
    existing_battle_id uuid;
BEGIN
    -- Check if opponent exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_opponent_id) THEN
        RETURN json_build_object('success', false, 'error', 'Opponent not found');
    END IF;

    -- Check if not self
    IF target_opponent_id = auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Cannot battle yourself');
    END IF;

    -- Check if friends (optional but recommended)
    SELECT EXISTS(SELECT 1 FROM friends WHERE user_id = auth.uid() AND friend_id = target_opponent_id) INTO is_friend;
    IF NOT is_friend THEN
        RETURN json_build_object('success', false, 'error', 'You can only battle friends');
    END IF;

    -- Check for existing pending/active battle
    SELECT id INTO existing_battle_id
    FROM battles
    WHERE (challenger_id = auth.uid() AND opponent_id = target_opponent_id AND status NOT IN ('finished', 'rejected', 'canceled'))
       OR (challenger_id = target_opponent_id AND opponent_id = auth.uid() AND status NOT IN ('finished', 'rejected', 'canceled'))
    LIMIT 1;

    IF existing_battle_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'An active battle already exists');
    END IF;

    -- Create Battle
    INSERT INTO battles (challenger_id, opponent_id, status)
    VALUES (auth.uid(), target_opponent_id, 'pending');

    RETURN json_build_object('success', true);
END;
$$;

-- Respond to Battle (Accept/Reject)
CREATE OR REPLACE FUNCTION respond_to_battle(battle_id uuid, action text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    battle_record battles%ROWTYPE;
BEGIN
    SELECT * INTO battle_record FROM battles WHERE id = battle_id;

    IF battle_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Battle not found');
    END IF;

    -- Only opponent can respond
    IF battle_record.opponent_id <> auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    IF battle_record.status <> 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Battle is not pending');
    END IF;

    IF action = 'accepted' THEN
        UPDATE battles 
        SET status = 'waiting_upload', updated_at = now() 
        WHERE id = battle_id;
    ELSIF action = 'rejected' THEN
        UPDATE battles 
        SET status = 'rejected', updated_at = now(), finished_at = now() 
        WHERE id = battle_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid action');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- Determine Winner Logic (Internal Helper)
CREATE OR REPLACE FUNCTION determine_battle_winner_internal(battle_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    b battles%ROWTYPE;
    winner uuid;
    loser uuid;
    reason text;
    score_diff numeric;
BEGIN
    SELECT * INTO b FROM battles WHERE id = battle_id;
    
    IF b.challenger_score > b.opponent_score THEN
        winner := b.challenger_id;
        loser := b.opponent_id;
        score_diff := b.challenger_score - b.opponent_score;
    ELSIF b.opponent_score > b.challenger_score THEN
        winner := b.opponent_id;
        loser := b.challenger_id;
        score_diff := b.opponent_score - b.challenger_score;
    ELSE
        -- Draw: Favor the challenger? Or random? Or Draw?
        -- For now, let's say Draw is handled by null winner or logic
        -- But requirement says "Declara vencedor automaticamente".
        -- Tie-breaker: Maybe secondary score (decimals)?
        -- If still tie, coin flip.
        IF random() > 0.5 THEN
            winner := b.challenger_id;
            loser := b.opponent_id;
        ELSE
            winner := b.opponent_id;
            loser := b.challenger_id;
        END IF;
        score_diff := 0;
        reason := 'Empate técnico (decisão por sorteio)';
    END IF;

    IF reason IS NULL THEN
        IF score_diff > 10 THEN
             reason := 'Vitória esmagadora por superioridade estética evidente.';
        ELSIF score_diff > 5 THEN
             reason := 'Venceu por melhor harmonia facial e simetria.';
        ELSE
             reason := 'Vitória apertada nos detalhes técnicos.';
        END IF;
    END IF;

    UPDATE battles
    SET status = 'finished',
        winner_id = winner,
        loser_id = loser,
        win_reason = reason,
        finished_at = now(),
        updated_at = now()
    WHERE id = battle_id;
END;
$$;

-- Submit Battle Move (After Analysis)
CREATE OR REPLACE FUNCTION submit_battle_move(battle_id uuid, analysis_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    b battles%ROWTYPE;
    a analysis_history%ROWTYPE;
    is_challenger boolean;
    other_score numeric;
    analysis_score numeric;
    analysis_image text;
BEGIN
    SELECT * INTO b FROM battles WHERE id = battle_id;
    
    IF b.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Battle not found');
    END IF;

    -- Verify user involvement
    IF b.challenger_id = auth.uid() THEN
        is_challenger := true;
    ELSIF b.opponent_id = auth.uid() THEN
        is_challenger := false;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- Verify status
    IF b.status NOT IN ('waiting_upload', 'analyzing') THEN
        RETURN json_build_object('success', false, 'error', 'Battle is not accepting moves');
    END IF;

    -- Get Analysis
    SELECT * INTO a FROM analysis_history WHERE id = analysis_id;
    
    IF a.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Analysis not found');
    END IF;

    IF a.user_id <> auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Analysis does not belong to you');
    END IF;

    -- Extract Score (Use stored score for reliability)
    analysis_score := a.score;
    
    IF analysis_score IS NULL THEN
         RETURN json_build_object('success', false, 'error', 'Analysis score is invalid');
    END IF;

    IF is_challenger THEN
        IF b.challenger_analysis_id IS NOT NULL THEN
             RETURN json_build_object('success', false, 'error', 'You have already submitted');
        END IF;
        
        UPDATE battles 
        SET challenger_score = analysis_score,
            challenger_analysis_id = analysis_id,
            updated_at = now()
        WHERE id = battle_id;
    ELSE
        IF b.opponent_analysis_id IS NOT NULL THEN
             RETURN json_build_object('success', false, 'error', 'You have already submitted');
        END IF;

        UPDATE battles 
        SET opponent_score = analysis_score,
            opponent_analysis_id = analysis_id,
            updated_at = now()
        WHERE id = battle_id;
    END IF;

    -- Check if both are ready (Reload state)
    SELECT * INTO b FROM battles WHERE id = battle_id;
    
    IF b.challenger_score IS NOT NULL AND b.opponent_score IS NOT NULL THEN
        -- Both have scores, determine winner immediately
        PERFORM determine_battle_winner_internal(battle_id);
    ELSE
        -- Update status to analyzing if it was waiting_upload
        UPDATE battles SET status = 'analyzing' WHERE id = battle_id AND status = 'waiting_upload';
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- Update Battle Photo (Helper to set URL after upload)
CREATE OR REPLACE FUNCTION update_battle_photo(battle_id uuid, photo_url text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    b battles%ROWTYPE;
BEGIN
    SELECT * INTO b FROM battles WHERE id = battle_id;
    
    IF b.id IS NULL THEN RETURN json_build_object('success', false); END IF;
    
    IF b.challenger_id = auth.uid() THEN
        UPDATE battles SET challenger_photo_url = photo_url WHERE id = battle_id;
    ELSIF b.opponent_id = auth.uid() THEN
        UPDATE battles SET opponent_photo_url = photo_url WHERE id = battle_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$;

-- 5. Storage Bucket for Battle Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('battle-images', 'battle-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access to Battle Images" ON storage.objects;
CREATE POLICY "Public Access to Battle Images" ON storage.objects FOR SELECT USING (bucket_id = 'battle-images');

DROP POLICY IF EXISTS "Authenticated Users can upload Battle Images" ON storage.objects;
CREATE POLICY "Authenticated Users can upload Battle Images" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'battle-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own Battle Images" ON storage.objects;
CREATE POLICY "Users can update their own Battle Images" ON storage.objects FOR UPDATE
USING (bucket_id = 'battle-images' AND auth.uid() = owner);
