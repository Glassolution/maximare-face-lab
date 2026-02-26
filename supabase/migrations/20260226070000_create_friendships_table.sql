-- Drop table if exists to ensure schema consistency (fixes "column does not exist" errors if table had old schema)
DROP TABLE IF EXISTS public.friendships CASCADE;

-- Create friendships table
CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id uuid REFERENCES auth.users(id) NOT NULL,
    addressee_id uuid REFERENCES auth.users(id) NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(requester_id, addressee_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. View friendships: Users can view friendships where they are either requester or addressee
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 2. Create friendships: Users can create requests where they are the requester
CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- 3. Update friendships: Users can update friendships where they are involved (e.g. accepting)
CREATE POLICY "Users can update their own friendships"
ON public.friendships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 4. Delete friendships: Users can delete friendships they are involved in
CREATE POLICY "Users can delete their own friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS friendships_requester_id_idx ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_id_idx ON public.friendships(addressee_id);
