
-- 1. Create Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    
    -- Premium Fields (New System)
    subscription_status TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    plan_type TEXT DEFAULT 'free',
    
    -- Analytics Fields
    last_paywall_shown_at TIMESTAMPTZ,
    paywall_show_count_7d INTEGER DEFAULT 0,
    last_paywall_dismissed_at TIMESTAMPTZ,
    paywall_dismiss_count_7d INTEGER DEFAULT 0,
    
    -- Legacy Fields (kept for compatibility but deprecated)
    premium_status BOOLEAN DEFAULT false,
    premium_until TIMESTAMPTZ,
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- 2. Create Analysis History Table
CREATE TABLE IF NOT EXISTS public.analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT,
    result_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL,
    mp_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Webhook Events Table (Idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    payload JSONB,
    request_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(provider, event_type, resource_id)
);

-- 5. Create Paywall Events Table (Analytics)
CREATE TABLE IF NOT EXISTS public.paywall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create User Badges Table
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL, -- 'first_analysis', 'streak_7', 'score_7', 'elite_level'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- 7. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 8. Policies

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Analysis History
CREATE POLICY "Users can view own analysis history" ON public.analysis_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analysis history" ON public.analysis_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchases
CREATE POLICY "Users can view own purchases" ON public.purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook Events (Service Role only usually, but maybe read for debug if needed)
-- Default deny for public is good.

-- Paywall Events
CREATE POLICY "Users can insert paywall events" ON public.paywall_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Badges
CREATE POLICY "Users can view own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

-- 9. Triggers
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Grants for Service Role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
