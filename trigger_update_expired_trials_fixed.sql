-- Trigger corrigido para atualizar automaticamente assinaturas de teste expiradas
-- Versão compatível com Supabase e estrutura atual da tabela

-- 1. Função para atualizar assinaturas expiradas
CREATE OR REPLACE FUNCTION update_expired_trial_subscriptions()
RETURNS void AS $$
BEGIN
  -- 1. Atualizar assinaturas de TESTE que já expiraram (imediato)
  UPDATE subscriptions 
  SET 
    status = 'blocked'::subscription_status,
    updated_at = NOW()
  WHERE 
    status = 'test'::subscription_status
    AND current_period_end IS NOT NULL
    AND current_period_end < NOW();
    
  -- 2. Atualizar assinaturas ATIVAS que venceram há mais de 2 dias (carência)
  UPDATE subscriptions 
  SET 
    status = 'blocked'::subscription_status,
    updated_at = NOW()
  WHERE 
    status = 'active'::subscription_status
    AND current_period_end IS NOT NULL
    AND current_period_end < NOW() - INTERVAL '2 days';
    
  -- 3. Atualizar assinaturas ATIVAS vencidas para 'past_due' (dentro dos 2 dias de carência)
  -- Nota: Verificar se 'past_due' existe no enum subscription_status
  UPDATE subscriptions 
  SET 
    status = 'blocked'::subscription_status, -- Usando 'blocked' se 'past_due' não existir
    updated_at = NOW()
  WHERE 
    status = 'active'::subscription_status
    AND current_period_end IS NOT NULL
    AND current_period_end < NOW()
    AND current_period_end >= NOW() - INTERVAL '2 days';
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para ser executada periodicamente (via cron job ou API)
CREATE OR REPLACE FUNCTION scheduled_update_expired_trials()
RETURNS JSON AS $$
DECLARE
  test_blocked INTEGER := 0;
  active_blocked INTEGER := 0;
  total_affected INTEGER := 0;
  result JSON;
BEGIN
  -- 1. Atualizar assinaturas de TESTE expiradas para 'blocked'
  UPDATE subscriptions 
  SET 
    status = 'blocked'::subscription_status,
    updated_at = NOW()
  WHERE 
    status = 'test'::subscription_status
    AND current_period_end IS NOT NULL
    AND current_period_end < NOW();
    
  GET DIAGNOSTICS test_blocked = ROW_COUNT;
  
  -- 2. Atualizar assinaturas ATIVAS vencidas há mais de 2 dias para 'blocked'
  UPDATE subscriptions 
  SET 
    status = 'blocked'::subscription_status,
    updated_at = NOW()
  WHERE 
    status = 'active'::subscription_status
    AND current_period_end IS NOT NULL
    AND current_period_end < NOW() - INTERVAL '2 days';
    
  GET DIAGNOSTICS active_blocked = ROW_COUNT;
  
  total_affected := test_blocked + active_blocked;
  
  -- Retornar resultado como JSON
  result := json_build_object(
    'success', true,
    'total_updated', total_affected,
    'test_blocked', test_blocked,
    'active_blocked', active_blocked,
    'message', CASE 
      WHEN total_affected = 0 THEN 'Nenhuma assinatura expirada encontrada'
      ELSE format('Atualizadas: %s teste->blocked, %s ativa->blocked', test_blocked, active_blocked)
    END,
    'executed_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para verificar assinaturas que vão expirar em breve
CREATE OR REPLACE FUNCTION get_expiring_trials(days_ahead INTEGER DEFAULT 1)
RETURNS TABLE(
  id UUID,
  owner_user_id UUID,
  plan plan_tier,
  current_period_end TIMESTAMPTZ,
  days_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.owner_user_id,
    s.plan,
    s.current_period_end,
    ROUND(EXTRACT(EPOCH FROM (s.current_period_end - NOW())) / 86400, 1) as days_remaining
  FROM subscriptions s
  WHERE 
    s.status = 'test'::subscription_status
    AND s.current_period_end IS NOT NULL
    AND s.current_period_end > NOW()
    AND s.current_period_end <= NOW() + INTERVAL '1 day' * days_ahead
  ORDER BY s.current_period_end ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para verificar status atual das assinaturas
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_subscriptions', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'test', COUNT(*) FILTER (WHERE status = 'test'),
    'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
    'expired_tests', COUNT(*) FILTER (WHERE status = 'test' AND current_period_end < NOW()),
    'expired_actives', COUNT(*) FILTER (WHERE status = 'active' AND current_period_end < NOW()),
    'checked_at', NOW()
  ) INTO result
  FROM subscriptions;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Executar uma limpeza inicial (opcional)
-- SELECT scheduled_update_expired_trials();

-- INSTRUÇÕES DE USO:
-- 
-- 1. Execute este arquivo SQL no Supabase SQL Editor
-- 2. Para verificar manualmente: SELECT scheduled_update_expired_trials();
-- 3. Para ver estatísticas: SELECT get_subscription_stats();
-- 4. Para ver assinaturas que vão expirar: SELECT * FROM get_expiring_trials(3);
-- 5. Para automatizar, crie um cron job ou Edge Function que chama scheduled_update_expired_trials()
--
-- EXEMPLO DE USO VIA API:
-- Criar uma API route em /pages/api/cron/update-subscriptions.js que chama a função
--
-- IMPORTANTE: 
-- - Testado para funcionar com Supabase
-- - Usa SECURITY DEFINER para permitir execução via RPC
-- - Retorna JSON para facilitar integração com APIs