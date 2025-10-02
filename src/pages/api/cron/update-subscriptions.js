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

    // Buscar assinaturas que serão bloqueadas ANTES de executar a função
    const blockedUserIds = await getSubscriptionsToBlock();

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

    // Se houve assinaturas bloqueadas, desconectar WhatsApp dos profissionais
    let whatsappDisconnections = [];
    if (blockedUserIds.length > 0) {
      console.log(`Desconectando WhatsApp para ${blockedUserIds.length} usuários bloqueados...`);
      whatsappDisconnections = await disconnectWhatsAppForBlockedUsers(blockedUserIds);
    }

    // Retornar resultado
    return res.status(200).json({
      success: true,
      result: data,
      whatsappDisconnections,
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
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status')
      .not('status', 'is', null);

    if (error) throw error;

    const stats = data.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
}

/**
 * Busca assinaturas que serão bloqueadas para desconectar WhatsApp antes do bloqueio
 */
async function getSubscriptionsToBlock() {
  try {
    const now = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Buscar assinaturas de teste expiradas
    const { data: expiredTestTrials, error: testError } = await supabase
      .from('subscriptions')
      .select('owner_user_id')
      .eq('status', 'test')
      .lt('current_period_end', now.toISOString());

    if (testError) {
      console.error('Erro ao buscar assinaturas de teste expiradas:', testError);
    }

    // Buscar assinaturas ativas vencidas há mais de 2 dias
    const { data: expiredActiveTrials, error: activeError } = await supabase
      .from('subscriptions')
      .select('owner_user_id')
      .eq('status', 'active')
      .lt('current_period_end', twoDaysAgo.toISOString());

    if (activeError) {
      console.error('Erro ao buscar assinaturas ativas expiradas:', activeError);
    }

    // Combinar e remover duplicatas
    const allExpired = [
      ...(expiredTestTrials || []),
      ...(expiredActiveTrials || [])
    ];

    const uniqueUserIds = [...new Set(allExpired.map(sub => sub.owner_user_id))];
    
    console.log(`Encontradas ${uniqueUserIds.length} assinaturas que serão bloqueadas`);
    return uniqueUserIds;

  } catch (error) {
    console.error('Erro ao buscar assinaturas para bloqueio:', error);
    return [];
  }
}

/**
 * Desconecta WhatsApp de todos os profissionais dos usuários bloqueados
 */
async function disconnectWhatsAppForBlockedUsers(userIds) {
  const results = [];

  try {
    // Buscar todos os profissionais dos usuários bloqueados que têm WhatsApp conectado
    const { data: professionals, error: profError } = await supabase
      .from('professionals')
      .select('id, owner_user_id, whatsapp_device_id')
      .in('owner_user_id', userIds)
      .not('whatsapp_device_id', 'is', null);

    if (profError) {
      console.error('Erro ao buscar profissionais:', profError);
      return results;
    }

    console.log(`Encontrados ${professionals.length} profissionais com WhatsApp conectado para desconectar`);

    // Para cada profissional, desconectar o WhatsApp
    for (const professional of professionals) {
      try {
        const disconnectResult = await disconnectProfessionalWhatsApp(professional.id);
        results.push({
          professionalId: professional.id,
          userId: professional.owner_user_id,
          success: disconnectResult.success,
          message: disconnectResult.message
        });
      } catch (error) {
        console.error(`Erro ao desconectar WhatsApp do profissional ${professional.id}:`, error);
        results.push({
          professionalId: professional.id,
          userId: professional.owner_user_id,
          success: false,
          message: error.message
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Erro ao desconectar WhatsApp dos usuários bloqueados:', error);
    return results;
  }
}

/**
 * Desconecta WhatsApp de um profissional específico
 */
async function disconnectProfessionalWhatsApp(professionalId) {
  try {
    // Buscar instância do WhatsApp
    const { data: instance, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('professional_id', professionalId)
      .single();

    if (instanceError || !instance) {
      return {
        success: false,
        message: 'Instância do WhatsApp não encontrada'
      };
    }

    // Configuração da Evolution API
    const evolutionApiUrl = process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY || '';

    if (!evolutionApiKey) {
      return {
        success: false,
        message: 'Chave da Evolution API não configurada'
      };
    }

    // Desconectar na Evolution API
    const disconnectResponse = await fetch(`${evolutionApiUrl}/instance/logout/${encodeURIComponent(instance.instance_key)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      }
    });

    // Se a instância não existe mais (404), considerar como sucesso
    if (!disconnectResponse.ok && disconnectResponse.status !== 404) {
      const errorData = await disconnectResponse.text();
      console.error('Erro ao desconectar na Evolution API:', errorData);
      throw new Error(`Erro ao desconectar: ${disconnectResponse.status} - ${errorData}`);
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
    }

    // Limpar whatsapp_device_id do profissional
    const { error: profUpdateError } = await supabase
      .from('professionals')
      .update({
        whatsapp_device_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', professionalId);

    if (profUpdateError) {
      console.error('Erro ao limpar device_id do profissional:', profUpdateError);
    }

    return {
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    };

  } catch (error) {
    console.error('Erro ao desconectar WhatsApp do profissional:', error);
    return {
      success: false,
      message: error.message
    };
  }
}