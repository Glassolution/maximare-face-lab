-- Migration: Analysis Limits and Paywall Events
-- Implements a strict 24-hour window limit for free users.

-- 1. Create 'face_analysis_events' table
CREATE TABLE IF NOT EXISTS face_analysis_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    is_premium boolean NOT NULL DEFAULT false,
    source text DEFAULT 'app', -- 'app', 'battle', 'manual'
    request_id text, -- for idempotency
    CONSTRAINT unique_request_id UNIQUE (user_id, request_id) -- Prevent double counting same request
);

-- Indexes for performance
CREATE INDEX idx_analysis_events_user_created ON face_analysis_events(user_id, created_at DESC);

-- 2. RLS Policies
ALTER TABLE face_analysis_events ENABLE ROW LEVEL SECURITY;

-- Select: Users can see their own history
CREATE POLICY "Users can view their own analysis events"
ON face_analysis_events FOR SELECT
USING (auth.uid() = user_id);

-- Insert: Only service role or trusted functions should insert to enforce rules strictly.
-- However, for this architecture without a dedicated backend API server (using Supabase direct), 
-- we will allow INSERT but use a Trigger or RPC to enforce limits if inserted directly, 
-- OR better: rely on the 'analyze-face' Edge Function to do the insertion.
-- Let's allow insert for authenticated users for now BUT the client app should rely on RPC/Edge Function.
-- Ideally, the client shouldn't insert this directly. The Edge Function running the AI analysis should insert it.
-- So we keep INSERT policy restricted or just for service_role if possible.
-- BUT, if we want to log 'attempts' from client, maybe. 
-- Let's stick to the plan: "Enforcement no Backend". 
-- So we won't allow direct INSERT from client for successful analysis events.
-- Only the Edge Function (service role) will insert into this table.

-- 3. RPC: Check if user can analyze
CREATE OR REPLACE FUNCTION can_user_analyze_face()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
    is_premium_user boolean;
    last_analysis_time timestamptz;
    next_available timestamptz;
    can_analyze boolean;
    remaining int;
BEGIN
    IF current_uid IS NULL THEN 
        RETURN json_build_object('can_analyze', false, 'reason', 'Not authenticated'); 
    END IF;

    -- Check Premium Status
    -- Assuming 'profiles' table has 'plan_type' or similar. 
    -- Adjust column name based on your schema (e.g. 'is_premium' or 'plan' = 'pro')
    SELECT (plan_type = 'pro' OR plan_type = 'premium') INTO is_premium_user
    FROM profiles
    WHERE id = current_uid;
    
    -- If premium, always allow
    IF is_premium_user THEN
        RETURN json_build_object(
            'can_analyze', true, 
            'next_available_at', null, 
            'remaining_today', -1 -- Infinite
        );
    END IF;

    -- If Free, check last event
    SELECT created_at INTO last_analysis_time
    FROM face_analysis_events
    WHERE user_id = current_uid
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_analysis_time IS NULL THEN
        -- Never analyzed
        RETURN json_build_object(
            'can_analyze', true, 
            'next_available_at', now(), 
            'remaining_today', 1
        );
    END IF;

    -- Rule: 24h rolling window
    next_available := last_analysis_time + interval '24 hours';
    
    IF now() >= next_available THEN
        can_analyze := true;
        remaining := 1;
    ELSE
        can_analyze := false;
        remaining := 0;
    END IF;

    RETURN json_build_object(
        'can_analyze', can_analyze, 
        'next_available_at', next_available, 
        'remaining_today', remaining
    );
END;
$$;

-- 4. RPC: Log Analysis Event (to be called by Edge Function or securely)
CREATE OR REPLACE FUNCTION log_analysis_event(p_source text DEFAULT 'app', p_request_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_uid uuid := auth.uid();
    is_premium_user boolean;
BEGIN
    IF current_uid IS NULL THEN RETURN json_build_object('success', false); END IF;

    -- Check premium status for the log
    SELECT (plan_type = 'pro' OR plan_type = 'premium') INTO is_premium_user
    FROM profiles
    WHERE id = current_uid;

    INSERT INTO face_analysis_events (user_id, is_premium, source, request_id)
    VALUES (current_uid, COALESCE(is_premium_user, false), p_source, p_request_id)
    ON CONFLICT (user_id, request_id) DO NOTHING;

    RETURN json_build_object('success', true);
END;
$$;
