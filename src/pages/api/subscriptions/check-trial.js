import { supabase } from '../../../lib/supabase';

/**
 * API endpoint para verificar e atualizar status de assinaturas em teste expiradas
 * Este endpoint deve ser chamado periodicamente (via cron job ou similar)
 */
export default async function handler(req, res) {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Buscar todas as assinaturas com status 'test' que já expiraram
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'test')
      .lt('current_period_end', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return res.status(200).json({ 
        message: 'Nenhuma assinatura de teste expirada encontrada',
        updated: 0
      });
    }

    // Atualizar status para 'blocked' para todas as assinaturas expiradas
    const { data: updatedSubscriptions, error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'blocked',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredTrials.map(sub => sub.id))
      .select();

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ 
      message: `${updatedSubscriptions.length} assinaturas de teste expiradas foram bloqueadas`,
      updated: updatedSubscriptions.length,
      subscriptions: updatedSubscriptions
    });

  } catch (error) {
    console.error('Erro ao verificar assinaturas de teste:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar assinaturas de teste', 
      details: error.message 
    });
  }
}