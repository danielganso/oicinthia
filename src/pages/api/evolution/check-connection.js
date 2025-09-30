// pages/api/evolution/check-connection.js
import { supabase } from '../../../lib/supabase';

const trimBase = (u) => (u || '').replace(/\/+$/, '');
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // ------------ Auth ------------
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // ------------ Entrada ------------
    const { professionalId } = req.body || {};
    if (!professionalId) {
      return res.status(400).json({ error: 'professionalId é obrigatório' });
    }

    // ------------ Buscar instance_key + instance_name ------------
    const { data: inst, error: instErr } = await supabase
      .from('evolution_instances')
      .select('instance_key, instance_name')
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (instErr || !inst) {
      return res.status(404).json({ error: 'Instância não encontrada para este profissional' });
    }

    // Usar NOME da instância. Se instance_key for UUID, cai para instance_name.
    const instanceName = (!isUuid(inst.instance_key) && inst.instance_key) ? inst.instance_key : inst.instance_name;
    if (!instanceName) {
      return res.status(400).json({ error: 'Nome da instância ausente (instance_key virou UUID e instance_name está vazio)' });
    }

    // ------------ Evolution API ------------
    const EV_BASE = trimBase(process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br');
    const EV_KEY  = process.env.EVOLUTION_API_KEY;
    if (!EV_KEY) {
      return res.status(500).json({ error: 'EVOLUTION_API_KEY não configurada' });
    }

    const url = `${EV_BASE}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`;
    const evoRes = await fetch(url, {
      method: 'GET',
      headers: { apikey: EV_KEY, 'Cache-Control': 'no-cache' },
    });

    const text = await evoRes.text();
    if (!evoRes.ok) {
      return res.status(evoRes.status).json({
        error: `Erro ao consultar Evolution: ${evoRes.status} ${evoRes.statusText}`,
        details: text
      });
    }

    let arr;
    try { arr = JSON.parse(text); } catch { arr = []; }
    const row = Array.isArray(arr) && arr.length ? arr[0] : null;
    if (!row) {
      return res.status(404).json({ error: 'Instância não encontrada na Evolution API' });
    }

    // ------------ Extrair dados ------------
    // queremos SALVAR exatamente o connectionStatus em state (ex.: "open")
    const connectionStatusRaw = row.connectionStatus || '';
    const connectionStatus = String(connectionStatusRaw).toLowerCase();
    const connected = connectionStatus === 'open';

    const ownerJid = row.ownerJid || row.owner?.jid || null;
    const numberE164 = ownerJid ? `+${ownerJid.split('@')[0].replace(/[^\d]/g, '')}` : null;

    // ------------ Atualizar tabela ------------
    const updateData = {
      state: connectionStatus || 'unknown',      // salva "open", "close", etc.
      updated_at: new Date().toISOString(),
      owner_jid: ownerJid || null
    };
    if (connected) {
      updateData.connected_at = new Date().toISOString();
    }
    if (numberE164) {
      updateData.number_e164 = numberE164;
    }

    const { error: updErr } = await supabase
      .from('evolution_instances')
      .update(updateData)
      .eq('professional_id', professionalId);

    if (updErr) {
      return res.status(500).json({ error: 'Não foi possível atualizar o status no banco de dados', details: updErr.message });
    }

    // ------------ Resposta ------------
    return res.status(200).json({
      connected,                       // true se state === 'open'
      state: updateData.state,         // grava e retorna exatamente "open"/"close"/...
      ownerJid,
      number_e164: numberE164,
      instanceKey: instanceName,
      rawData: row
    });
  } catch (err) {
    console.error('[check-connection] error', err);
    return res.status(500).json({ error: 'Erro interno do servidor', details: String(err?.message || err) });
  }
}
