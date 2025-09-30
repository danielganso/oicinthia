// Integração com Pagar.me para gerenciamento de assinaturas

/**
 * Classe para gerenciar a integração com a API do Pagar.me
 */
export class PagarmeService {
  constructor() {
    this.apiKey = process.env.PAGARME_API_KEY || '';
    this.apiUrl = 'https://api.pagar.me/core/v5';
  }

  /**
   * Realiza uma requisição para a API do Pagar.me
   * @param {string} endpoint - Endpoint da API
   * @param {string} method - Método HTTP
   * @param {object} data - Dados da requisição
   * @returns {Promise<object>} - Resposta da API
   */
  async request(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.apiUrl}${endpoint}`;
      const headers = {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      };

      const options = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Erro na requisição');
      }

      return responseData;
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Cria um cliente no Pagar.me
   * @param {object} customer - Dados do cliente
   * @returns {Promise<object>} - Cliente criado
   */
  async createCustomer(customer) {
    return this.request('/customers', 'POST', {
      name: customer.name,
      email: customer.email,
      type: 'individual',
      document: customer.document,
      phones: {
        mobile_phone: {
          country_code: '55',
          area_code: customer.phone.substring(0, 2),
          number: customer.phone.substring(2)
        }
      }
    });
  }

  /**
   * Cria um cartão de crédito no Pagar.me
   * @param {string} customerId - ID do cliente
   * @param {object} card - Dados do cartão
   * @returns {Promise<object>} - Cartão criado
   */
  async createCard(customerId, card) {
    return this.request(`/customers/${customerId}/cards`, 'POST', {
      number: card.number,
      holder_name: card.holder_name,
      exp_month: parseInt(card.exp_month),
      exp_year: parseInt(card.exp_year),
      cvv: card.cvv,
      billing_address: {
        line_1: card.address,
        zip_code: card.zip_code,
        city: card.city,
        state: card.state,
        country: 'BR'
      }
    });
  }

  /**
   * Cria uma assinatura no Pagar.me
   * @param {object} subscription - Dados da assinatura
   * @returns {Promise<object>} - Assinatura criada
   */
  async createSubscription(subscription) {
    return this.request('/subscriptions', 'POST', {
      customer_id: subscription.customer_id,
      card_id: subscription.card_id,
      plan_id: subscription.plan_id,
      payment_method: 'credit_card',
      currency: 'BRL',
      interval: 'month',
      interval_count: 1,
      billing_type: 'exact_day',
      billing_day: new Date().getDate(),
      metadata: {
        user_id: subscription.user_id
      }
    });
  }

  /**
   * Cancela uma assinatura no Pagar.me
   * @param {string} subscriptionId - ID da assinatura
   * @returns {Promise<object>} - Resposta da API
   */
  async cancelSubscription(subscriptionId) {
    return this.request(`/subscriptions/${subscriptionId}`, 'DELETE');
  }

  /**
   * Busca uma assinatura no Pagar.me
   * @param {string} subscriptionId - ID da assinatura
   * @returns {Promise<object>} - Assinatura
   */
  async getSubscription(subscriptionId) {
    return this.request(`/subscriptions/${subscriptionId}`);
  }

  /**
   * Atualiza uma assinatura no Pagar.me
   * @param {string} subscriptionId - ID da assinatura
   * @param {object} data - Dados para atualização
   * @returns {Promise<object>} - Assinatura atualizada
   */
  async updateSubscription(subscriptionId, data) {
    return this.request(`/subscriptions/${subscriptionId}`, 'PATCH', data);
  }
}

// Exporta uma instância única do serviço
export const pagarmeService = new PagarmeService();