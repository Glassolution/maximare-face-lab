-- Fix battle_submissions schema to match RPC usage
ALTER TABLE battle_submissions 
RENAME COLUMN front_photo_path TO front_photo_url;

ALTER TABLE battle_submissions 
RENAME COLUMN side_photo_path TO side_photo_url;
