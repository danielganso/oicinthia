import { supabase } from '../../../lib/supabase';
import { pagarmeService } from '../../../lib/pagarme';

/**
 * API endpoint para criar uma assinatura
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

    const { plan_id, card_data, customer_data } = req.body;

    if (!plan_id || !card_data || !customer_data) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Cria o cliente no Pagar.me
    const customer = await pagarmeService.createCustomer({
      name: customer_data.name,
      email: customer_data.email,
      document: customer_data.document,
      phone: customer_data.phone
    });

    // Cria o cartão no Pagar.me
    const card = await pagarmeService.createCard(customer.id, {
      number: card_data.number,
      holder_name: card_data.holder_name,
      exp_month: card_data.exp_month,
      exp_year: card_data.exp_year,
      cvv: card_data.cvv,
      address: card_data.address,
      zip_code: card_data.zip_code,
      city: card_data.city,
      state: card_data.state
    });

    // Cria a assinatura no Pagar.me
    const subscription = await pagarmeService.createSubscription({
      customer_id: customer.id,
      card_id: card.id,
      plan_id,
      user_id: session.user.id
    });

    // Salva a assinatura no banco de dados
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: session.user.id,
        pagarme_subscription_id: subscription.id,
        pagarme_customer_id: customer.id,
        pagarme_card_id: card.id,
        plan_id,
        status: subscription.status,
        current_period_start: subscription.current_cycle.start_at,
        current_period_end: subscription.current_cycle.end_at,
        cancel_at_period_end: false
      })
      .select();

    if (subscriptionError) {
      // Se houver erro ao salvar no banco, tenta cancelar a assinatura no Pagar.me
      await pagarmeService.cancelSubscription(subscription.id);
      throw subscriptionError;
    }

    return res.status(200).json({ 
      success: true, 
      subscription: subscriptionData[0],
      pagarme_subscription: subscription
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao criar assinatura', details: error.message });
  }
}