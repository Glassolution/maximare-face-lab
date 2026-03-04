-- =============================================================================
-- MIGRATION: Função de Reconciliação Automática de Pagamentos
-- =============================================================================
-- Cria uma função que detecta e corrige inconsistências entre pagamentos
-- aprovados e status premium nos perfis.
-- 
-- Esta função deve ser executada periodicamente (via cron ou manualmente)
-- para garantir que nenhum pagamento aprovado fique sem premium ativo.
-- =============================================================================

CREATE OR REPLACE FUNCTION reconcile_pending_payments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_healed_count int := 0;
    v_error_count int := 0;
    v_results jsonb := '[]'::jsonb;
    v_plan_type text;
    v_days int;
    v_expires_at timestamptz;
BEGIN
    -- Buscar pagamentos aprovados onde o usuário não tem premium ativo
    FOR v_payment IN
        SELECT 
            p.payment_id,
            p.user_id,
            p.plan_id,
            p.amount,
            p.created_at as payment_created_at,
            p.approved_at,
            pr.is_premium,
            pr.subscription_status,
            pr.subscription_expires_at
        FROM payments p
        LEFT JOIN profiles pr ON pr.id = p.user_id
        WHERE p.status = 'approved'
          AND (
              pr.is_premium IS NULL 
              OR pr.is_premium = false
              OR pr.subscription_status != 'active'
              OR pr.subscription_expires_at IS NULL
              OR pr.subscription_expires_at < now()
          )
        ORDER BY p.created_at DESC
        LIMIT 100  -- Processar em batches para evitar timeout
    LOOP
        BEGIN
            -- Determinar tipo de plano e duração
            SELECT interval INTO v_plan_type
            FROM plans
            WHERE id = v_payment.plan_id;
            
            -- Fallback se plano não encontrado
            IF v_plan_type IS NULL THEN
                v_plan_type := 'monthly';
            END IF;
            
            -- Calcular dias baseado no plano
            v_days := CASE v_plan_type
                WHEN 'weekly' THEN 7
                WHEN 'yearly' THEN 365
                ELSE 30
            END;
            
            -- Calcular data de expiração
            v_expires_at := COALESCE(v_payment.approved_at, v_payment.payment_created_at, now()) + (v_days || ' days')::interval;
            
            -- Atualizar perfil
            UPDATE profiles SET
                is_premium = true,
                subscription_status = 'active',
                subscription_expires_at = v_expires_at,
                plan_type = v_plan_type,
                premium_plan_id = v_payment.plan_id,
                payment_id = v_payment.payment_id,
                payment_status = 'approved',
                payment_provider = 'mercadopago',
                -- Não sobrescrever first_payment_at se já existir
                first_payment_at = COALESCE(first_payment_at, v_payment.payment_created_at),
                last_payment_at = COALESCE(v_payment.approved_at, v_payment.payment_created_at),
                updated_at = now()
            WHERE id = v_payment.user_id;
            
            -- Registrar no audit log
            PERFORM log_payment_event(
                v_payment.payment_id,
                v_payment.user_id,
                'reconciliation_healed',
                'reconciliation',
                v_payment.subscription_status,
                'active',
                true,
                NULL,
                NULL,
                jsonb_build_object(
                    'old_is_premium', v_payment.is_premium,
                    'old_expires_at', v_payment.subscription_expires_at,
                    'new_expires_at', v_expires_at,
                    'plan_type', v_plan_type
                )
            );
            
            v_healed_count := v_healed_count + 1;
            
            v_results := v_results || jsonb_build_object(
                'payment_id', v_payment.payment_id,
                'user_id', v_payment.user_id,
                'action', 'healed',
                'new_expires_at', v_expires_at
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Registrar erro mas continuar com outros pagamentos
            PERFORM log_payment_event(
                v_payment.payment_id,
                v_payment.user_id,
                'reconciliation_failed',
                'reconciliation',
                NULL,
                NULL,
                false,
                NULL,
                SQLERRM,
                NULL
            );
            
            v_error_count := v_error_count + 1;
            
            v_results := v_results || jsonb_build_object(
                'payment_id', v_payment.payment_id,
                'user_id', v_payment.user_id,
                'action', 'error',
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    -- Retornar resumo
    RETURN jsonb_build_object(
        'healed_count', v_healed_count,
        'error_count', v_error_count,
        'total_processed', v_healed_count + v_error_count,
        'details', v_results,
        'executed_at', now()
    );
END;
$$;

COMMENT ON FUNCTION reconcile_pending_payments IS 
'Reconcilia pagamentos aprovados que não resultaram em premium ativo. 
Deve ser executada periodicamente para garantir consistência.
Retorna JSON com contagem de registros corrigidos e erros.';

-- Função para verificar inconsistências SEM corrigir (dry run)
CREATE OR REPLACE FUNCTION check_payment_inconsistencies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
    v_records jsonb;
BEGIN
    SELECT 
        COUNT(*),
        COALESCE(jsonb_agg(jsonb_build_object(
            'payment_id', p.payment_id,
            'user_id', p.user_id,
            'payment_status', p.status,
            'profile_is_premium', pr.is_premium,
            'profile_status', pr.subscription_status,
            'profile_expires_at', pr.subscription_expires_at,
            'payment_created_at', p.created_at
        )), '[]'::jsonb)
    INTO v_count, v_records
    FROM payments p
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE p.status = 'approved'
      AND (
          pr.is_premium IS NULL 
          OR pr.is_premium = false
          OR pr.subscription_status != 'active'
          OR pr.subscription_expires_at IS NULL
          OR pr.subscription_expires_at < now()
      );
    
    RETURN jsonb_build_object(
        'inconsistency_count', v_count,
        'records', v_records,
        'checked_at', now()
    );
END;
$$;

COMMENT ON FUNCTION check_payment_inconsistencies IS 
'Verifica inconsistências entre pagamentos aprovados e status premium SEM corrigir (dry run).
Use reconcile_pending_payments() para efetivamente corrigir.';
