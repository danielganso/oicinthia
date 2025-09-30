import { supabase } from '../../../lib/supabase';
import { pagarmeService } from '../../../lib/pagarme';

/**
 * API endpoint para cancelar uma assinatura
 * @param {object} req - Requisição HTTP
 * @param {object} res - Resposta HTTP
 */
export default async function handler(req, res) {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verifica autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { subscription_id, cancel_at_period_end = false } = req.body;

    if (!subscription_id) {
      return res.status(400).json({ error: 'ID da assinatura é obrigatório' });
    }

    // Busca a assinatura no banco de dados
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', session.user.id)
      .single();

    if (subscriptionError || !subscriptionData) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    // Se for cancelamento imediato
    if (!cancel_at_period_end) {
      // Cancela a assinatura no Pagar.me
      await pagarmeService.cancelSubscription(subscriptionData.pagarme_subscription_id);

      // Atualiza o status no banco de dados
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('id', subscription_id);
    } else {
      // Configura para cancelar no final do período
      await pagarmeService.updateSubscription(subscriptionData.pagarme_subscription_id, {
        cancel_at_period_end: true
      });

      // Atualiza o status no banco de dados
      await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true
        })
        .eq('id', subscription_id);
    }

    return res.status(200).json({ 
      success: true, 
      message: cancel_at_period_end ? 'Assinatura será cancelada ao final do período atual' : 'Assinatura cancelada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura', details: error.message });
  }
}