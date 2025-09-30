// Biblioteca para integração com Mercado Pago
// Esta é uma estrutura inicial que será expandida quando as credenciais estiverem disponíveis

const MERCADOPAGO_CONFIG = {
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || 'TEST-your-public-key',
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-your-access-token',
  baseUrl: 'https://api.mercadopago.com',
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || 'your-webhook-secret'
};

// Configuração dos planos
const PLAN_CONFIGS = {
  autonomo: {
    id: 'autonomo',
    name: 'Plano Autônomo',
    price: 97.00,
    currency: 'BRL',
    frequency: 1,
    frequency_type: 'months',
    description: 'Plano para profissionais autônomos - 1 profissional'
  },
  ate_3: {
    id: 'ate_3',
    name: 'Plano Clínica Pequena',
    price: 197.00,
    currency: 'BRL',
    frequency: 1,
    frequency_type: 'months',
    description: 'Plano para clínicas pequenas - até 3 profissionais'
  },
  ate_5: {
    id: 'ate_5',
    name: 'Plano Clínica Média',
    price: 297.00,
    currency: 'BRL',
    frequency: 1,
    frequency_type: 'months',
    description: 'Plano para clínicas médias - até 5 profissionais'
  }
};

// Função para criar preferência de assinatura
export async function createSubscriptionPreference(userInfo, planInfo) {
  try {
    const preference = {
      items: [
        {
          title: `Assinatura ${planInfo.name}`,
          description: `Plano ${planInfo.name} - ${planInfo.features.join(', ')}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: planInfo.price
        }
      ],
      payer: {
        name: userInfo.name,
        email: userInfo.email,
        identification: {
          type: 'CPF',
          number: userInfo.cpf || '00000000000'
        }
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/subscriptions?status=success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/subscriptions?status=failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/subscriptions?status=pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
      external_reference: `user_${userInfo.id}_plan_${planInfo.id}`,
      metadata: {
        user_id: userInfo.id,
        plan_id: planInfo.id,
        plan_name: planInfo.name
      }
    };

    const response = await fetch(`${MERCADOPAGO_CONFIG.baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    
    // Retorna uma preferência simulada para desenvolvimento
    return {
      id: 'simulated-preference-id',
      init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=simulated-preference-id',
      sandbox_init_point: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=simulated-preference-id'
    };
  }
}

/**
 * Processa o webhook do Mercado Pago
 * @param {object} webhookData - Dados recebidos do webhook
 * @returns {Promise<object>} - Resultado do processamento
 */
export async function processWebhook(webhookData) {
  try {
    // TODO: Implementar processamento real do webhook
    console.log('Processando webhook do Mercado Pago:', webhookData);
    
    // Estrutura básica para processamento futuro
    const result = {
      processed: true,
      paymentId: webhookData.data?.id,
      status: webhookData.action,
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    throw error;
  }
}

/**
 * Obtém informações de um pagamento
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<object>} - Informações do pagamento
 */
export async function getPaymentInfo(paymentId) {
  try {
    // TODO: Implementar busca real de pagamento quando as credenciais estiverem disponíveis
    /*
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_CONFIG.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar pagamento: ${response.status}`);
    }

    return await response.json();
    */

    // Por enquanto, retorna dados simulados
    return {
      id: paymentId,
      status: 'approved',
      status_detail: 'accredited',
      external_reference: `subscription_${Date.now()}`,
      metadata: {
        user_id: 'user_123',
        plan_id: 'autonomo'
      }
    };
  } catch (error) {
    console.error('Erro ao obter informações do pagamento:', error);
    throw error;
  }
}

export { PLAN_CONFIGS };