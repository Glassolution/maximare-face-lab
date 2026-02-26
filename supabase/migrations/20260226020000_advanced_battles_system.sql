-- Migration: Advanced Battle System (Realtime + RLS + AI Pipeline)
-- Replaces old 'battles' table with a new, robust schema.

-- 0. Clean up old schema
DROP TABLE IF EXISTS battles CASCADE;
DROP TABLE IF EXISTS battle_submissions CASCADE;
DROP TABLE IF EXISTS battle_results CASCADE;
DROP TABLE IF EXISTS battle_events CASCADE;

-- 1. Create 'battles' table (State Machine)
CREATE TABLE IF NOT EXISTS battles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by uuid NOT NULL REFERENCES auth.users(id),
    opponent_id uuid REFERENCES auth.users(id), -- Nullable for public matchmaking, set for direct challenge
    status text NOT NULL CHECK (status IN (
        'waiting_for_opponent', 
        'matched', 
        'photo_submission', 
        'processing', 
        'completed', 
        'canceled', 
        'expired'
    )),
    mode text NOT NULL DEFAULT 'front_lateral', -- 'front_lateral' or 'front_only'
    created_at timestamptz DEFAULT now(),
    matched_at timestamptz,
    expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
    room_version int DEFAULT 1,
    CONSTRAINT not_self_battle CHECK (created_by <> opponent_id)
);

-- Indexes
CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_battles_created_by_status ON battles(created_by, status);
CREATE INDEX idx_battles_opponent_status ON battles(opponent_id, status);

-- 2. Create 'battle_submissions' table (Photos)
CREATE TABLE IF NOT EXISTS battle_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id uuid NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    front_photo_path text,
    side_photo_path text,
    submitted_at timestamptz DEFAULT now(),
    UNIQUE(battle_id, user_id)
);

CREATE INDEX idx_submissions_battle ON battle_submissions(battle_id);

-- 3. Create 'battle_results' table (Outcome)
CREATE TABLE IF NOT EXISTS battle_results (
    battle_id uuid PRIMARY KEY REFERENCES battles(id) ON DELETE CASCADE,
    winner_id uuid REFERENCES auth.users(id),
    loser_id uuid REFERENCES auth.users(id),
    winner_score numeric(4,1), -- e.g. 95.5
    loser_score numeric(4,1),
    verdict_label_winner text DEFAULT 'Vencedor',
    verdict_label_loser text DEFAULT 'Moggado',
    summary jsonb, -- AI insights
    created_at timestamptz DEFAULT now()
);

-- 4. Create 'battle_events' table (Audit/Realtime Log)
CREATE TABLE IF NOT EXISTS battle_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id uuid NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    type text NOT NULL, -- matched, submitted, processing, completed
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- 5. RLS Policies

ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;

-- Battles
CREATE POLICY "Participants can view battles" ON battles FOR SELECT
    USING (auth.uid() = created_by OR auth.uid() = opponent_id);

CREATE POLICY "Users can create battles" ON battles FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Submissions
CREATE POLICY "Participants can view submissions in their battle" ON battle_submissions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM battles b 
        WHERE b.id = battle_submissions.battle_id 
        AND (b.created_by = auth.uid() OR b.opponent_id = auth.uid())
    ));

CREATE POLICY "Users can insert their own submission" ON battle_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update their own submission" ON battle_submissions FOR UPDATE
    USING (auth.uid() = user_id);

-- Results
CREATE POLICY "Participants can view results" ON battle_results FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM battles b 
        WHERE b.id = battle_results.battle_id 
        AND (b.created_by = auth.uid() OR b.opponent_id = auth.uid())
    ));

-- Events
CREATE POLICY "Participants can view events" ON battle_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM battles b 
        WHERE b.id = battle_events.battle_id 
        AND (b.created_by = auth.uid() OR b.opponent_id = auth.uid())
    ));

-- 6. RPC Functions (Atomic Actions)

-- 6.1 Create Challenge
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
    VALUES (auth.uid(), target_opponent_id, 'waiting_for_opponent', battle_mode)
    RETURNING id INTO new_battle_id;

    RETURN json_build_object('success', true, 'battle_id', new_battle_id);
END;
$$;

