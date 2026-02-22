
-- 1. Create table for user badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL, -- 'first_analysis', 'streak_7', 'score_7', 'elite_level'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- 2. Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Users can view own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert badges (via Edge Functions/Triggers)
GRANT ALL ON TABLE public.user_badges TO service_role;

-- 4. Create Index
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
