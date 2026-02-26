-- Fix missing usernames and ensure future profiles have one

-- 1. Backfill missing usernames
-- Strategy: 
-- 1. Try to use display_name (lowercase, no spaces, alphanumeric only)
-- 2. If display_name is null/empty or taken, use 'user_' + short_id
-- 3. Ensure uniqueness by appending random chars if needed (simplified here for bulk update)

DO $$
DECLARE
    r RECORD;
    new_username text;
    counter int;
BEGIN
    FOR r IN SELECT * FROM profiles WHERE username IS NULL LOOP
        
        -- Attempt 1: From display_name
        IF r.display_name IS NOT NULL AND length(trim(r.display_name)) > 0 THEN
            -- Sanitize: lowercase, remove spaces, keep only a-z0-9
            new_username := lower(regexp_replace(r.display_name, '[^a-zA-Z0-9]', '', 'g'));
            
            -- If resulting username is too short, fall back
            IF length(new_username) < 3 THEN
                new_username := NULL;
            END IF;
        ELSE
            new_username := NULL;
        END IF;

        -- Attempt 2: From short_id (public_id) or fallback
        IF new_username IS NULL THEN
             IF r.public_id IS NOT NULL THEN
                new_username := 'user_' || r.public_id::text;
             ELSIF r.short_id IS NOT NULL THEN
                new_username := 'user_' || r.short_id;
             ELSE
                new_username := 'user_' || substr(md5(random()::text), 1, 8);
             END IF;
        END IF;

        -- Check uniqueness (simple check, might fail in race conditions but okay for migration)
        -- If exists, append random suffix
        WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username AND id != r.id) LOOP
            new_username := new_username || substr(md5(random()::text), 1, 3);
        END LOOP;

        -- Update
        UPDATE profiles SET username = new_username WHERE id = r.id;
        
    END LOOP;
END $$;

-- 2. Enforce username NOT NULL (optional, but good practice if we want to guarantee it)
-- ALTER TABLE profiles ALTER COLUMN username SET NOT NULL; 
-- (Keeping nullable for now to avoid breaking other flows, but logic should enforce it)

-- 3. Update handle_new_user trigger to ensure username is generated if metadata is missing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p_username text;
    p_display_name text;
    p_public_id bigint;
BEGIN
    -- Get display name from metadata
    p_display_name := new.raw_user_meta_data->>'full_name';
    IF p_display_name IS NULL THEN
        p_display_name := new.raw_user_meta_data->>'name';
    END IF;

    -- Get public_id from sequence
    p_public_id := nextval('profiles_public_id_seq');

    -- Generate username
    -- 1. Try metadata username
    p_username := new.raw_user_meta_data->>'username';
    
    -- 2. Try derived from email (before @)
    IF p_username IS NULL AND new.email IS NOT NULL THEN
        p_username := split_part(new.email, '@', 1);
        -- Sanitize
        p_username := lower(regexp_replace(p_username, '[^a-zA-Z0-9]', '', 'g'));
    END IF;

    -- 3. Fallback to user_ID
    IF p_username IS NULL OR length(p_username) < 3 THEN
        p_username := 'user_' || p_public_id::text;
    END IF;

    -- Ensure uniqueness (append random if needed)
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = p_username) LOOP
        p_username := p_username || substr(md5(random()::text), 1, 3);
    END LOOP;

    INSERT INTO public.profiles (id, username, display_name, avatar_url, public_id, short_id)
    VALUES (
        new.id,
        p_username,
        p_display_name,
        new.raw_user_meta_data->>'avatar_url',
        p_public_id,
        p_public_id::text -- Keep short_id synced for backward compat
    );

    RETURN new;
END;
$$;
