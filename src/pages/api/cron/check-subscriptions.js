import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  // Verificar se é uma requisição GET ou POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== VERIFICAÇÃO MENSAL DE ASSINATURAS ===');
    
    // Buscar todas as assinaturas ativas que estão próximas do vencimento ou vencidas
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
    
    console.log('Data atual:', now.toISOString());
    console.log('Data limite (2 dias atrás):', twoDaysAgo.toISOString());

    // Buscar assinaturas que venceram há mais de 2 dias
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', twoDaysAgo.toISOString());

    if (expiredError) {
      console.error('Erro ao buscar assinaturas vencidas:', expiredError);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log(`Encontradas ${expiredSubscriptions.length} assinaturas vencidas`);

    // Processar cada assinatura vencida
    const results = [];
    for (const subscription of expiredSubscriptions) {
      try {
        console.log(`Processando assinatura: ${subscription.id}`);
        
        // Verificar status no Mercado Pago
        const mpStatus = await checkMercadoPagoSubscriptionStatus(subscription.pagarme_subscription_id);
        
        if (mpStatus === 'cancelled' || mpStatus === 'paused') {
          // Bloquear assinatura
          await blockSubscription(subscription.id, subscription.owner_user_id);
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.owner_user_id,
            action: 'blocked',
            reason: 'Assinatura cancelada ou pausada no Mercado Pago'
          });
        } else if (mpStatus === 'authorized') {
          // Verificar se há pagamentos recentes
          const hasRecentPayment = await checkRecentPayments(subscription.pagarme_subscription_id);
          
          if (!hasRecentPayment) {
            // Bloquear por falta de pagamento
            await blockSubscription(subscription.id, subscription.owner_user_id);
            results.push({
              subscriptionId: subscription.id,
              userId: subscription.owner_user_id,
              action: 'blocked',
              reason: 'Sem pagamento há mais de 2 dias'
            });
          } else {
            results.push({
              subscriptionId: subscription.id,
              userId: subscription.owner_user_id,
              action: 'kept_active',
              reason: 'Pagamento recente encontrado'
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao processar assinatura ${subscription.id}:`, error);
        results.push({
          subscriptionId: subscription.id,
          userId: subscription.owner_user_id,
          action: 'error',
          reason: error.message
        });
      }
    }

    console.log('Resultados do processamento:', results);
    
    res.status(200).json({
      success: true,
      processedCount: expiredSubscriptions.length,
      results: results
    });

  } catch (error) {
    console.error('Erro na verificação de assinaturas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkMercadoPagoSubscriptionStatus(subscriptionId) {
  try {
    if (!subscriptionId) return null;
    
    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error('Erro ao consultar Mercado Pago:', response.status);
      return null;
    }

    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error('Erro ao verificar status no Mercado Pago:', error);
    return null;
  }
}

async function checkRecentPayments(subscriptionId) {
  try {
    if (!subscriptionId) return false;
    
    // Buscar pagamentos dos últimos 35 dias
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${subscriptionId}&begin_date=${thirtyFiveDaysAgo.toISOString()}&end_date=${new Date().toISOString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error('Erro ao buscar pagamentos:', response.status);
      return false;
    }

    const data = await response.json();
    
    // Verificar se há pagamentos aprovados recentes
    const approvedPayments = data.results?.filter(payment => 
      payment.status === 'approved' && 
      new Date(payment.date_approved) > thirtyFiveDaysAgo
    );

    return approvedPayments && approvedPayments.length > 0;
  } catch (error) {
    console.error('Erro ao verificar pagamentos recentes:', error);
    return false;
  }
}

async function blockSubscription(subscriptionId, userId) {
  try {
    console.log(`Bloqueando assinatura ${subscriptionId} do usuário ${userId}`);
    
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'blocked',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Erro ao bloquear assinatura:', error);
      throw error;
    }

    console.log('Assinatura bloqueada com sucesso');
    return data;
  } catch (error) {
    console.error('Erro ao bloquear assinatura:', error);
    throw error;
  }
}