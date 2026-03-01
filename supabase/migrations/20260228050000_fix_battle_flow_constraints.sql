-- Create unique index to prevent duplicate pending battles
CREATE UNIQUE INDEX IF NOT EXISTS battles_unique_pending 
ON battles (created_by, opponent_id) 
WHERE status = 'waiting_for_opponent';
