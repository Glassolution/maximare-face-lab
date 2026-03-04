-- 1. Limpar batalhas duplicadas com status 'waiting_for_opponent'
-- Mantém apenas a batalha mais recente para cada par (created_by, opponent_id)
DELETE FROM battles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY created_by, opponent_id 
             ORDER BY created_at DESC
           ) as rn
    FROM battles
    WHERE status = 'waiting_for_opponent'
  ) t
  WHERE t.rn > 1
);

-- 2. Agora que as duplicatas foram removidas, criar o índice único
CREATE UNIQUE INDEX IF NOT EXISTS battles_unique_pending 
ON battles (created_by, opponent_id) 
WHERE status = 'waiting_for_opponent';
