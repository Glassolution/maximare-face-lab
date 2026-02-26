-- Ensure all profiles have a short_id
-- This is a fix migration to catch any profiles that might have been missed

-- 1. Create or Replace the generation function (ensure it exists)
CREATE OR REPLACE FUNCTION generate_unique_short_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  done BOOLEAN;
  attempts INTEGER := 0;
BEGIN
  done := FALSE;
  WHILE NOT done AND attempts < 100 LOOP
    -- Generate a random 4-digit number (1000 to 9999)
    new_id := floor(random() * (9999 - 1000 + 1) + 1000)::text;
    
    -- Check if it already exists
    PERFORM 1 FROM profiles WHERE short_id = new_id;
    IF NOT FOUND THEN
      RETURN new_id;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  
  -- Fallback to 5 digits if 4 digits are full or collision prone
  RETURN floor(random() * (99999 - 10000 + 1) + 10000)::text;
END;
$$ LANGUAGE plpgsql;

-- 2. Backfill missing short_ids
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE short_id IS NULL LOOP
    UPDATE profiles 
    SET short_id = generate_unique_short_id()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 3. Ensure trigger exists for future inserts
CREATE OR REPLACE FUNCTION set_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := generate_unique_short_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_short_id ON profiles;
CREATE TRIGGER trigger_set_short_id
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_short_id();
