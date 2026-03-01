-- Migration: Fix Battle Schema and Status Constraints (Final)
-- Resolves "battles_status_check" violation and missing columns

-- 1. Add columns required for synchronization (if not exist)
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS challenger_photo_url text,
  ADD COLUMN IF NOT EXISTS opponent_photo_url text,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 2. Replace status check to support new frontend states ('ready', 'running')
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_status_check;
ALTER TABLE battles ADD CONSTRAINT battles_status_check
CHECK (status IN (
  'waiting',    -- Aguardando oponente ou fotos
  'ready',      -- Fotos enviadas, aguardando início (countdown)
  'running',    -- Processando / Animando
  'finished',   -- Resultado pronto
  'canceled',   -- Cancelado
  'expired',    -- Expirado
  'matched',    -- Legacy support (convert to waiting)
  'photo_submission', -- Legacy support (convert to waiting)
  'processing', -- Legacy support (convert to running)
  'completed'   -- Legacy support (convert to finished)
));

-- 3. Normalize existing rows to new statuses
UPDATE battles
SET status = CASE
  WHEN status IN ('matched', 'photo_submission', 'waiting_for_opponent') THEN 'waiting'
  WHEN status IN ('processing') THEN 'running'
  WHEN status IN ('completed') THEN 'finished'
  ELSE status
END
WHERE status IN ('matched', 'photo_submission', 'waiting_for_opponent', 'processing', 'completed');

-- 4. Update Function submit_battle_photo_urls_v3
-- Uses correct column names (challenger_photo_url) and sets valid status ('ready')
CREATE OR REPLACE FUNCTION submit_battle_photo_urls_v3(
  p_battle_id uuid,
  p_front_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b battles%ROWTYPE;
  s_at timestamptz;
BEGIN
  SELECT * INTO b FROM battles WHERE id = p_battle_id FOR UPDATE;

  IF b.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Battle not found'); END IF;
  
  -- Allow updates if waiting, ready or legacy statuses
  IF b.status NOT IN ('waiting', 'ready', 'matched', 'photo_submission') THEN
    RETURN json_build_object('success', false, 'error', 'Battle not active');
  END IF;

  IF auth.uid() = b.created_by THEN
    UPDATE battles SET challenger_photo_url = p_front_url WHERE id = p_battle_id;
  ELSIF auth.uid() = b.opponent_id THEN
    UPDATE battles SET opponent_photo_url = p_front_url WHERE id = p_battle_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Refresh data to check both photos
  SELECT * INTO b FROM battles WHERE id = p_battle_id;

  -- If both photos exist, schedule start
  IF b.challenger_photo_url IS NOT NULL AND b.opponent_photo_url IS NOT NULL THEN
    -- Schedule start in 3 seconds (animation time)
    s_at := now() + interval '3 seconds';
    UPDATE battles
    SET status = 'ready',
        ready_at = COALESCE(ready_at, now()),
        start_at = COALESCE(start_at, s_at)
    WHERE id = p_battle_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
