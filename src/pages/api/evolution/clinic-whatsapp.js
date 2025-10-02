import { supabase } from '../../../lib/supabase';

/**
 * API para gerenciar WhatsApp da clínica para planos ate_3 e ate_5
 * 
 * POST /api/evolution/clinic-whatsapp
 * Body: { action: 'connect' | 'disconnect' | 'status' }
 * 
 * Esta API gerencia a instância única do WhatsApp para toda a clínica
 * em planos ate_3 e ate_5, usando o public_code da subscription.
 */

const TIMEOUT_MS = 15000;
const withTimeout = (p) =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Timeout na Evolution API')), TIMEOUT_MS)
    ),
  ]);

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return { data: text ? JSON.parse(text) : null, raw: text }; }
  catch { return { data: null, raw: text }; }
}

const trimBase = (u) => (u || '').replace(/\/+$/, '');

function toDataUrl(maybeImg) {
  if (!maybeImg) return '';
  const s = String(maybeImg).trim();
  if (s.startsWith('data:image/')) return s; // dataURL
  if (/^<svg[\s\S]*<\/svg>$/i.test(s)) return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(s) && s.replace(/\s+/g, '').length > 100)
    return 'data:image/png;base64,' + s.replace(/\s+/g, '');
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

function deepPick(obj, paths) {
  for (const path of paths) {
    let ref = obj;
    for (const p of path.split('.')) {
      if (ref && typeof ref === 'object' && p in ref) ref = ref[p];
      else { ref = undefined; break; }
    }
    if (ref != null && ref !== '') return ref;
  }
  return undefined;
}

const pickQr = (o) => {
  if (!o || typeof o !== 'object') return '';
  let raw =
    deepPick(o, [
      'dataURL', 'dataUrl', 'qrcode', 'image', 'base64',
      'data.dataURL', 'data.dataUrl', 'data.qrcode', 'data.image', 'data.base64',
      'response.dataURL', 'response.dataUrl', 'response.qrcode', 'response.image', 'response.base64',
      'result.dataURL', 'result.dataUrl', 'result.qrcode', 'result.image', 'result.base64'
    ]);
  if (raw && typeof raw === 'object') {
    raw = raw.dataURL || raw.dataUrl || raw.image || raw.svg || raw.base64 || raw.qrcode || '';
  }
  const url = toDataUrl(raw);
  if (url) return url;

  const svg = deepPick(o, [
    'qrcode.svg', 'data.qrcode.svg', 'response.qrcode.svg', 'result.qrcode.svg'
  ]);
  if (svg) return toDataUrl(svg);

  const b64 = deepPick(o, [
    'qrcode.base64', 'data.qrcode.base64', 'response.qrcode.base64', 'result.qrcode.base64'
  ]);
  if (b64) return toDataUrl(b64);

  return '';
};

