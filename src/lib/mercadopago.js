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

// Função para criar assinatura (preapproval) - CORRIGIDA conforme documentação oficial
export async function createSubscriptionPreference(userInfo, planInfo) {
  try {
    console.log('=== INICIANDO CRIAÇÃO DE ASSINATURA ===');
    console.log('UserInfo:', userInfo);
    console.log('PlanInfo:', planInfo);
    console.log('Access Token:', MERCADOPAGO_CONFIG.accessToken ? 'Configurado' : 'NÃO CONFIGURADO');

    // Verificar se estamos em ambiente de teste
    const isTestEnvironment = MERCADOPAGO_CONFIG.accessToken.includes('TEST-');
    console.log('Ambiente de teste:', isTestEnvironment);

    // Estrutura correta para assinaturas recorrentes usando preapproval
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log('=== DEBUG BASE URL ===');
    console.log('NEXT_PUBLIC_BASE_URL from env:', process.env.NEXT_PUBLIC_BASE_URL);
    console.log('baseUrl final:', baseUrl);
    
    // URL de retorno após pagamento - usando URL válida para teste
    const backUrl = 'https://www.oicinthia.com.br/dashboard';
    console.log('=== DEBUG BACK_URL (HARDCODED) ===');
    console.log('back_url construída:', backUrl);
    console.log('back_url length:', backUrl.length);
    console.log('back_url type:', typeof backUrl);
    
    // URL do webhook para notificações
    const notificationUrl = `${baseUrl}/api/mercadopago/webhook`;
    console.log('=== DEBUG NOTIFICATION_URL ===');
    console.log('notification_url:', notificationUrl);
    
    const preapproval = {
      reason: `Assinatura ${planInfo.name}`,
      external_reference: `user_${userInfo.id}_plan_${planInfo.id}`,
      payer_email: userInfo.email,
      back_url: backUrl,
      notification_url: notificationUrl,
      auto_recurring: {
        frequency: planInfo.frequency || 1,
        frequency_type: planInfo.frequency_type || 'months',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Começar amanhã
        transaction_amount: planInfo.price,
        currency_id: 'BRL'
      }
    };

    console.log('=== DADOS DA ASSINATURA ===');
    console.log('Preapproval object:', JSON.stringify(preapproval, null, 2));
    console.log('URL da API:', `${MERCADOPAGO_CONFIG.baseUrl}/preapproval`);

    const response = await fetch(`${MERCADOPAGO_CONFIG.baseUrl}/preapproval`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preapproval)
    });

    console.log('=== RESPOSTA DA API ===');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== ERRO NA API DO MERCADO PAGO ===');
      console.error('Status:', response.status);
      console.error('Response:', errorText);
      
      // Tentar parsear o erro JSON se possível
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Error JSON:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('Erro não é JSON válido');
      }
      
      throw new Error(`Erro na API do Mercado Pago: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('=== ASSINATURA CRIADA COM SUCESSO ===');
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Verificar se temos o init_point correto
    if (data.init_point) {
      console.log('Init point encontrado:', data.init_point);
    } else if (data.sandbox_init_point) {
      console.log('Sandbox init point encontrado:', data.sandbox_init_point);
    } else {
      console.warn('Nenhum init point encontrado na resposta');
    }

    return data;

  } catch (error) {
    console.error('=== ERRO AO CRIAR ASSINATURA ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    // Em caso de erro, não retornar simulação - deixar o erro aparecer
    throw error;
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