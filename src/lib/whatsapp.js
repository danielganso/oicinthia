// Integração com Evolution API para WhatsApp

/**
 * Classe para gerenciar a integração com a Evolution API para WhatsApp
 */
export class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_BASE || 'https://evolutionapi.tripos.com.br';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'cinthia';
  }

  /**
   * Envia uma mensagem de texto para um número de WhatsApp
   * @param {string} to - Número de telefone no formato internacional (ex: 5511999999999)
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTextMessage(to, message) {
    try {
      const response = await fetch(`${this.apiUrl}/message/sendText/${this.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify({
          number: to,
          options: {
            delay: 1200,
            presence: 'composing'
          },
          textMessage: {
            text: message
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem de lembrete de consulta
   * @param {object} appointment - Dados da consulta
   * @param {object} patient - Dados do paciente
   * @param {object} professional - Dados do profissional
   * @returns {Promise<object>} - Resposta da API
   */
  async sendAppointmentReminder(appointment, patient, professional) {
    if (!patient.whatsapp) {
      throw new Error('Paciente não possui número de WhatsApp cadastrado');
    }

    const formattedPhone = this.formatPhoneNumber(patient.whatsapp);
    const appointmentDate = new Date(appointment.start_at);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
    const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const message = `Olá ${patient.name}! Lembrete da sua consulta com ${professional.name} amanhã, dia ${formattedDate} às ${formattedTime}. Local: ${appointment.clinic_name}, ${appointment.address}, ${appointment.city}. Confirme sua presença respondendo SIM. Para reagendar ou cancelar, entre em contato conosco.`;

    return this.sendTextMessage(formattedPhone, message);
  }

  /**
   * Formata o número de telefone para o padrão internacional
   * @param {string} phone - Número de telefone
   * @returns {string} - Número formatado
   */
  formatPhoneNumber(phone) {
    // Remove caracteres não numéricos
    const numbers = phone.replace(/\D/g, '');
    
    // Verifica se já está no formato internacional
    if (numbers.startsWith('55')) {
      return numbers;
    }
    
    // Adiciona o código do país (Brasil)
    return `55${numbers}`;
  }

  /**
   * Verifica o status da instância do WhatsApp
   * @returns {Promise<object>} - Status da instância
   */
  async checkInstanceStatus() {
    try {
      const response = await fetch(`${this.apiUrl}/instance/connectionState/${this.instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar status da instância WhatsApp:', error);
      throw error;
    }
  }
}

// Exporta uma instância única do serviço
export const whatsappService = new WhatsAppService();