const isConnectedState = (s) => s === 'connected' || s === 'open';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
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

    const { action } = req.body;
    
    if (!action || !['connect', 'disconnect', 'status'].includes(action)) {
      return res.status(400).json({ error: 'Ação inválida. Use: connect, disconnect ou status' });
    }

    // Buscar subscription para verificar o plano
    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .select('plan, public_code')
      .eq('owner_user_id', user.id)
      .single();

    if (subErr || !subscription) {
      return res.status(404).json({ error: 'Subscription não encontrada' });
    }

    // Verificar se é plano ate_3 ou ate_5
    const isClinicPlan = subscription.plan === 'ate_3' || subscription.plan === 'ate_5';
    
    if (!isClinicPlan) {
      return res.status(403).json({ error: 'Esta funcionalidade é apenas para planos ate_3 e ate_5' });
    }

    if (!subscription.public_code) {
      return res.status(400).json({ error: 'Código público da clínica não encontrado' });
    }

    // Configuração da Evolution API
    const EV_BASE = trimBase(process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br');
    const EV_KEY = process.env.EVOLUTION_API_KEY || '';
    
    if (!EV_KEY) {
      return res.status(500).json({ error: 'Chave da Evolution API não configurada' });
    }

    // Buscar instância existente da clínica
    console.log('Buscando instância para:', {
      owner_user_id: user.id,
      instance_key: subscription.public_code,
      action: action
    });

    const { data: instances, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('owner_user_id', user.id)
      .eq('instance_key', subscription.public_code);

    console.log('Instâncias encontradas:', instances?.length || 0);
    console.log('Erro na busca:', instanceError);

    // Para clínicas, pegamos a primeira instância (todas têm o mesmo instance_key)
    const instance = instances && instances.length > 0 ? instances[0] : null;

    if (action === 'status') {
      if (!instance) {
        return res.status(200).json({
          connected: false,
          state: 'not_configured',
          hasInstance: false
        });
      }

      // Verificar status na Evolution API usando o mesmo endpoint que funciona no check-connection
      try {
        const statusRes = await withTimeout(fetch(`${EV_BASE}/instance/fetchInstances?instanceName=${encodeURIComponent(instance.instance_key)}`, {
          headers: { apikey: EV_KEY, 'Cache-Control': 'no-cache' }
        }));

        if (statusRes.ok) {
          const text = await statusRes.text();
          let arr;
          try { arr = JSON.parse(text); } catch { arr = []; }
          const statusData = Array.isArray(arr) && arr.length ? arr[0] : null;
          
          if (statusData) {
            const connectionStatusRaw = statusData.connectionStatus || '';
            const connectionStatus = String(connectionStatusRaw).toLowerCase();
            const state = connectionStatus || instance.state || 'disconnected';
            const connected = connectionStatus === 'open';

            console.log('=== DEBUG OWNER_JID CAPTURE ===');
            console.log('statusData completo:', JSON.stringify(statusData, null, 2));

            // Capturar owner_jid da resposta da Evolution API (estrutura correta)
            const ownerJid = statusData.ownerJid || statusData.owner?.jid || null;
            const numberE164 = ownerJid ? `+${ownerJid.split('@')[0].replace(/[^\d]/g, '')}` : null;

            console.log('ownerJid capturado:', ownerJid);
            console.log('numberE164 formatado:', numberE164);

            // Preparar dados de atualização
            const updateData = {
              state: state,
              connected_at: connected ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            };

            // Adicionar owner_jid e number_e164 se disponíveis
            if (ownerJid) {
              updateData.owner_jid = ownerJid;
              console.log('owner_jid adicionado ao updateData:', ownerJid);
            } else {
              console.log('owner_jid NÃO encontrado na resposta da API');
            }
            if (numberE164) {
              updateData.number_e164 = numberE164;
              console.log('number_e164 adicionado ao updateData:', numberE164);
            }

            console.log('updateData final:', JSON.stringify(updateData, null, 2));

            // Atualizar estado na base de dados para todas as instâncias do owner_user_id
            const updateResult = await supabase
              .from('evolution_instances')
              .update(updateData)
              .eq('owner_user_id', user.id);

            console.log('Resultado da atualização no banco:', updateResult);
            console.log('=== FIM DEBUG OWNER_JID ===');

            return res.status(200).json({
              connected,
              state,
              hasInstance: true,
              instanceKey: instance.instance_key,
              ownerJid,
              number_e164: numberE164
            });
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }

      return res.status(200).json({
        connected: false,
        state: instance.state || 'disconnected',
        hasInstance: true,
        instanceKey: instance.instance_key
      });
    }

    if (action === 'disconnect') {
      console.log('Tentando desconectar instância:', instance ? 'encontrada' : 'não encontrada');
      
      if (!instance) {
        console.error('Instância não encontrada para desconexão:', {
          owner_user_id: user.id,
          instance_key: subscription.public_code
        });
        return res.status(404).json({ error: 'Instância não encontrada' });
      }

      console.log('Desconectando instância:', {
        instance_key: instance.instance_key,
        instance_name: instance.instance_name,
        state: instance.state
      });

      try {
        // Desconectar na Evolution API
        const disconnectRes = await withTimeout(fetch(`${EV_BASE}/instance/logout/${encodeURIComponent(instance.instance_key)}`, {
          method: 'DELETE',
          headers: { apikey: EV_KEY }
        }));

        console.log('Resposta da Evolution API:', disconnectRes.status);

        // Atualizar estado na base de dados para todas as instâncias do owner_user_id
        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({ 
            state: 'disconnected',
            connected_at: null
          })
          .eq('owner_user_id', user.id);

        if (updateError) {
          console.error('Erro ao atualizar estado das instâncias:', updateError);
        } else {
          console.log('Estado das instâncias atualizado com sucesso');
        }

        return res.status(200).json({
          success: true,
          message: 'WhatsApp desconectado com sucesso'
        });
      } catch (error) {
        console.error('Erro ao desconectar:', error);
        return res.status(500).json({ error: 'Erro ao desconectar WhatsApp' });
      }
    }

    if (action === 'connect') {
      // Se já existe instância, obter QR code
      if (instance) {
        try {
          const qrRes = await withTimeout(fetch(`${EV_BASE}/instance/connect/${encodeURIComponent(instance.instance_key)}`, {
            headers: { apikey: EV_KEY }
          }));

          if (qrRes.ok) {
            const { data: qrJson } = await parseJsonSafe(qrRes);
            const qrImage = pickQr(qrJson);

            // Atualizar timestamp do QR
            await supabase
              .from('evolution_instances')
              .update({ last_qr_at: new Date().toISOString() })
              .eq('id', instance.id);

            return res.status(200).json({
              instanceKey: instance.instance_key,
              qrImage,
              state: instance.state || 'qr',
              connected: isConnectedState(instance.state)
            });
          }
        } catch (error) {
          console.error('Erro ao obter QR:', error);
        }
      }

      // Criar nova instância se não existir
      const instanceKey = subscription.public_code;
      
      // Webhook n8n
      const isProd = process.env.NODE_ENV === 'production';
      const baseUrl = isProd
        ? process.env.N8N_WEBHOOK_URL_PROD
        : process.env.N8N_WEBHOOK_URL_TEST;
      const webhookUrl = `${baseUrl}/${encodeURIComponent(instanceKey)}`;

      try {
        // Buscar todos os profissionais da clínica
        console.log('Buscando profissionais para owner_user_id:', user.id);
        
        // Primeiro, buscar TODOS os profissionais para debug
        const { data: allProfessionals, error: allProfError } = await supabase
          .from('professionals')
          .select('id, name, status, owner_user_id')
          .eq('owner_user_id', user.id);

        console.log('TODOS os profissionais encontrados:', allProfessionals);
        console.log('Erro na consulta geral:', allProfError);

        // Agora buscar apenas os ativos
        const { data: professionals, error: profError } = await supabase
          .from('professionals')
          .select('id, name, status, owner_user_id')
          .eq('owner_user_id', user.id)
          .eq('status', 'active');

        console.log('Profissionais ATIVOS encontrados:', professionals);
        console.log('Erro na consulta de ativos:', profError);

        if (profError) {
          console.error('Erro ao buscar profissionais:', profError);
          return res.status(500).json({ 
            error: 'Erro ao buscar profissionais da clínica',
            details: profError
          });
        }

        if (!professionals || professionals.length === 0) {
          console.log('Nenhum profissional ATIVO encontrado.');
          console.log('Total de profissionais (todos):', allProfessionals?.length || 0);
          
          return res.status(400).json({ 
            error: 'Nenhum profissional ativo encontrado para criar a instância da clínica',
            details: {
              message: 'Para usar o WhatsApp da clínica, você precisa ter pelo menos um profissional com status "active".',
              totalProfessionals: allProfessionals?.length || 0,
              activeProfessionals: 0,
              allProfessionals: allProfessionals || []
            }
          });
        }

        console.log('Profissionais ativos encontrados:', professionals.length);
        console.log('Detalhes dos profissionais:', professionals);

        // Usar o public_code da clínica como instance_key único
        const clinicInstanceKey = subscription.public_code;
        const clinicWebhookUrl = `${baseUrl}/${encodeURIComponent(clinicInstanceKey)}`;
        
        console.log('Instance key da clínica:', clinicInstanceKey);

        // Criar APENAS UMA instância no Evolution API para a clínica
        const createBody = {
          instanceName: clinicInstanceKey,
          qrcode: true,
          groupsIgnore: true,
          integration: 'WHATSAPP-BAILEYS',
          browser: ['CinthIA Clinica', 'Chrome', '10.0']
        };

        const createRes = await withTimeout(fetch(`${EV_BASE}/instance/create`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', apikey: EV_KEY },
          body: JSON.stringify(createBody)
        }));

        if (!createRes.ok) {
          const { data: errorData } = await parseJsonSafe(createRes);
          console.error('Erro ao criar instância da clínica:', errorData);
          return res.status(500).json({ error: 'Erro ao criar instância no Evolution API' });
        }

        // Configurar webhook para a instância da clínica
        const webhookPayload = {
          webhook: {
            url: clinicWebhookUrl,
            enabled: true,
            webhookByEvents: true,
            events: ['MESSAGES_UPSERT', 'SEND_MESSAGE']
          }
        };

        await withTimeout(fetch(`${EV_BASE}/instance/update/${encodeURIComponent(clinicInstanceKey)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', apikey: EV_KEY },
          body: JSON.stringify(webhookPayload)
        }));

        // Obter QR code da instância da clínica
        let qrImage = '';
        const qrRes = await withTimeout(fetch(`${EV_BASE}/instance/connect/${encodeURIComponent(clinicInstanceKey)}`, {
          headers: { apikey: EV_KEY }
        }));

        if (qrRes.ok) {
          const { data: qrJson } = await parseJsonSafe(qrRes);
          qrImage = pickQr(qrJson);
        }

        // Preparar dados para inserir DUAS rows no Supabase (uma para cada profissional)
        // Ambas com o mesmo instance_name e instance_key = public_code da clínica
        const instancesData = [];
        
        for (const professional of professionals) {
          console.log('Preparando dados para profissional:', professional.name);
          
          instancesData.push({
            owner_user_id: user.id,
            professional_id: professional.id,
            instance_name: clinicInstanceKey,  // public_code da clínica
            instance_key: clinicInstanceKey,   // public_code da clínica
            ignore_groups: true,
            webhook_url: clinicWebhookUrl,
            webhook_events: ['MESSAGES_UPSERT', 'SEND_MESSAGE'],
            last_qr_at: new Date().toISOString(),
            state: 'qr'
          });
        }

        console.log('Dados das instâncias a serem inseridas:', instancesData);
        console.log('Número de instâncias a inserir:', instancesData.length);

        // Verificar se temos dados válidos antes de inserir
        const validInstancesData = instancesData.filter(instance => 
          instance.professional_id && instance.professional_id !== null
        );

        console.log('Instâncias válidas (com professional_id):', validInstancesData.length);

        if (validInstancesData.length === 0) {
          console.error('Nenhuma instância válida para inserir - todos os professional_id são null');
          return res.status(500).json({ 
            error: 'Erro: Nenhum profissional válido encontrado',
            details: 'Todos os profissionais retornados têm ID null'
          });
        }

        const { error: insertError } = await supabase
          .from('evolution_instances')
          .insert(validInstancesData);

        if (insertError) {
          console.error('Erro ao salvar instâncias:', insertError);
          return res.status(500).json({ error: 'Erro ao salvar instâncias para os profissionais' });
        }

        // Retornar dados da instância única da clínica
        return res.status(200).json({
          instanceKey: clinicInstanceKey,
          qrImage,
          state: 'qr',
          connected: false,
          professionalsCount: validInstancesData.length,
          instances: validInstancesData.map(instance => ({
            professional_id: instance.professional_id,
            instance_key: instance.instance_key,
            webhook_url: instance.webhook_url
          }))
        });

      } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        return res.status(500).json({ error: 'Erro ao conectar WhatsApp' });
      }
    }

  } catch (error) {
    console.error('Erro na API clinic-whatsapp:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}