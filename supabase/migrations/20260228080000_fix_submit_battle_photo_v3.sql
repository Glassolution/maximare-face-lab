-- Adiciona colunas de foto se não existirem
ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_photo_url text;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_photo_url text;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_submitted_at timestamptz;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_submitted_at timestamptz;

-- Remove versão quebrada
DROP FUNCTION IF EXISTS submit_battle_photo_urls_v3(uuid, text);
DROP FUNCTION IF EXISTS submit_battle_photo_urls_v3(uuid, text, text);

-- Recria com colunas corretas (sem start_at, usa matched_at)
CREATE OR REPLACE FUNCTION submit_battle_photo_urls_v3(
  p_battle_id uuid,
  p_front_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_battle battles%ROWTYPE;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Battle not found');
  END IF;
  
  -- Check if battle is active or matched (allow submission)
  IF v_battle.status NOT IN ('active', 'matched', 'photo_submission') THEN
     -- If already ready/running, just update the photo is weird but maybe retrying?
     -- Let's stick to active/matched
     RETURN json_build_object('success', false, 'error', 'Battle not active');
  END IF;

  IF v_battle.created_by = auth.uid() THEN
    UPDATE battles
    SET 
      challenger_photo_url = p_front_url,
      challenger_submitted_at = NOW()
    WHERE id = p_battle_id;
    
  ELSIF v_battle.opponent_id = auth.uid() THEN
    UPDATE battles
    SET 
      opponent_photo_url = p_front_url,
      opponent_submitted_at = NOW()
    WHERE id = p_battle_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Se ambos enviaram, muda status para voting (ou ready/running dependendo da lógica do jogo)
  -- Lendo novamente para pegar os valores atualizados
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF v_battle.challenger_photo_url IS NOT NULL 
     AND v_battle.opponent_photo_url IS NOT NULL THEN
     
     -- Ambos enviaram! Mudar para status de processamento ou votação
     -- Usando 'ready' para compatibilidade com o frontend atual que espera ready/running
     UPDATE battles 
     SET 
        status = 'ready',
        -- Define matched_at como "agora" se for usado para sync, ou mantém o original
        matched_at = COALESCE(matched_at, NOW())
     WHERE id = p_battle_id;
  END IF;
  
  -- Compatibilidade com battle_submissions
  INSERT INTO battle_submissions (battle_id, user_id, front_photo_url)
  VALUES (p_battle_id, auth.uid(), p_front_url)
  ON CONFLICT (battle_id, user_id) 
  DO UPDATE SET front_photo_url = p_front_url;
  
  RETURN json_build_object('success', true);
END;
$$;
