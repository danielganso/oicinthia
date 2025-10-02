import { supabase } from '../../../lib/supabase';

/**
 * API para desconectar WhatsApp da Evolution API
 * 
 * POST /api/evolution/disconnect
 * Body: { professionalId: string }
 * 
 * Retorna: { success: boolean, message: string }
 * 
 * Esta API desconecta a instância do WhatsApp na Evolution API
 * e atualiza o status na tabela evolution_instances.
 */
export default async function handler(req, res) {
  // Apenas método POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação pelo token no cabeçalho
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const { professionalId } = req.body;
    
    if (!professionalId) {
      return res.status(400).json({ error: 'ID do profissional é obrigatório' });
    }

    // Verificar se o profissional pertence ao usuário autenticado
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('id, owner_user_id, whatsapp_device_id')
      .eq('id', professionalId)
      .single();

    if (profError || !professional) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    if (professional.owner_user_id !== user.id) {
      return res.status(403).json({ error: 'Não autorizado a acessar este profissional' });
    }

    // Buscar instância do WhatsApp
    const { data: instance, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('professional_id', professionalId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Instância do WhatsApp não encontrada' });
    }

    // Configuração da Evolution API
    const evolutionApiUrl = process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY || '';

    if (!evolutionApiKey) {
      return res.status(500).json({ error: 'Chave da Evolution API não configurada' });
    }

    // Desconectar na Evolution API
    const disconnectResponse = await fetch(`${evolutionApiUrl}/instance/logout/${encodeURIComponent(instance.instance_key)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      }
    });

    if (!disconnectResponse.ok) {
      const errorData = await disconnectResponse.text();
      console.error('Erro ao desconectar na Evolution API:', errorData);
      
      // Se a instância não existe mais (404), considerar como sucesso
      if (disconnectResponse.status === 404) {
        console.log('Instância não encontrada na Evolution API, considerando como desconectada');
      } else {
        throw new Error(`Erro ao desconectar: ${disconnectResponse.status} - ${errorData}`);
      }
    }

    // Atualizar status na tabela evolution_instances
    const { error: updateError } = await supabase
      .from('evolution_instances')
      .update({
        state: 'disconnected',
        connected_at: null,
        number_e164: null,
        owner_jid: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', instance.id);

    if (updateError) {
      console.error('Erro ao atualizar status da instância:', updateError);
      throw new Error('Erro ao atualizar status da instância');
    }

    // Limpar whatsapp_device_id do profissional se necessário
    const { error: profUpdateError } = await supabase
      .from('professionals')
      .update({
        whatsapp_device_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', professionalId);

    if (profUpdateError) {
      console.error('Erro ao limpar device_id do profissional:', profUpdateError);
      // Não falhar aqui, pois a desconexão já foi feita
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}