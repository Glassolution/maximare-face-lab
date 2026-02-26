-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id uuid REFERENCES auth.users(id) NOT NULL,
    addressee_id uuid REFERENCES auth.users(id) NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(requester_id, addressee_id)
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id uuid REFERENCES auth.users(id) NOT NULL,
    blocked_id uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS friendships_requester_id_idx ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_id_idx ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS blocks_blocker_id_idx ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_id_idx ON public.blocks(blocked_id);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Policies for friendships
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
    CREATE POLICY "Users can view their own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

    DROP POLICY IF EXISTS "Users can create friend requests" ON public.friendships;
    CREATE POLICY "Users can create friend requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

    DROP POLICY IF EXISTS "Users can update their own friendships" ON public.friendships;
    CREATE POLICY "Users can update their own friendships"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

    DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;
    CREATE POLICY "Users can delete their own friendships"
    ON public.friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Policies for blocks
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their blocks" ON public.blocks;
    CREATE POLICY "Users can view their blocks"
    ON public.blocks FOR SELECT
    USING (auth.uid() = blocker_id);

    DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
    CREATE POLICY "Users can create blocks"
    ON public.blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

    DROP POLICY IF EXISTS "Users can delete blocks" ON public.blocks;
    CREATE POLICY "Users can delete blocks"
    ON public.blocks FOR DELETE
    USING (auth.uid() = blocker_id);
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
