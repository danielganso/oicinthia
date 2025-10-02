// pages/api/evolution/update-status.js
import { supabase } from '../../../lib/supabase';

const isUuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // ---- Input ----
    const {
      professionalId,
      state,            // ex: "open" | "close"
      connected,        // boolean
      ownerJid,         // ex: 5574...@s.whatsapp.net
      numero_informado, // string opcional (do input do usuário)
      instanceName      // nome humano da instância (ex: PRF-8S0VB)
    } = req.body || {};

    if (!professionalId) {
      return res.status(400).json({ error: 'professionalId é obrigatório' });
    }

    // ---- Buscar linha existente ----
    const { data: existing, error: fetchErr } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ error: 'Erro ao buscar instância', details: fetchErr.message });
    }

    // ---- Montar update ----
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (typeof state === 'string' && state.trim()) {
      updateData.state = state.trim();           // salvar exatamente "open", "close", ...
    }

    if (typeof connected === 'boolean' && connected) {
      updateData.connected_at = new Date().toISOString();
    }

    if (typeof ownerJid === 'string' && ownerJid.trim()) {
      updateData.owner_jid = ownerJid.trim();
      const digits = ownerJid.split('@')[0].replace(/[^\d]/g, '');
      if (digits) updateData.number_e164 = `+${digits}`;
    }

    if (typeof numero_informado === 'string') {
      updateData.numero_informado = numero_informado; // pode ser null/'' se quiser limpar
    }

    // Se temos instanceName e o instance_key atual parece UUID, trocar para o nome
    if (instanceName && typeof instanceName === 'string') {
      const name = instanceName.trim();
      if (existing?.instance_key && isUuid(existing.instance_key)) {
        updateData.instance_key = name;
      }
      if (!existing?.instance_name) {
        updateData.instance_name = name;
      }
    }

    // ---- Update ou Insert ----
    if (existing) {
      const { error: updErr } = await supabase
        .from('evolution_instances')
        .update(updateData)
        .eq('owner_user_id', user.id);

      if (updErr) {
        return res.status(500).json({ error: 'Falha ao atualizar instância', details: updErr.message });
      }

      return res.status(200).json({ ok: true, mode: 'update', updates: updateData });
    } else {
      // Insert mínimo quando não existir linha
      const row = {
        professional_id: professionalId,
        owner_user_id: user.id,
        state: updateData.state || 'unknown',
        updated_at: updateData.updated_at,
        connected_at: updateData.connected_at || null,
        owner_jid: updateData.owner_jid || null,
        number_e164: updateData.number_e164 || null,
        numero_informado: updateData.numero_informado ?? null,
        instance_name: instanceName || null,
        instance_key: instanceName || null,
      };

      const { error: insErr } = await supabase
        .from('evolution_instances')
        .insert(row);

      if (insErr) {
        return res.status(500).json({ error: 'Falha ao inserir instância', details: insErr.message });
      }

      return res.status(200).json({ ok: true, mode: 'insert', row });
    }
  } catch (err) {
    console.error('[update-status] error', err);
    return res.status(500).json({ error: 'Erro interno do servidor', details: String(err?.message || err) });
  }
}
