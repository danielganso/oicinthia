import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== WEBHOOK MERCADO PAGO ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    const { type, data } = req.body;

    // Verificar se é uma notificação de pagamento
    if (type === 'payment') {
      await handlePaymentNotification(data.id);
    }
    
    // Verificar se é uma notificação de preapproval (assinatura)
    if (type === 'preapproval') {
      await handlePreapprovalNotification(data.id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePaymentNotification(paymentId) {
  try {
    console.log('=== PROCESSANDO NOTIFICAÇÃO DE PAGAMENTO ===');
    console.log('Payment ID:', paymentId);

    // Buscar detalhes do pagamento no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    const payment = await response.json();
    console.log('Detalhes do pagamento:', payment);

    // Salvar tentativa de pagamento na tabela payment_attempts
    await savePaymentAttempt(payment);

    if (payment.status === 'approved') {
      // Extrair user_id e plan do external_reference
      const externalRef = payment.external_reference;
      if (externalRef && externalRef.includes('user_') && externalRef.includes('_plan_')) {
        const userId = externalRef.split('user_')[1].split('_plan_')[0];
        const planType = externalRef.split('_plan_')[1];

        console.log('User ID:', userId);
        console.log('Plan Type:', planType);

        // Atualizar assinatura no banco
        await updateSubscriptionStatus(userId, planType, 'active', payment.date_approved);
      }
    }
  } catch (error) {
    console.error('Erro ao processar notificação de pagamento:', error);
  }
}

async function handlePreapprovalNotification(preapprovalId) {
  try {
    console.log('=== PROCESSANDO NOTIFICAÇÃO DE PREAPPROVAL ===');
    console.log('Preapproval ID:', preapprovalId);

    // Buscar detalhes da assinatura no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    const preapproval = await response.json();
    console.log('Detalhes da assinatura:', preapproval);

    // Extrair user_id e plan do external_reference
    const externalRef = preapproval.external_reference;
    if (externalRef && externalRef.includes('user_') && externalRef.includes('_plan_')) {
      const userId = externalRef.split('user_')[1].split('_plan_')[0];
      const planType = externalRef.split('_plan_')[1];

      console.log('User ID:', userId);
      console.log('Plan Type:', planType);

      // Atualizar status baseado no status da assinatura
      if (preapproval.status === 'authorized') {
        await updateSubscriptionStatus(userId, planType, 'active', new Date().toISOString());
      } else if (preapproval.status === 'cancelled') {
        await updateSubscriptionStatus(userId, planType, 'blocked', null);
      }
    }
  } catch (error) {
    console.error('Erro ao processar notificação de preapproval:', error);
  }
}

async function updateSubscriptionStatus(userId, planType, status, paymentDate) {
  try {
    console.log('=== ATUALIZANDO ASSINATURA ===');
    console.log('User ID:', userId);
    console.log('Plan Type:', planType);
    console.log('Status:', status);
    console.log('Payment Date:', paymentDate);

    // Calcular nova data de vencimento (30 dias a partir do pagamento)
    let currentPeriodEnd = null;
    if (status === 'active' && paymentDate) {
      const paymentDateTime = new Date(paymentDate);
      currentPeriodEnd = new Date(paymentDateTime.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 dias
    }

    // Atualizar no banco de dados
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        owner_user_id: userId,
        plan: planType,
        status: status,
        current_period_end: currentPeriodEnd?.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_user_id'
      });

    if (error) {
      console.error('Erro ao atualizar assinatura:', error);
    } else {
      console.log('Assinatura atualizada com sucesso:', data);
    }
  } catch (error) {
    console.error('Erro ao atualizar status da assinatura:', error);
  }
}

async function savePaymentAttempt(payment) {
  try {
    console.log('=== SALVANDO TENTATIVA DE PAGAMENTO ===');
    
    // Extrair user_id do external_reference se disponível
    let userId = null;
    if (payment.external_reference && payment.external_reference.includes('user_')) {
      userId = payment.external_reference.split('user_')[1].split('_plan_')[0];
    }

    // Buscar dados adicionais da tabela subscriptions
    let subscriptionData = null;
    if (userId) {
      const { data } = await supabase
        .from('subscriptions')
        .select('nome, telefone')
        .eq('owner_user_id', userId)
        .single();
      
      subscriptionData = data;
    }

    // Formatar telefone para WhatsApp se disponível
    let telefoneWhatsApp = null;
    if (subscriptionData?.telefone) {
      // Formato: 557582553446@s.whatsapp.net
      telefoneWhatsApp = `55${subscriptionData.telefone}@s.whatsapp.net`;
    }

    const paymentAttempt = {
      payment_id: payment.id.toString(),
      preapproval_id: payment.preapproval_id || null,
      user_id: userId,
      external_reference: payment.external_reference,
      
      // Status do pagamento
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method_id: payment.payment_method_id,
      payment_type_id: payment.payment_type_id,
      
      // Valores
      transaction_amount: payment.transaction_amount,
      currency_id: payment.currency_id,
      
      // Datas
      date_created: payment.date_created,
      date_approved: payment.date_approved,
      date_last_updated: payment.date_last_updated,
      
      // Dados do pagador
      payer_email: payment.payer?.email,
      payer_identification_type: payment.payer?.identification?.type,
      payer_identification_number: payment.payer?.identification?.number,
      
      // Dados adicionais da tabela subscriptions
      nome: subscriptionData?.nome || null,
      telefone_whatsapp: telefoneWhatsApp,
      
      // Metadados
      description: payment.description,
      installments: payment.installments,
      
      webhook_received_at: new Date().toISOString(),
      processed: false
    };

    const { data, error } = await supabase
      .from('payment_attempts')
      .upsert(paymentAttempt, {
        onConflict: 'payment_id'
      });

    if (error) {
      console.error('Erro ao salvar tentativa de pagamento:', error);
    } else {
      console.log('Tentativa de pagamento salva com sucesso:', data);
      console.log('Nome:', subscriptionData?.nome);
      console.log('Telefone WhatsApp:', telefoneWhatsApp);
    }
  } catch (error) {
    console.error('Erro ao salvar tentativa de pagamento:', error);
  }
}