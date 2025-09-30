import { processWebhook, getPaymentInfo } from '../../../lib/mercadopago';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const webhookData = req.body;
    console.log('Webhook recebido do Mercado Pago:', webhookData);

    // Verificar se é uma notificação de pagamento
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data.id;
      
      // Buscar informações detalhadas do pagamento
      const paymentInfo = await getPaymentInfo(paymentId);
      console.log('Informações do pagamento:', paymentInfo);

      // Processar o pagamento baseado no status
      if (paymentInfo.status === 'approved') {
        await handleApprovedPayment(paymentInfo);
      } else if (paymentInfo.status === 'rejected') {
        await handleRejectedPayment(paymentInfo);
      } else if (paymentInfo.status === 'pending') {
        await handlePendingPayment(paymentInfo);
      }
    }

    // Processar o webhook
    const result = await processWebhook(webhookData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      result 
    });

  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}

/**
 * Processa pagamento aprovado
 */
async function handleApprovedPayment(paymentInfo) {
  try {
    const { external_reference, metadata } = paymentInfo;
    
    if (!metadata || !metadata.user_id || !metadata.plan_id) {
      console.error('Metadados incompletos no pagamento:', paymentInfo);
      return;
    }

    const userId = metadata.user_id;
    const planId = metadata.plan_id;

    // Atualizar a assinatura do usuário no banco de dados
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        owner_user_id: userId,
        plan: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        mercadopago_payment_id: paymentInfo.id,
        mercadopago_external_reference: external_reference,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_user_id'
      });

    if (error) {
      console.error('Erro ao atualizar assinatura:', error);
      throw error;
    }

    console.log('Assinatura ativada com sucesso para usuário:', userId);

    // TODO: Enviar email de confirmação para o usuário
    // TODO: Registrar log de ativação da assinatura

  } catch (error) {
    console.error('Erro ao processar pagamento aprovado:', error);
    throw error;
  }
}

/**
 * Processa pagamento rejeitado
 */
async function handleRejectedPayment(paymentInfo) {
  try {
    const { metadata } = paymentInfo;
    
    if (!metadata || !metadata.user_id) {
      console.error('Metadados incompletos no pagamento rejeitado:', paymentInfo);
      return;
    }

    console.log('Pagamento rejeitado para usuário:', metadata.user_id);

    // TODO: Notificar usuário sobre pagamento rejeitado
    // TODO: Registrar tentativa de pagamento falhada

  } catch (error) {
    console.error('Erro ao processar pagamento rejeitado:', error);
    throw error;
  }
}

/**
 * Processa pagamento pendente
 */
async function handlePendingPayment(paymentInfo) {
  try {
    const { metadata } = paymentInfo;
    
    if (!metadata || !metadata.user_id) {
      console.error('Metadados incompletos no pagamento pendente:', paymentInfo);
      return;
    }

    console.log('Pagamento pendente para usuário:', metadata.user_id);

    // TODO: Notificar usuário sobre pagamento pendente
    // TODO: Registrar status pendente

  } catch (error) {
    console.error('Erro ao processar pagamento pendente:', error);
    throw error;
  }
}