import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  // Permitir apenas POST para segurança
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar se há uma chave de autorização (opcional, para segurança)
    const authKey = req.headers.authorization;
    const expectedKey = process.env.CRON_SECRET_KEY;
    
    if (expectedKey && authKey !== `Bearer ${expectedKey}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    console.log('Iniciando atualização de assinaturas expiradas...');

    // Chamar a função do banco de dados
    const { data, error } = await supabase.rpc('scheduled_update_expired_trials');

    if (error) {
      console.error('Erro ao executar scheduled_update_expired_trials:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('Resultado da atualização:', data);

    // Retornar resultado
    return res.status(200).json({
      success: true,
      result: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na API de atualização de assinaturas:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Função auxiliar para verificar estatísticas (opcional)
export async function getSubscriptionStats() {
  try {
    const { data, error } = await supabase.rpc('get_subscription_stats');
    
    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro na função getSubscriptionStats:', error);
    return null;
  }
}