-- Migration: Add UPDATE policy for battles
-- Fixes issue where users cannot reject/cancel battles because RLS blocked updates.

-- Allow participants (creator or opponent) to update the battle status (e.g. to 'canceled')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'battles' AND policyname = 'Participants can update battles'
  ) THEN
    CREATE POLICY "Participants can update battles" ON battles FOR UPDATE
        USING (auth.uid() = created_by OR auth.uid() = opponent_id)
        WITH CHECK (auth.uid() = created_by OR auth.uid() = opponent_id);
  END IF;
END $$;
