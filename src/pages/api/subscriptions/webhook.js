import { supabase } from '../../../lib/supabase';

/**
 * API endpoint para receber webhooks do Pagar.me
 * @param {object} req - Requisição HTTP
 * @param {object} res - Resposta HTTP
 */
export default async function handler(req, res) {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id, type, data } = req.body;

    // Registra o webhook recebido
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_id: id,
        event_type: type,
        payload: req.body
      });

    // Processa diferentes tipos de eventos
    switch (type) {
      case 'subscription.created':
        // Já tratado na criação da assinatura
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(data);
        break;

      case 'subscription.renewed':
        await handleSubscriptionRenewed(data);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(data);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(data);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Mesmo com erro, retornamos 200 para o Pagar.me não reenviar o webhook
    return res.status(200).json({ received: true, error: error.message });
  }
}

/**
 * Processa o cancelamento de uma assinatura
 * @param {object} data - Dados do evento
 */
async function handleSubscriptionCanceled(data) {
  const { subscription } = data;

  // Atualiza o status da assinatura no banco de dados
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    })
    .eq('pagarme_subscription_id', subscription.id);
}

/**
 * Processa a renovação de uma assinatura
 * @param {object} data - Dados do evento
 */
async function handleSubscriptionRenewed(data) {
  const { subscription } = data;

  // Atualiza o período da assinatura no banco de dados
  await supabase
    .from('subscriptions')
    .update({
      current_period_start: subscription.current_cycle.start_at,
      current_period_end: subscription.current_cycle.end_at,
      status: subscription.status
    })
    .eq('pagarme_subscription_id', subscription.id);
}

/**
 * Processa o pagamento de uma fatura
 * @param {object} data - Dados do evento
 */
async function handleInvoicePaid(data) {
  const { invoice } = data;

  // Registra o pagamento no banco de dados
  await supabase
    .from('subscription_invoices')
    .insert({
      pagarme_invoice_id: invoice.id,
      pagarme_subscription_id: invoice.subscription_id,
      status: 'paid',
      amount: invoice.amount,
      paid_at: invoice.paid_at
    });

  // Atualiza o status da assinatura
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('pagarme_subscription_id', invoice.subscription_id);
}

/**
 * Processa a falha no pagamento de uma fatura
 * @param {object} data - Dados do evento
 */
async function handlePaymentFailed(data) {
  const { invoice } = data;

  // Registra a falha no pagamento
  await supabase
    .from('subscription_invoices')
    .insert({
      pagarme_invoice_id: invoice.id,
      pagarme_subscription_id: invoice.subscription_id,
      status: 'failed',
      amount: invoice.amount,
      failed_at: new Date().toISOString()
    });

  // Atualiza o status da assinatura
  await supabase
    .from('subscriptions')
    .update({
      status: 'payment_failed',
      updated_at: new Date().toISOString()
    })
    .eq('pagarme_subscription_id', invoice.subscription_id);
}