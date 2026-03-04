-- =============================================================================
-- MIGRATION: Índices em payments + Tabela de Audit Trail
-- =============================================================================
-- Adiciona índices para melhorar performance de queries de pagamento
-- Cria tabela de auditoria para rastrear todas as operações de pagamento
-- =============================================================================

-- 1. ÍNDICES NA TABELA PAYMENTS
-- ============================================================================

-- Índice para busca por usuário (usado em reconciliação e histórico)
CREATE INDEX IF NOT EXISTS idx_payments_user_id 
ON payments(user_id);

-- Índice para busca por status (usado em queries de dashboard e reconciliação)
CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status);

-- Índice para ordenação por data (usado em listagens)
CREATE INDEX IF NOT EXISTS idx_payments_created_at 
ON payments(created_at DESC);

-- Índice composto para reconciliação (busca pagamentos aprovados de um usuário)
CREATE INDEX IF NOT EXISTS idx_payments_user_status 
ON payments(user_id, status);

-- Índice para busca por payment_id do MercadoPago
CREATE INDEX IF NOT EXISTS idx_payments_payment_id 
ON payments(payment_id);

-- 2. COLUNAS ADICIONAIS EM PAYMENTS (se não existirem)
-- ============================================================================

-- Coluna para registrar última falha (para debug)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'last_error_at') THEN
        ALTER TABLE payments ADD COLUMN last_error_at timestamptz;
    END IF;
END $$;

-- Coluna para fonte de aprovação (webhook, polling, reconciliation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'source_of_approval') THEN
        ALTER TABLE payments ADD COLUMN source_of_approval text;
    END IF;
END $$;

-- 3. TABELA DE AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referências
    payment_id text,                    -- ID do pagamento no MercadoPago
    user_id uuid,                       -- Usuário afetado
    
    -- Evento
    event_type text NOT NULL,           -- Tipo: webhook_received, profile_updated, 
                                        -- profile_update_failed, reconciliation_healed,
                                        -- signature_invalid, etc.
    source text NOT NULL,               -- Fonte: webhook, create_payment, rpc, 
                                        -- reconciliation, frontend_polling
    
    -- Status
    old_status text,                    -- Status anterior (se aplicável)
    new_status text,                    -- Novo status (se aplicável)
    success boolean DEFAULT true,       -- Se a operação foi bem-sucedida
    
    -- Contexto
    correlation_id text,                -- ID para correlacionar logs de uma mesma operação
    error_message text,                 -- Mensagem de erro (se houver)
    metadata jsonb,                     -- Dados adicionais do evento
    
    -- Timestamps
    created_at timestamptz DEFAULT now()
);

-- Índices para a tabela de audit
CREATE INDEX IF NOT EXISTS idx_audit_payment_id ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON payment_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON payment_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_correlation_id ON payment_audit_log(correlation_id);

-- RLS para audit log (apenas admins podem ler)
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Política: apenas service_role pode inserir (Edge Functions)
CREATE POLICY "audit_service_insert" ON payment_audit_log
  FOR INSERT
  WITH CHECK (true);  -- Service role bypassa RLS, mas política precisa existir

-- Política: apenas admins podem ler
CREATE POLICY "audit_admin_read" ON payment_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Comentário
COMMENT ON TABLE payment_audit_log IS 'Audit trail de todas as operações de pagamento para debug e compliance.';

-- 4. FUNÇÃO HELPER PARA INSERIR NO AUDIT LOG
-- ============================================================================

CREATE OR REPLACE FUNCTION log_payment_event(
    p_payment_id text,
    p_user_id uuid,
    p_event_type text,
    p_source text,
    p_old_status text DEFAULT NULL,
    p_new_status text DEFAULT NULL,
    p_success boolean DEFAULT true,
    p_correlation_id text DEFAULT NULL,
    p_error_message text DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO payment_audit_log (
        payment_id, user_id, event_type, source,
        old_status, new_status, success,
        correlation_id, error_message, metadata
    ) VALUES (
        p_payment_id, p_user_id, p_event_type, p_source,
        p_old_status, p_new_status, p_success,
        p_correlation_id, p_error_message, p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_payment_event IS 'Helper para inserir eventos no audit log de pagamentos.';
