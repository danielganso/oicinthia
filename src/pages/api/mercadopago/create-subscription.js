import { createSubscriptionPreference } from '../../../lib/mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { userInfo, planInfo } = req.body;

    // Validar dados de entrada
    if (!userInfo || !planInfo) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios não fornecidos',
        required: ['userInfo', 'planInfo']
      });
    }

    if (!userInfo.id || !userInfo.email) {
      return res.status(400).json({ 
        error: 'Informações do usuário incompletas',
        required: ['userInfo.id', 'userInfo.email']
      });
    }

    if (!planInfo.id || !planInfo.name || !planInfo.price) {
      return res.status(400).json({ 
        error: 'Informações do plano incompletas',
        required: ['planInfo.id', 'planInfo.name', 'planInfo.price']
      });
    }

    console.log('=== API ROUTE: CRIANDO ASSINATURA ===');
    console.log('UserInfo recebido:', userInfo);
    console.log('PlanInfo recebido:', planInfo);

    // Criar a assinatura usando a função da lib
    const subscription = await createSubscriptionPreference(userInfo, planInfo);

    console.log('=== API ROUTE: ASSINATURA CRIADA ===');
    console.log('Subscription response:', subscription);

    return res.status(200).json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('=== API ROUTE: ERRO AO CRIAR ASSINATURA ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}