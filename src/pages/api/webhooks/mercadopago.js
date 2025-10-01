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

    // Verificar se é uma notificação de assinatura (preapproval)
    if (webhookData.type === 'subscription_preapproval') {
      const preapprovalId = webhookData.data.id;
      console.log('Notificação de assinatura recebida:', preapprovalId);
      
      // Buscar informações da assinatura
      const preapprovalInfo = await getPreapprovalInfo(preapprovalId);
      console.log('Informações da assinatura:', preapprovalInfo);

      // Processar baseado no status da assinatura
      if (preapprovalInfo.status === 'authorized') {
        await handleAuthorizedSubscription(preapprovalInfo);
      } else if (preapprovalInfo.status === 'cancelled') {
        await handleCancelledSubscription(preapprovalInfo);
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
 * Processa assinatura autorizada
 */
async function handleAuthorizedSubscription(preapprovalInfo) {
  try {
    const { external_reference } = preapprovalInfo;
    
    // Extrair user_id e plan_id da external_reference
    const match = external_reference.match(/user_(\w+)_plan_(\w+)/);
    if (!match) {
      console.error('External reference inválida:', external_reference);
      return;
    }

    const userId = match[1];
    const planId = match[2];

    // Atualizar a assinatura do usuário no banco de dados
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        owner_user_id: userId,
        plan: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        mercadopago_preapproval_id: preapprovalInfo.id,
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

  } catch (error) {
    console.error('Erro ao processar assinatura autorizada:', error);
    throw error;
  }
}

/**
 * Processa assinatura cancelada
 */
async function handleCancelledSubscription(preapprovalInfo) {
  try {
    const { external_reference } = preapprovalInfo;
    
    // Extrair user_id da external_reference
    const match = external_reference.match(/user_(\w+)_plan_(\w+)/);
    if (!match) {
      console.error('External reference inválida:', external_reference);
      return;
    }

    const userId = match[1];

    // Cancelar a assinatura do usuário no banco de dados
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('owner_user_id', userId);

    if (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }

    console.log('Assinatura cancelada para usuário:', userId);

  } catch (error) {
    console.error('Erro ao processar cancelamento de assinatura:', error);
    throw error;
  }
}

/**
 * Busca informações da assinatura (preapproval)
 */
async function getPreapprovalInfo(preapprovalId) {
  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar assinatura: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar informações da assinatura:', error);
    throw error;
  }
}