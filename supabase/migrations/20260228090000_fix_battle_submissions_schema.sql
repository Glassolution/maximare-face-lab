-- Fix battle_submissions schema to match RPC usage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battle_submissions' AND column_name = 'front_photo_path'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battle_submissions' AND column_name = 'front_photo_url'
  ) THEN
    ALTER TABLE battle_submissions RENAME COLUMN front_photo_path TO front_photo_url;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battle_submissions' AND column_name = 'side_photo_path'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battle_submissions' AND column_name = 'side_photo_url'
  ) THEN
    ALTER TABLE battle_submissions RENAME COLUMN side_photo_path TO side_photo_url;
  END IF;
END $$;