-- 6.2 Accept Challenge
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
    IF b.status <> 'waiting_for_opponent' THEN RETURN json_build_object('success', false, 'error', 'Battle is not pending'); END IF;

    UPDATE battles 
    SET status = 'matched', matched_at = now()
    WHERE id = p_battle_id;

    -- Log event
    INSERT INTO battle_events (battle_id, type, payload)
    VALUES (p_battle_id, 'matched', json_build_object('accepted_by', auth.uid()));

    RETURN json_build_object('success', true);
END;
$$;

-- 6.3 Submit Photos
CREATE OR REPLACE FUNCTION submit_battle_photos_v2(p_battle_id uuid, p_front_path text, p_side_path text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    b battles%ROWTYPE;
    submission_count int;
BEGIN
    SELECT * INTO b FROM battles WHERE id = p_battle_id;
    
    IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
    IF b.created_by <> auth.uid() AND b.opponent_id <> auth.uid() THEN 
        RETURN json_build_object('success', false, 'error', 'Not authorized'); 
    END IF;

    -- Upsert submission
    INSERT INTO battle_submissions (battle_id, user_id, front_photo_path, side_photo_path)
    VALUES (p_battle_id, auth.uid(), p_front_path, p_side_path)
    ON CONFLICT (battle_id, user_id) 
    DO UPDATE SET front_photo_path = EXCLUDED.front_photo_path, side_photo_path = EXCLUDED.side_photo_path, submitted_at = now();

    -- Check if both submitted
    SELECT count(*) INTO submission_count FROM battle_submissions WHERE battle_id = p_battle_id;
    
    IF submission_count >= 2 THEN
        UPDATE battles SET status = 'processing' WHERE id = p_battle_id;
        -- Here we would trigger the Edge Function via pg_net or just let the client verify status
        -- For now, we simulate processing via another function call or just set status
    ELSE
        UPDATE battles SET status = 'photo_submission' WHERE id = p_battle_id AND status = 'matched';
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- 6.4 Simulate AI Processing (Mock)
-- This function would normally be an Edge Function. 
-- We include it here to allow full end-to-end testing without external deployment.
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
    IF b.status <> 'processing' THEN RETURN json_build_object('success', false, 'error', 'Battle not ready for processing'); END IF;

    SELECT * INTO s1 FROM battle_submissions WHERE battle_id = p_battle_id AND user_id = b.created_by;
    SELECT * INTO s2 FROM battle_submissions WHERE battle_id = p_battle_id AND user_id = b.opponent_id;

    -- Generate random scores (simulating AI)
    score1 := floor(random() * (99 - 70 + 1) + 70)::numeric + (floor(random() * 10) / 10.0);
    score2 := floor(random() * (99 - 70 + 1) + 70)::numeric + (floor(random() * 10) / 10.0);

    IF score1 >= score2 THEN
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
    );

    -- Update Battle Status
    UPDATE battles SET status = 'completed' WHERE id = p_battle_id;

    RETURN json_build_object('success', true);
END;
$$;

-- 7. Storage (Ensure bucket exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('battle-photos', 'battle-photos', true) -- Public read? Or authenticated only with signed urls? 
-- User requested privacy: "Evitar expor fotos para qualquer usuário fora da batalha"
-- Ideally public=false, but for simplicity in this implementation we might use public=true with unguessable paths or rely on signed URLs.
-- Let's set public=false and rely on RLS/Signed URLs if possible, or public=true but strict path names.
-- Prompt says: "Bucket: battle-photos... Preferir Signed URLs"
ON CONFLICT (id) DO UPDATE SET public = false; 

-- Storage Policies
DROP POLICY IF EXISTS "Battle photos access" ON storage.objects;

-- Insert: Authenticated users can upload
CREATE POLICY "Authenticated users can upload battle photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'battle-photos' AND auth.role() = 'authenticated');

-- Select: Only owner (for now, or use signed URLs which bypass RLS if using service role, or use storage.objects select policy matching battle participants)
-- Implementing strict RLS on storage objects is complex because it requires joining with tables.
-- Easiest for "production-grade" with signed URLs is to allow owner to select, and use signed URLs for sharing.
CREATE POLICY "Users can view their own battle photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'battle-photos' AND auth.uid() = owner);
