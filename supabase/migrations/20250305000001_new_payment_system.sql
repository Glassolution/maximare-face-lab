-- Migration: Novo Sistema de Pagamento
-- Cria tabelas payments e webhook_events do zero

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  plan_id text NOT NULL CHECK (plan_id IN ('monthly','yearly')),
  status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  payment_id text UNIQUE,
  preference_id text,
  payment_method text CHECK (payment_method IN ('pix','credit_card')),
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de eventos webhook (idempotencia)
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY "Users see own payments" ON payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access payments" ON payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access webhooks" ON webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Atualizar planos (apenas monthly e yearly)
-- TESTE: Mensal a R$ 1,00 para testes
UPDATE plans 
SET price_cents = 100, 
    name = 'Mensal (TESTE R$1)', 
    price_display = 'R$ 1,00',
    interval = 'month',
    active = true
WHERE id = 'monthly';

UPDATE plans 
SET price_cents = 9990,
    name = 'Anual', 
    price_display = 'R$ 99,90',
    interval = 'year',
    active = true
WHERE id = 'yearly';

-- Desativar plano weekly (nao deletar para manter historico)
UPDATE plans 
SET active = false 
WHERE id = 'weekly';

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
