import { supabase } from '../../../lib/supabase';
import ical from 'ical-generator';

/**
 * API endpoint para gerar feed ICS de agendamentos
 * @param {object} req - Requisição HTTP
 * @param {object} res - Resposta HTTP
 */
export default async function handler(req, res) {
  // Apenas aceita método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Busca o usuário pelo token de calendário
    const { data: userData, error: userError } = await supabase
      .from('user_calendar_tokens')
      .select('user_id, professional_id')
      .eq('token', token)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Token inválido' });
    }

    // Constrói a query para buscar agendamentos
    let query = supabase
      .from('appointments')
      .select(`
        *,
        professionals:professional_id (name),
        patients:patient_id (name)
      `)
      .eq('owner_user_id', userData.user_id)
      .gte('start_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()) // Últimos 30 dias
      .lte('start_at', new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString()); // Próximos 90 dias

    // Se for um token específico para um profissional
    if (userData.professional_id) {
      query = query.eq('professional_id', userData.professional_id);
    }

    // Executa a query
    const { data: appointments, error: appointmentsError } = await query;

    if (appointmentsError) {
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }

    // Cria o calendário
    const calendar = ical({
      name: 'CinthIA - Agendamentos',
      timezone: 'America/Sao_Paulo'
    });

    // Adiciona os eventos ao calendário
    appointments.forEach(appointment => {
      const startDate = new Date(appointment.start_at);
      const endDate = new Date(appointment.end_at);

      calendar.createEvent({
        start: startDate,
        end: endDate,
        summary: `${appointment.service_name} - ${appointment.patients?.name || 'Paciente'}`,
        description: appointment.notes || '',
        location: `${appointment.clinic_name}, ${appointment.address}, ${appointment.city}`,
        status: appointment.status === 'canceled' ? 'cancelled' : 'confirmed',
        organizer: {
          name: appointment.professionals?.name || 'Profissional',
          email: ''
        }
      });
    });

    // Define os headers para o arquivo ICS
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');

    // Retorna o calendário
    return res.status(200).send(calendar.toString());
  } catch (error) {
    console.error('Erro ao gerar feed ICS:', error);
    return res.status(500).json({ error: 'Erro ao gerar feed ICS', details: error.message });
  }
}