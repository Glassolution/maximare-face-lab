-- CONSOLIDATED MIGRATION: Friends & Battles System
-- Run this in Supabase SQL Editor to fix missing tables

-- ============================================================
-- 1. FRIENDS SYSTEM
-- ============================================================

-- 1.1 Alter profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS visibility_score text DEFAULT 'friends',
ADD COLUMN IF NOT EXISTS allow_friend_requests text DEFAULT 'public';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_visibility_score') THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT check_visibility_score CHECK (visibility_score IN ('public', 'friends', 'private'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_allow_friend_requests') THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT check_allow_friend_requests CHECK (allow_friend_requests IN ('public', 'username_only', 'none'));
    END IF;
END $$;

-- 1.2 Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_friend_request UNIQUE (requester_id, addressee_id),
    CONSTRAINT not_self_request CHECK (requester_id <> addressee_id)
);

-- 1.3 Create friends table
CREATE TABLE IF NOT EXISTS friends (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT not_self_friend CHECK (user_id <> friend_id)
);

-- 1.4 Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 1.5 RLS Policies (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own sent or received requests" ON friend_requests;
CREATE POLICY "Users can view their own sent or received requests"
    ON friend_requests FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can insert requests where they are the requester" ON friend_requests;
CREATE POLICY "Users can insert requests where they are the requester"
    ON friend_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update requests involved in" ON friend_requests;
CREATE POLICY "Users can update requests involved in"
    ON friend_requests FOR UPDATE
    USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can view their own friends" ON friends;
CREATE POLICY "Users can view their own friends"
    ON friends FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own friend connections" ON friends;
CREATE POLICY "Users can delete their own friend connections"
    ON friends FOR DELETE
    USING (auth.uid() = user_id);

-- 1.6 RPC Functions for Friends

-- Drop functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS send_friend_request(text);
DROP FUNCTION IF EXISTS respond_friend_request(uuid, text);
DROP FUNCTION IF EXISTS cancel_friend_request(uuid);
DROP FUNCTION IF EXISTS remove_friend(uuid);

CREATE OR REPLACE FUNCTION send_friend_request(target_username text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    target_uid uuid;
    target_allow_requests text;
    existing_request_id uuid;
    existing_status text;
    is_already_friend boolean;
BEGIN
    SELECT user_id, allow_friend_requests INTO target_uid, target_allow_requests
    FROM profiles WHERE username = target_username;

    IF target_uid IS NULL THEN RETURN json_build_object('success', false, 'error', 'User not found'); END IF;
    IF target_uid = auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Cannot send request to yourself'); END IF;
    IF target_allow_requests = 'none' THEN RETURN json_build_object('success', false, 'error', 'User does not accept friend requests'); END IF;

    SELECT EXISTS(SELECT 1 FROM friends WHERE user_id = auth.uid() AND friend_id = target_uid) INTO is_already_friend;
    IF is_already_friend THEN RETURN json_build_object('success', false, 'error', 'Already friends'); END IF;

    SELECT id, status INTO existing_request_id, existing_status
    FROM friend_requests
    WHERE (requester_id = auth.uid() AND addressee_id = target_uid) OR (requester_id = target_uid AND addressee_id = auth.uid())
    ORDER BY created_at DESC LIMIT 1;

    IF existing_request_id IS NOT NULL THEN
        IF existing_status = 'pending' THEN RETURN json_build_object('success', false, 'error', 'Pending request already exists');
        ELSIF existing_status = 'accepted' THEN RETURN json_build_object('success', false, 'error', 'Already friends'); END IF;
    END IF;

    INSERT INTO friend_requests (requester_id, addressee_id, status) VALUES (auth.uid(), target_uid, 'pending');
    RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION respond_friend_request(request_id uuid, action text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE req_record record;
BEGIN
    IF action NOT IN ('accepted', 'rejected') THEN RETURN json_build_object('success', false, 'error', 'Invalid action'); END IF;
    SELECT * INTO req_record FROM friend_requests WHERE id = request_id;
    IF req_record.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Request not found'); END IF;
    IF req_record.addressee_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
    IF req_record.status <> 'pending' THEN RETURN json_build_object('success', false, 'error', 'Request is not pending'); END IF;

    UPDATE friend_requests SET status = action, updated_at = now() WHERE id = request_id;

    IF action = 'accepted' THEN
        IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = req_record.requester_id AND friend_id = req_record.addressee_id) THEN
             INSERT INTO friends (user_id, friend_id) VALUES (req_record.requester_id, req_record.addressee_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM friends WHERE user_id = req_record.addressee_id AND friend_id = req_record.requester_id) THEN
             INSERT INTO friends (user_id, friend_id) VALUES (req_record.addressee_id, req_record.requester_id);
        END IF;
    END IF;
    RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION cancel_friend_request(request_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE req_record record;
BEGIN
    SELECT * INTO req_record FROM friend_requests WHERE id = request_id;
    IF req_record.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Request not found'); END IF;
    IF req_record.requester_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
    IF req_record.status <> 'pending' THEN RETURN json_build_object('success', false, 'error', 'Request is not pending'); END IF;
    UPDATE friend_requests SET status = 'canceled', updated_at = now() WHERE id = request_id;
    RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION remove_friend(target_friend_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM friends WHERE (user_id = auth.uid() AND friend_id = target_friend_id) OR (user_id = target_friend_id AND friend_id = auth.uid());
    RETURN json_build_object('success', true);
END; $$;


-- ============================================================
-- 2. BATTLES SYSTEM
-- ============================================================

-- 2.1 Create battles table
CREATE TABLE IF NOT EXISTS battles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'waiting_upload', 'analyzing', 'finished', 'canceled')),
    challenger_photo_url text,
    opponent_photo_url text,
    challenger_score numeric,
    opponent_score numeric,
    challenger_analysis_id uuid REFERENCES analysis_history(id),
    opponent_analysis_id uuid REFERENCES analysis_history(id),
    winner_id uuid REFERENCES auth.users(id),
    loser_id uuid REFERENCES auth.users(id),
    win_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    finished_at timestamptz,
    CONSTRAINT not_self_battle CHECK (challenger_id <> opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_battles_users ON battles(challenger_id, opponent_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);

-- 2.2 Enable RLS
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- 2.3 RLS Policies
DROP POLICY IF EXISTS "Users can view their own battles" ON battles;
CREATE POLICY "Users can view their own battles" ON battles FOR SELECT
    USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Users can create battles" ON battles;
CREATE POLICY "Users can create battles" ON battles FOR INSERT
    WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Users can update their own battles" ON battles;
CREATE POLICY "Users can update their own battles" ON battles FOR UPDATE
    USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 2.4 RPC Functions for Battles

-- Drop functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_battle_challenge(uuid);
DROP FUNCTION IF EXISTS respond_to_battle(uuid, text);
DROP FUNCTION IF EXISTS determine_battle_winner_internal(uuid);
DROP FUNCTION IF EXISTS submit_battle_move(uuid, uuid);
DROP FUNCTION IF EXISTS update_battle_photo(uuid, text);

CREATE OR REPLACE FUNCTION create_battle_challenge(target_opponent_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    is_friend boolean;
    existing_battle_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_opponent_id) THEN RETURN json_build_object('success', false, 'error', 'Opponent not found'); END IF;
    IF target_opponent_id = auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Cannot battle yourself'); END IF;
    
    SELECT EXISTS(SELECT 1 FROM friends WHERE user_id = auth.uid() AND friend_id = target_opponent_id) INTO is_friend;
    IF NOT is_friend THEN RETURN json_build_object('success', false, 'error', 'You can only battle friends'); END IF;

    SELECT id INTO existing_battle_id FROM battles
    WHERE (challenger_id = auth.uid() AND opponent_id = target_opponent_id AND status NOT IN ('finished', 'rejected', 'canceled'))
       OR (challenger_id = target_opponent_id AND opponent_id = auth.uid() AND status NOT IN ('finished', 'rejected', 'canceled'))
    LIMIT 1;

    IF existing_battle_id IS NOT NULL THEN RETURN json_build_object('success', false, 'error', 'An active battle already exists'); END IF;

    INSERT INTO battles (challenger_id, opponent_id, status) VALUES (auth.uid(), target_opponent_id, 'pending');
    RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION respond_to_battle(battle_id uuid, action text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE battle_record battles%ROWTYPE;
BEGIN
    SELECT * INTO battle_record FROM battles WHERE id = battle_id;
    IF battle_record.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
    IF battle_record.opponent_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
    IF battle_record.status <> 'pending' THEN RETURN json_build_object('success', false, 'error', 'Battle is not pending'); END IF;

    IF action = 'accepted' THEN UPDATE battles SET status = 'waiting_upload', updated_at = now() WHERE id = battle_id;
    ELSIF action = 'rejected' THEN UPDATE battles SET status = 'rejected', updated_at = now(), finished_at = now() WHERE id = battle_id;
    ELSE RETURN json_build_object('success', false, 'error', 'Invalid action'); END IF;
    RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION determine_battle_winner_internal(battle_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    b battles%ROWTYPE;
    winner uuid; loser uuid;
    reason text; score_diff numeric;
BEGIN
    SELECT * INTO b FROM battles WHERE id = battle_id;
    IF b.challenger_score > b.opponent_score THEN
        winner := b.challenger_id; loser := b.opponent_id; score_diff := b.challenger_score - b.opponent_score;
    ELSIF b.opponent_score > b.challenger_score THEN
        winner := b.opponent_id; loser := b.challenger_id; score_diff := b.opponent_score - b.challenger_score;
    ELSE
        IF random() > 0.5 THEN winner := b.challenger_id; loser := b.opponent_id; ELSE winner := b.opponent_id; loser := b.challenger_id; END IF;
        score_diff := 0; reason := 'Empate técnico (decisão por sorteio)';
    END IF;

    IF reason IS NULL THEN
        IF score_diff > 10 THEN reason := 'Vitória esmagadora por superioridade estética evidente.';
        ELSIF score_diff > 5 THEN reason := 'Venceu por melhor harmonia facial e simetria.';
        ELSE reason := 'Vitória apertada nos detalhes técnicos.'; END IF;
    END IF;

    UPDATE battles SET status = 'finished', winner_id = winner, loser_id = loser, win_reason = reason, finished_at = now(), updated_at = now() WHERE id = battle_id;
END; $$;

CREATE OR REPLACE FUNCTION submit_battle_move(battle_id uuid, analysis_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    b battles%ROWTYPE;
    a analysis_history%ROWTYPE;
    is_challenger boolean;
    analysis_score numeric;
BEGIN
    SELECT * INTO b FROM battles WHERE id = battle_id;
    IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;

    IF b.challenger_id = auth.uid() THEN is_challenger := true;
    ELSIF b.opponent_id = auth.uid() THEN is_challenger := false;
    ELSE RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;

    IF b.status NOT IN ('waiting_upload', 'analyzing') THEN RETURN json_build_object('success', false, 'error', 'Battle is not accepting moves'); END IF;

    SELECT * INTO a FROM analysis_history WHERE id = analysis_id;
    IF a.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Analysis not found'); END IF;
    IF a.user_id <> auth.uid() THEN RETURN json_build_object('success', false, 'error', 'Analysis does not belong to you'); END IF;

    analysis_score := a.score;
    IF analysis_score IS NULL THEN RETURN json_build_object('success', false, 'error', 'Analysis score is invalid'); END IF;

    IF is_challenger THEN
        IF b.challenger_analysis_id IS NOT NULL THEN RETURN json_build_object('success', false, 'error', 'You have already submitted'); END IF;
        UPDATE battles SET challenger_score = analysis_score, challenger_analysis_id = analysis_id, updated_at = now() WHERE id = battle_id;
    ELSE
        IF b.opponent_analysis_id IS NOT NULL THEN RETURN json_build_object('success', false, 'error', 'You have already submitted'); END IF;
        UPDATE battles SET opponent_score = analysis_score, opponent_analysis_id = analysis_id, updated_at = now() WHERE id = battle_id;
    END IF;

    SELECT * INTO b FROM battles WHERE id = battle_id;
    IF b.challenger_score IS NOT NULL AND b.opponent_score IS NOT NULL THEN
        PERFORM determine_battle_winner_internal(battle_id);
    ELSE
        UPDATE battles SET status = 'analyzing' WHERE id = battle_id AND status = 'waiting_upload';
    END IF;
    RETURN json_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION update_battle_photo(battle_id uuid, photo_url text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE b battles%ROWTYPE;
BEGIN
    SELECT * INTO b FROM battles WHERE id = battle_id;
    IF b.id IS NULL THEN RETURN json_build_object('success', false); END IF;
    IF b.challenger_id = auth.uid() THEN UPDATE battles SET challenger_photo_url = photo_url WHERE id = battle_id;
    ELSIF b.opponent_id = auth.uid() THEN UPDATE battles SET opponent_photo_url = photo_url WHERE id = battle_id;
    ELSE RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
    RETURN json_build_object('success', true);
END; $$;

-- 2.5 Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('battle-images', 'battle-images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to Battle Images" ON storage.objects;
CREATE POLICY "Public Access to Battle Images" ON storage.objects FOR SELECT USING (bucket_id = 'battle-images');

DROP POLICY IF EXISTS "Authenticated Users can upload Battle Images" ON storage.objects;
CREATE POLICY "Authenticated Users can upload Battle Images" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'battle-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own Battle Images" ON storage.objects;
CREATE POLICY "Users can update their own Battle Images" ON storage.objects FOR UPDATE
USING (bucket_id = 'battle-images' AND auth.uid() = owner);
