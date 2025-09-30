import { supabase } from '../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint para gerar token de calendário
 * @param {object} req - Requisição HTTP
 * @param {object} res - Resposta HTTP
 */
export default async function handler(req, res) {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verifica autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { professional_id } = req.body;

    // Gera um token único
    const token = uuidv4();

    // Salva o token no banco de dados
    const { data, error } = await supabase
      .from('user_calendar_tokens')
      .insert({
        user_id: session.user.id,
        professional_id: professional_id || null, // Pode ser null para todos os profissionais
        token,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      return res.status(500).json({ error: 'Erro ao gerar token' });
    }

    // Constrói a URL do feed ICS
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const feedUrl = `${baseUrl}/api/calendar/ics-feed?token=${token}`;

    return res.status(200).json({ 
      success: true, 
      token, 
      feed_url: feedUrl,
      token_data: data[0]
    });
  } catch (error) {
    console.error('Erro ao gerar token de calendário:', error);
    return res.status(500).json({ error: 'Erro ao gerar token de calendário', details: error.message });
  }
}