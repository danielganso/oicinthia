import { supabase } from '../../../lib/supabase';

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

/* ---------------- QR helpers ---------------- */
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

/* ---------------- Instance helpers ---------------- */
function getInstanceKeyFromCreateResponse(json, fallback) {
  if (!json) return String(fallback || '').trim();
  let key =
    json.instanceName ||
    json.instance ||
    json.id ||
    json.key ||
    json?.data?.instanceName ||
    json?.data?.instance ||
    json?.data?.id ||
    json?.data?.key ||
    json?.instance?.name ||
    json?.instance?.instanceName ||
    json?.result?.instanceName ||
    json?.result?.instance ||
    fallback;
  if (key && typeof key !== 'string') key = key.name || key.instanceName || String(key);
  return String(key || '').trim();
}

const normalizeEvents = (arr = []) =>
  arr.map(e => String(e).toUpperCase().replace(/\./g, '_'))
     .map(e => e === 'MESSAGE_UPSERT' ? 'MESSAGES_UPSERT' : e);

function normalizeState(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'open' || s === 'connected') return 'connected';
  if (s) return s; // qr, pairing, connecting, close, etc.
  return 'unknown';
}
const isConnectedState = (s) => s === 'connected';

/* -------- snapshot de estado + número (forte) --------
   Busca connectionState e fetchInstances, combinando:
   - estado: state || connection_state || connectionStatus
   - número: phone || ownerJid
*/
async function snapshotStateAndNumber(EV_BASE, EV_KEY, instanceKey) {
  let rawState = '';
  let number = '';

  // 1) connectionState
  try {
    const st = await withTimeout(fetch(
      `${EV_BASE}/instance/connectionState/${encodeURIComponent(instanceKey)}`,
      { headers: { apikey: EV_KEY } }
    ));
    const { data: j } = await parseJsonSafe(st);
    if (st.ok && j) {
      rawState = j.state ?? j.connection_state ?? rawState;
      // phone pode ser string ou objeto
      if (j.phone) {
        if (typeof j.phone === 'string') {
          const digits = j.phone.replace(/[^\d]/g, '');
          number = digits ? `+${digits}` : number;
        } else if (j.phone?.id || j.phone?.wid) {
          const wid = String(j.phone.id || j.phone.wid).replace(/[^\d]/g, '');
          number = wid ? `+${wid}` : number;
        }
      }
    }
  } catch {}

  // 2) fetchInstances (pega ownerJid e connectionStatus)
  try {
    const fi = await withTimeout(fetch(
      `${EV_BASE}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceKey)}`,
      { headers: { apikey: EV_KEY } }
    ));
    const { data: arr } = await parseJsonSafe(fi);
    if (fi.ok && Array.isArray(arr) && arr.length) {
      // estado
      const cs = arr[0]?.connectionStatus; // "open", "close", etc.
      if (!rawState && cs) rawState = cs;

      // número via ownerJid
      const ownerJid = arr[0]?.ownerJid || arr[0]?.owner?.jid;
      if (!number && ownerJid && typeof ownerJid === 'string') {
        const digits = ownerJid.split('@')[0].replace(/[^\d]/g, '');
        if (digits) number = `+${digits}`;
      }
    }
  } catch {}

  const state = normalizeState(rawState);
  return { state, number: number || '' };
}

