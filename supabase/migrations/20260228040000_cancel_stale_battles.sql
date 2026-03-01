-- Cancela todas as batalhas waiting_for_opponent com mais de 1 hora
UPDATE battles
SET status = 'canceled'
WHERE status = 'waiting_for_opponent'
AND created_at < NOW() - INTERVAL '1 hour';
