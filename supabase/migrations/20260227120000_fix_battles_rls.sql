-- Migration: Add UPDATE policy for battles
-- Fixes issue where users cannot reject/cancel battles because RLS blocked updates.

-- Allow participants (creator or opponent) to update the battle status (e.g. to 'canceled')
CREATE POLICY "Participants can update battles" ON battles FOR UPDATE
    USING (auth.uid() = created_by OR auth.uid() = opponent_id)
    WITH CHECK (auth.uid() = created_by OR auth.uid() = opponent_id);