/* ============================================
   ================ HANDLER ===================
   ==========================================*/
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const fail = (step, details, status = 500) => {
    console.error(`[evo.link] ${step}`, details);
    return res.status(status).json({ error: 'Bad Request', step, details });
  };

  try {
    // Auth
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return fail('auth.header', 'Token não fornecido', 401);
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return fail('auth.supabase', authError?.message || 'Não autorizado', 401);
    const userId = user.id;

    // Input
    const { professionalId } = req.body || {};
    if (!professionalId) return fail('input', 'professionalId é obrigatório', 400);

    // Profissional
    const { data: professional, error: profErr } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', professionalId)
      .eq('owner_user_id', userId)
      .single();
    if (profErr || !professional) return fail('db.professional', profErr?.message || 'Profissional não encontrado', 404);

    // ENV Evolution
    const EV_BASE = trimBase(process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br');
    const EV_KEY  = process.env.EVOLUTION_API_KEY || '';
    if (!EV_KEY) return fail('env.key', 'EVOLUTION_API_KEY não configurada', 500);

    // Webhook n8n
    const isProd = process.env.NODE_ENV === 'production';
    const webhookUrl = isProd ? process.env.N8N_WEBHOOK_URL_PROD : process.env.N8N_WEBHOOK_URL_TEST;
    if (!webhookUrl) return fail('env.webhook', 'Webhook do n8n não configurado', 500);

    // Instance desejada
    const desiredKey = professional.public_code || `prof_${String(professionalId).substring(0,8)}`;

    // Já existe?
    const { data: existing } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('professional_id', professionalId)
      .maybeSingle();

    // Helper: QR + status + número (usa snapshot fortalecido)
    const getQrAndState = async (key) => {
      const qrRes = await withTimeout(fetch(`${EV_BASE}/instance/connect/${encodeURIComponent(key)}`, {
        headers: { apikey: EV_KEY }
      }));
      const { data: qrJson, raw: qrRaw } = await parseJsonSafe(qrRes);
      if (!qrRes.ok) return fail('evo.qr', qrJson || qrRaw, qrRes.status);
      const qrImage = pickQr(qrJson);

      const { state, number } = await snapshotStateAndNumber(EV_BASE, EV_KEY, key);
      return { qrImage, state: state || 'qr', number };
    };

    if (existing?.instance_key) {
      const r = await getQrAndState(existing.instance_key);
      if (r?.error) return;

      const updateData = {
        last_qr_at: new Date().toISOString(),
        state: r.state || 'qr'
      };
      if (isConnectedState(updateData.state)) {
        updateData.connected_at = new Date().toISOString();
        if (r.number) updateData.number_e164 = r.number;
      }

      await supabase.from('evolution_instances')
        .update(updateData)
        .eq('id', existing.id);

      return res.status(200).json({
        instanceKey: existing.instance_key,
        qrImage: r.qrImage,
        state: updateData.state,
        connected: isConnectedState(updateData.state),
        number: r.number || null
      });
    }

    // PASSO 1: criar instância
    const createBody = {
      instanceName: desiredKey,
      qrcode: true,
      groupsIgnore: true,
      integration: 'WHATSAPP-BAILEYS'
    };

    const createRes = await withTimeout(fetch(`${EV_BASE}/instance/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: EV_KEY },
      body: JSON.stringify(createBody)
    }));
    const { data: createJson, raw: createRaw } = await parseJsonSafe(createRes);
    if (!createRes.ok) return fail('evo.create', createJson || createRaw, createRes.status);

    let instanceKey = getInstanceKeyFromCreateResponse(createJson, desiredKey);
    if (!instanceKey) return fail('evo.create.parse_instance_key', { createJson: createJson || createRaw }, 500);

    // PASSO 2: set webhook (aninhado) com fallback
    const eventsRequested = normalizeEvents(['messages.upsert', 'send_message']);
    const webhookPayload = {
      webhook: {
        url: webhookUrl,
        enabled: true,
        webhookByEvents: true,
        events: eventsRequested
      }
    };

    let endpoint = `${EV_BASE}/instance/update/${encodeURIComponent(instanceKey)}`;
    let whRes = await withTimeout(fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: EV_KEY },
      body: JSON.stringify(webhookPayload)
    }));
    let { data: whJson, raw: whRaw } = await parseJsonSafe(whRes);

    if (!whRes.ok && (whRes.status === 404 || whRes.status === 405 || whRes.status === 400)) {
      endpoint = `${EV_BASE}/webhook/set/${encodeURIComponent(instanceKey)}`;
      whRes = await withTimeout(fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: EV_KEY },
        body: JSON.stringify(webhookPayload)
      }));
      const parsed2 = await parseJsonSafe(whRes);
      whJson = parsed2.data; whRaw = parsed2.raw;
    }

    if (!whRes.ok && whRes.status !== 409) {
      return fail('evo.webhook', { endpoint, body: webhookPayload, response: whJson || whRaw }, whRes.status);
    }

    // PASSO 3: QR + estado + número (snapshot fortalecido)
    const { qrImage, state, number } = await getQrAndState(instanceKey);
    if (qrImage === undefined) return; // fail já respondeu

    // Persistir
    const row = {
      professional_id: professionalId,
      owner_user_id: userId,
      instance_name: instanceKey,
      instance_key: instanceKey,
      ignore_groups: true,
      webhook_url: webhookUrl,
      webhook_events: eventsRequested,
      last_qr_at: new Date().toISOString(),
      state: state || 'qr'
    };

    if (isConnectedState(row.state)) {
      row.connected_at = new Date().toISOString();
    }
    if (number) row.number_e164 = number;

    const upsert = await supabase.from('evolution_instances').insert(row);
    if (upsert.error) {
      return fail('db.insert_instance', upsert.error.message);
    }

    await supabase
      .from('professionals')
      .update({ whatsapp_device_id: instanceKey })
      .eq('id', professionalId);

    return res.status(200).json({
      instanceKey,
      qrImage,
      state: row.state,
      connected: isConnectedState(row.state),
      number: number || null
    });
  } catch (err) {
    console.error('[evo.link] UNHANDLED', err);
    return res.status(500).json({ error: 'Unhandled', details: String(err?.message || err) });
  }
}
