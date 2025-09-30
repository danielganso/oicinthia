import { whatsappService } from '../../../lib/whatsapp';
import { supabase } from '../../../lib/supabase';

/**
 * API endpoint para verificar o status da conexão do WhatsApp
 * @param {object} req - Requisição HTTP
 * @param {object} res - Resposta HTTP
 */
export default async function handler(req, res) {
  // Apenas aceita método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verifica autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verifica o status da instância
    const status = await whatsappService.checkInstanceStatus();

    return res.status(200).json(status);
  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error);
    return res.status(500).json({ error: 'Erro ao verificar status do WhatsApp', details: error.message });
  }
}