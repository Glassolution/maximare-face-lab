-- Create a function to generate a unique 4-digit numeric ID
CREATE OR REPLACE FUNCTION generate_unique_short_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  done BOOLEAN;
BEGIN
  done := FALSE;
  WHILE NOT done LOOP
    -- Generate a random 4-digit number (1000 to 9999)
    new_id := floor(random() * (9999 - 1000 + 1) + 1000)::text;
    
    -- Check if it already exists
    PERFORM 1 FROM profiles WHERE short_id = new_id;
    IF NOT FOUND THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Add the column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;

-- Create a trigger to automatically assign short_id on insert
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

-- Backfill existing profiles that don't have a short_id
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
