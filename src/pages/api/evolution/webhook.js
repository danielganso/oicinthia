import { supabase } from '../../../lib/supabase';

/**
 * API para receber webhooks da Evolution API
 * 
 * POST /api/evolution/webhook
 * 
 * Este endpoint recebe notificações da Evolution API quando mensagens são recebidas ou enviadas.
 * Os eventos são salvos na tabela evolution_events para processamento posterior.
 */
export default async function handler(req, res) {
  // Apenas método POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Log para debug (remover em produção)
    console.log('Webhook recebido da Evolution API:', req.body);

    // Extrair dados do webhook
    const { event, instance, data } = req.body;
    
    if (!event || !instance) {
      throw new Error('Webhook inválido: evento ou instância não informados');
    }

    // Buscar a instância no banco de dados
    const { data: evolutionInstance, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('id, owner_user_id, professional_id')
      .eq('instance_key', instance)
      .single();

    if (instanceError || !evolutionInstance) {
      throw new Error(`Instância não encontrada: ${instance}`);
    }

    // Salvar o evento na tabela evolution_events
    const eventData = {
      evolution_instance_id: evolutionInstance.id,
      owner_user_id: evolutionInstance.owner_user_id,
      event_type: event,
      external_event_id: data?.id, // ID externo para idempotência, se disponível
      payload: req.body
    };

    const { error: insertError } = await supabase
      .from('evolution_events')
      .insert(eventData);

    if (insertError) {
      // Se for erro de duplicidade (idempotência), apenas ignoramos
      if (!insertError.message.includes('unique constraint')) {
        console.error('Erro ao salvar evento:', insertError);
      }
    }

    // Processar diferentes tipos de eventos
    if (event === 'message.upsert') {
      // Processar mensagem recebida
      // Exemplo: verificar se é uma resposta a um lembrete de consulta
      
      // Implementação futura: 
      // - Verificar se a mensagem contém palavras-chave como "confirmar", "cancelar", etc.
      // - Atualizar o status da consulta no banco de dados
      // - Enviar notificação para o profissional
    }

    // Atualizar o estado da instância se for um evento de status
    if (event === 'status.instance') {
      const state = data?.state;
      if (state) {
        await supabase
          .from('evolution_instances')
          .update({ state })
          .eq('id', evolutionInstance.id);
          
        // Se conectado, atualizar o timestamp
        if (state === 'open' || state === 'connected') {
          await supabase
            .from('evolution_instances')
            .update({ connected_at: new Date().toISOString() })
            .eq('id', evolutionInstance.id);
        }
      }
    }

    // Sempre retornar sucesso para a Evolution API
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Mesmo em caso de erro, retornamos 200 para a Evolution API não reenviar o webhook
    return res.status(200).json({ success: false, error: error.message });
  }
}