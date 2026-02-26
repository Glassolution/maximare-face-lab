-- Create friendships table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.friendships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id uuid REFERENCES auth.users(id) NOT NULL,
    receiver_id uuid REFERENCES auth.users(id) NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(requester_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. View friendships: Users can view friendships where they are either requester or receiver
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- 2. Create friendships: Users can create requests where they are the requester
CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- 3. Update friendships: Users can update friendships where they are involved (e.g. accepting)
CREATE POLICY "Users can update their own friendships"
ON public.friendships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- 4. Delete friendships: Users can delete friendships they are involved in
CREATE POLICY "Users can delete their own friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS friendships_requester_id_idx ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_receiver_id_idx ON public.friendships(receiver_id);
