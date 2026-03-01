-- Retorna o timestamp atual do servidor (evita manipulação client-side)
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT NOW();
$$;

-- Adiciona colunas para armazenar fotos na tabela battles (se não existirem)
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS challenger_photo_url text,
ADD COLUMN IF NOT EXISTS opponent_photo_url text;

-- Submete as URLs das fotos de batalha
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
  
  -- Determina qual coluna atualizar baseado em quem é o usuário
  IF v_battle.created_by = auth.uid() THEN
    UPDATE battles
    SET challenger_photo_url = p_front_url,
        -- Se já tiver a foto do oponente, muda para 'ready'
        status = CASE WHEN opponent_photo_url IS NOT NULL THEN 'ready' ELSE status END,
        -- Define start_at se ficar pronto
        start_at = CASE WHEN opponent_photo_url IS NOT NULL THEN NOW() + INTERVAL '10 seconds' ELSE start_at END
    WHERE id = p_battle_id;
  ELSIF v_battle.opponent_id = auth.uid() THEN
    UPDATE battles
    SET opponent_photo_url = p_front_url,
        -- Se já tiver a foto do desafiante, muda para 'ready'
        status = CASE WHEN challenger_photo_url IS NOT NULL THEN 'ready' ELSE status END,
        -- Define start_at se ficar pronto
        start_at = CASE WHEN challenger_photo_url IS NOT NULL THEN NOW() + INTERVAL '10 seconds' ELSE start_at END
    WHERE id = p_battle_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;
  
  -- Também insere na tabela de submissions para manter compatibilidade com queries existentes
  INSERT INTO battle_submissions (battle_id, user_id, front_photo_url)
  VALUES (p_battle_id, auth.uid(), p_front_url)
  ON CONFLICT (battle_id, user_id) 
  DO UPDATE SET front_photo_url = p_front_url;

  RETURN json_build_object('success', true);
END;
$$;
