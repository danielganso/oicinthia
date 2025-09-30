import { supabase } from './supabase';

export function checkTrialStatus(subscription) {
  if (!subscription) {
    return {
      isExpired: false,
      isBlocked: false,
      isActive: false,
      isTest: false,
      daysRemaining: 0
    };
  }

  const now = new Date();
  const endDate = new Date(subscription.current_period_end);
  const timeDiff = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return {
    isExpired: now > endDate,
    isBlocked: subscription.status === 'blocked',
    isActive: subscription.status === 'active',
    isTest: subscription.status === 'test',
    daysRemaining: Math.max(0, daysRemaining)
  };
}

/**
 * Atualiza automaticamente assinaturas de teste expiradas para status 'blocked'
 * @param {string} userId - ID do usuário (opcional, se não fornecido verifica todas)
 * @returns {Promise<object>} - Resultado da operação
 */
export async function updateExpiredTrials(userId = null) {
  try {
    // 1. Buscar assinaturas de teste expiradas (mudam direto para blocked)
    let testQuery = supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'test')
      .lt('current_period_end', new Date().toISOString());

    if (userId) {
      testQuery = testQuery.eq('owner_user_id', userId);
    }

    const { data: expiredTestTrials, error: fetchTestError } = await testQuery;

    if (fetchTestError) {
      throw fetchTestError;
    }

    // 2. Buscar assinaturas ativas vencidas há mais de 2 dias (mudam para blocked)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    let expiredActiveQuery = supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', twoDaysAgo.toISOString());

    if (userId) {
      expiredActiveQuery = expiredActiveQuery.eq('owner_user_id', userId);
    }

    const { data: expiredActiveTrials, error: fetchActiveError } = await expiredActiveQuery;

    if (fetchActiveError) {
      throw fetchActiveError;
    }

    let testBlocked = 0;
    let activeBlocked = 0;

    // Atualizar assinaturas de TESTE para 'blocked' (imediatamente após expirar)
    if (expiredTestTrials && expiredTestTrials.length > 0) {
      const { data: updatedTestTrials, error: updateTestError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .in('id', expiredTestTrials.map(sub => sub.id))
        .select();

      if (updateTestError) {
        throw updateTestError;
      }
      testBlocked = updatedTestTrials.length;
    }

    // Atualizar assinaturas ATIVAS vencidas há mais de 2 dias para 'blocked'
    if (expiredActiveTrials && expiredActiveTrials.length > 0) {
      const { data: updatedActiveTrials, error: updateActiveError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .in('id', expiredActiveTrials.map(sub => sub.id))
        .select();

      if (updateActiveError) {
        throw updateActiveError;
      }
      activeBlocked = updatedActiveTrials.length;
    }

    const totalUpdated = testBlocked + activeBlocked;

    if (totalUpdated === 0) {
      return {
        success: true,
        updated: 0,
        message: 'Nenhuma assinatura expirada encontrada',
        details: {
          testBlocked: 0,
          activeBlocked: 0
        }
      };
    }

    return {
      success: true,
      updated: totalUpdated,
      message: `${totalUpdated} assinatura(s) processadas com sucesso`,
      details: {
        testBlocked,
        activeBlocked
      }
    };

  } catch (error) {
    console.error('Erro ao atualizar assinaturas expiradas:', error);
    return {
      success: false,
      updated: 0,
      error: error.message
    };
  }
}

/**
 * Middleware para verificar se o usuário tem acesso às funcionalidades
 * @param {string} userId - ID do usuário
 * @returns {Promise<object>} - Status de acesso
 */
export async function checkUserAccess(userId) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_user_id', userId)
      .single();

    if (error || !subscription) {
      return {
        hasAccess: false,
        accessStatus: 'no_subscription',
        subscription: null,
        message: 'Nenhuma assinatura encontrada'
      };
    }

    const status = checkTrialStatus(subscription);

    // Se é teste e expirou, ou se está bloqueado
    if ((status.isTest && status.isExpired) || status.isBlocked) {
      // Atualizar automaticamente assinaturas expiradas
      await updateExpiredTrials(userId);
      
      return {
        hasAccess: false,
        accessStatus: 'blocked',
        subscription,
        message: getSubscriptionStatusMessage(subscription, status)
      };
    }

    // Se é ativo ou teste válido
    if (status.isActive || (status.isTest && !status.isExpired)) {
      return {
        hasAccess: true,
        accessStatus: 'active',
        subscription,
        message: getSubscriptionStatusMessage(subscription, status)
      };
    }

    // Fallback para casos não cobertos
    return {
      hasAccess: false,
      accessStatus: 'unknown',
      subscription,
      message: 'Status da assinatura não reconhecido'
    };

  } catch (error) {
    console.error('Erro ao verificar acesso do usuário:', error);
    return {
      hasAccess: false,
      accessStatus: 'error',
      subscription: null,
      message: 'Erro ao verificar status da assinatura'
    };
  }
}

/**
 * Formata mensagem de status da assinatura para exibição
 * @param {object} subscription - Dados da assinatura
 * @param {object} status - Status calculado da assinatura
 * @returns {string} - Mensagem formatada
 */
export function getSubscriptionStatusMessage(subscription, status) {
  if (!subscription) {
    return 'Nenhuma assinatura encontrada';
  }

  switch (subscription.status) {
    case 'test':
      if (status.isExpired) {
        return 'Seu período de teste expirou. Para continuar usando o sistema, efetue o pagamento.';
      }
      return `Você está no período de teste. ${status.daysRemaining} dia(s) restante(s).`;
    
    case 'active':
      if (status.isExpired) {
        const now = new Date();
        const endDate = new Date(subscription.current_period_end);
        const daysSinceExpired = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
        const daysUntilBlocked = Math.max(0, 2 - daysSinceExpired);
        
        if (daysUntilBlocked > 0) {
          return `Sua assinatura venceu. Você tem ${daysUntilBlocked} dia(s) para efetuar o pagamento antes do bloqueio.`;
        }
        return 'Sua assinatura será bloqueada em breve por falta de pagamento.';
      }
      return `Assinatura ativa. Próximo vencimento em ${status.daysRemaining} dia(s).`;
    
    case 'blocked':
      return 'Sua conta está bloqueada. Entre em contato com o suporte ou efetue o pagamento para reativar.';
    
    default:
      return 'Status da assinatura não reconhecido';
  }
}