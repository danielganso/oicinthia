-- Trigger para atualizar automaticamente assinaturas de teste expiradas
-- Este trigger roda automaticamente no banco de dados

-- 1. Criar função que atualiza assinaturas expiradas
CREATE OR REPLACE FUNCTION update_expired_trial_subscriptions()
RETURNS void AS $$
BEGIN
  -- 1. Atualizar assinaturas de TESTE que já expiraram (imediato)
  UPDATE subscriptions 
  SET 
    status = 'blocked',
    updated_at = NOW()
  WHERE 
    status = 'test' 
    AND current_period_end < NOW();
    
  -- 2. Atualizar assinaturas ATIVAS que venceram há mais de 2 dias (carência)
  UPDATE subscriptions 
  SET 
    status = 'blocked',
    updated_at = NOW()
  WHERE 
    status = 'active' 
    AND current_period_end < NOW() - INTERVAL '2 days';
    
  -- 3. Atualizar assinaturas ATIVAS vencidas para 'past_due' (dentro dos 2 dias de carência)
  UPDATE subscriptions 
  SET 
    status = 'past_due',
    updated_at = NOW()
  WHERE 
    status = 'active' 
    AND current_period_end < NOW()
    AND current_period_end >= NOW() - INTERVAL '2 days';
    
  -- Log da operação (opcional)
  RAISE NOTICE 'Assinaturas expiradas foram atualizadas: teste->blocked, ativas->past_due/blocked';
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger que roda a cada INSERT/UPDATE na tabela subscriptions
CREATE OR REPLACE FUNCTION trigger_check_expired_trials()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se alguma assinatura precisa ser atualizada
  PERFORM update_expired_trial_subscriptions();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Criar o trigger na tabela subscriptions
DROP TRIGGER IF EXISTS trg_check_expired_trials ON subscriptions;
CREATE TRIGGER trg_check_expired_trials
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_check_expired_trials();

-- 4. ALTERNATIVA: Trigger baseado em tempo (se suportado pelo PostgreSQL)
-- Nota: Nem todos os ambientes PostgreSQL suportam triggers baseados em tempo
-- Esta é uma extensão que pode não estar disponível no Supabase

-- Função para ser chamada periodicamente (via cron job externo ou API)
CREATE OR REPLACE FUNCTION scheduled_update_expired_trials()
RETURNS TABLE(updated_count INTEGER, message TEXT) AS $$
DECLARE
  test_blocked INTEGER := 0;
  active_blocked INTEGER := 0;
  active_past_due INTEGER := 0;
  total_affected INTEGER := 0;
BEGIN
  -- 1. Atualizar assinaturas de TESTE expiradas para 'blocked'
  UPDATE subscriptions 
  SET 
    status = 'blocked',
    updated_at = NOW()
  WHERE 
    status = 'test' 
    AND current_period_end < NOW();
    
  GET DIAGNOSTICS test_blocked = ROW_COUNT;
  
  -- 2. Atualizar assinaturas ATIVAS vencidas há mais de 2 dias para 'blocked'
  UPDATE subscriptions 
  SET 
    status = 'blocked',
    updated_at = NOW()
  WHERE 
    status = 'active' 
    AND current_period_end < NOW() - INTERVAL '2 days';
    
  GET DIAGNOSTICS active_blocked = ROW_COUNT;
  
  -- 3. Atualizar assinaturas ATIVAS vencidas (dentro de 2 dias) para 'past_due'
  UPDATE subscriptions 
  SET 
    status = 'past_due',
    updated_at = NOW()
  WHERE 
    status = 'active' 
    AND current_period_end < NOW()
    AND current_period_end >= NOW() - INTERVAL '2 days';
    
  GET DIAGNOSTICS active_past_due = ROW_COUNT;
  
  total_affected := test_blocked + active_blocked + active_past_due;
  
  RETURN QUERY SELECT 
    total_affected,
    CASE 
      WHEN total_affected = 0 THEN 'Nenhuma assinatura expirada encontrada'
      ELSE format('Atualizadas: %s teste->blocked, %s ativa->blocked, %s ativa->past_due', 
                  test_blocked, active_blocked, active_past_due)
    END;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para verificar assinaturas que vão expirar em breve
CREATE OR REPLACE FUNCTION get_expiring_trials(days_ahead INTEGER DEFAULT 1)
RETURNS TABLE(
  id UUID,
  owner_user_id UUID,
  current_period_end TIMESTAMPTZ,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.owner_user_id,
    s.current_period_end,
    CEIL(EXTRACT(EPOCH FROM (s.current_period_end - NOW())) / 86400)::INTEGER as days_remaining
  FROM subscriptions s
  WHERE 
    s.status = 'test'
    AND s.current_period_end > NOW()
    AND s.current_period_end <= NOW() + INTERVAL '1 day' * days_ahead
  ORDER BY s.current_period_end ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. Executar uma vez para limpar assinaturas já expiradas
SELECT update_expired_trial_subscriptions();

-- INSTRUÇÕES DE USO:
-- 
-- 1. Execute este arquivo SQL no seu banco Supabase
-- 2. O trigger será ativado automaticamente a cada operação na tabela subscriptions
-- 3. Para verificar manualmente: SELECT scheduled_update_expired_trials();
-- 4. Para ver assinaturas que vão expirar: SELECT * FROM get_expiring_trials(3);
--
-- IMPORTANTE: 
-- - O trigger roda a cada INSERT/UPDATE, não baseado em tempo
-- - Para execução baseada em tempo, use um cron job externo chamando scheduled_update_expired_trials()
-- - Teste em ambiente de desenvolvimento primeiro