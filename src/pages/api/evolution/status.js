import { supabase } from '../../../lib/supabase';

/**
 * API para verificar o status da vinculação do WhatsApp
 * 
 * GET /api/evolution/status?professionalId=<id>
 * 
 * Retorna: { connected: boolean, state: string }
 * 
 * Esta API consulta a tabela evolution_instances para obter informações
 * da instância do WhatsApp e atualiza o status na tabela.
 */
export default async function handler(req, res) {
  // Apenas método GET é permitido
  if (req.method !== 'GET') {
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
    
    // Armazenar o ID do usuário para uso posterior
    const userId = user.id;

    const { professionalId, instanceName, forceUpdate, numero_informado } = req.query;
    
    // Verificar se temos o nome da instância ou o ID do profissional
    if (!professionalId && !instanceName) {
      return res.status(400).json({ error: 'ID do profissional ou nome da instância é obrigatório' });
    }

    let instance;
    
    // Se temos o nome da instância, usamos diretamente
    if (instanceName) {
      const { data, error } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('instance_key', instanceName)
        .single();
        
      if (error || !data) {
        return res.status(200).json({ connected: false, state: 'disconnected' });
      }
      
      instance = data;
      
      // Verificar se o usuário tem acesso a esta instância
      const { data: professional, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', instance.professional_id)
        .eq('owner_user_id', userId)
        .single();
        
      if (professionalError || !professional) {
        return res.status(403).json({ error: 'Acesso não autorizado a esta instância' });
      }
    } 
    // Caso contrário, usamos o ID do profissional
    else {
      // Buscar profissional no Supabase
      const { data: professional, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', professionalId)
        .eq('owner_user_id', userId)
        .single();

      if (professionalError || !professional) {
        return res.status(404).json({ error: 'Profissional não encontrado' });
      }

      // Buscar instância na tabela evolution_instances
      const { data, error: instanceError } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('professional_id', professionalId)
        .single();
        
      if (instanceError || !data) {
        return res.status(200).json({ connected: false, state: 'disconnected' });
      }
      
      instance = data;
    }

    // Configuração da Evolution API
    const evolutionApiUrl = process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY || '';

    // Verificar status na Evolution API
    const statusResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${encodeURIComponent(instance.instance_key)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      }
    });

    if (!statusResponse.ok) {
      // Se a instância não existe mais, retornar desconectado
      if (statusResponse.status === 404) {
        return res.status(200).json({ connected: false, state: 'not_found' });
      }
      
      const errorData = await statusResponse.json();
      throw new Error(`Erro ao verificar status: ${errorData.message || statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    
    // Normalizar o status
    const connected = statusData.state === 'open' || statusData.state === 'connected';
    // Manter o estado original da API (open) se for open, caso contrário usar o estado original
    const state = statusData.state === 'open' ? 'open' : statusData.state;
    
    // Capturar ownerJid se disponível na resposta
    const ownerJid = statusData.instance?.owner || null;
    
    // Atualizar o status na tabela evolution_instances
    const updateData = { state };
    
    // Se estiver conectado, atualizar o timestamp connected_at
    if (connected) {
      updateData.connected_at = new Date().toISOString();
      
      // Se o número de telefone estiver disponível, atualizar também
      if (statusData.phone) {
        updateData.number_e164 = statusData.phone;
      }
    }
    
    // Salvar ownerJid na coluna number_1e64 se disponível
    if (ownerJid) {
      updateData.number_1e64 = ownerJid;
      console.log('Salvando ownerJid via status API:', ownerJid);
    }
    
    // Salvar número informado pelo usuário se fornecido
    if (numero_informado) {
      updateData.numero_informado = numero_informado;
      console.log('Salvando número informado via status API:', numero_informado);
    }
    
    // Sempre atualiza quando forceUpdate for true, ou quando o estado mudou
    if (forceUpdate === 'true' || instance.state !== state) {
      const { error: updateError } = await supabase
        .from('evolution_instances')
        .update(updateData)
        .eq('id', instance.id);
        
      if (updateError) {
        console.error('Erro ao atualizar instância:', updateError);
      }
      
      // Se estiver conectado, atualizar o status do profissional
      if (connected && professional.status !== 'active') {
        await supabase
          .from('professionals')
          .update({ status: 'active' })
          .eq('id', professionalId);
      }
    }

    return res.status(200).json({
      connected,
      state,
      instance: {
        id: instance.id,
        instance_key: instance.instance_key,
        number_e164: updateData.number_e164 || instance.number_e164,
        connected_at: updateData.connected_at || instance.connected_at
      }
    });

  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
}