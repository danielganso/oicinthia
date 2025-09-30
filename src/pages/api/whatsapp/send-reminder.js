import { supabase } from '../../../lib/supabase';
import { whatsappService } from '../../../lib/whatsapp';

/**
 * API endpoint para enviar lembretes de consulta via WhatsApp
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

    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'ID da consulta é obrigatório' });
    }

    // Busca dados da consulta
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('owner_user_id', session.user.id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({ error: 'Consulta não encontrada' });
    }

    // Busca dados do paciente
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', appointment.patient_id)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Busca dados do profissional
    const { data: professional, error: professionalError } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', appointment.professional_id)
      .single();

    if (professionalError || !professional) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    // Verifica se o paciente tem WhatsApp cadastrado
    if (!patient.whatsapp) {
      return res.status(400).json({ error: 'Paciente não possui número de WhatsApp cadastrado' });
    }

    // Envia lembrete
    const result = await whatsappService.sendAppointmentReminder(appointment, patient, professional);

    // Registra o envio do lembrete
    await supabase
      .from('appointment_reminders')
      .insert({
        appointment_id: appointment.id,
        sent_at: new Date().toISOString(),
        status: 'sent',
        channel: 'whatsapp'
      });

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Erro ao enviar lembrete:', error);
    return res.status(500).json({ error: 'Erro ao enviar lembrete', details: error.message });
  }
}