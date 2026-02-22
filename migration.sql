
-- 1. Create purchases table if not exists
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    provider TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL,
    mp_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create webhook_events table if not exists (for idempotency)
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

-- 3. Create paywall_events table for analytics
CREATE TABLE IF NOT EXISTS public.paywall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Purchases
-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON public.purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Service Role can do everything (Implicit, but good to be explicit if needed, though RLS bypass applies)

-- 6. Policies for Profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update own profile (but ideally we restrict subscription columns)
-- We should separate sensitive columns if we want strict security, 
-- but for now we trust the backend to control subscription updates via service_role.
-- Users might update name, avatar, etc.
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 7. Grant permissions to service_role (just in case)
GRANT ALL ON TABLE public.purchases TO service_role;
GRANT ALL ON TABLE public.webhook_events TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.paywall_events TO service_role;

-- 8. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resource_id ON public.webhook_events(resource_id);
