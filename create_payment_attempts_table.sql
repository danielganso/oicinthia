-- Criar tabela para armazenar tentativas de pagamento do Mercado Pago
-- Esta tabela captura todos os eventos de pagamento, incluindo pendentes, rejeitados, etc.

CREATE TABLE payment_attempts (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL, -- ID do pagamento no Mercado Pago
    preapproval_id VARCHAR(255), -- ID da assinatura no Mercado Pago (se aplicável)
    user_id UUID REFERENCES auth.users(id), -- Referência ao usuário
    external_reference VARCHAR(255), -- Referência externa (user_id + plan)
    
    -- Dados do pagamento
    status VARCHAR(50) NOT NULL, -- pending, approved, rejected, cancelled, etc.
    status_detail VARCHAR(100), -- Detalhes específicos do status
    payment_method_id VARCHAR(50), -- Método de pagamento usado
    payment_type_id VARCHAR(50), -- Tipo de pagamento
    
    -- Valores
    transaction_amount DECIMAL(10,2), -- Valor da transação
    currency_id VARCHAR(10), -- Moeda (BRL)
    
    -- Datas importantes
    date_created TIMESTAMP, -- Data de criação no Mercado Pago
    date_approved TIMESTAMP, -- Data de aprovação (se aplicável)
    date_last_updated TIMESTAMP, -- Última atualização no Mercado Pago
    
    -- Dados do pagador
    payer_email VARCHAR(255), -- Email do pagador
    payer_identification_type VARCHAR(20), -- Tipo de documento (CPF, CNPJ)
    payer_identification_number VARCHAR(20), -- Número do documento
    
    -- Dados adicionais da tabela subscriptions
    nome VARCHAR(255), -- Nome do usuário/empresa da tabela subscriptions
    telefone_whatsapp VARCHAR(50), -- Telefone no formato WhatsApp (557582553446@s.whatsapp.net)
    
    -- Metadados
    description TEXT, -- Descrição do pagamento
    installments INTEGER, -- Número de parcelas
    
    -- Controle interno
    webhook_received_at TIMESTAMP DEFAULT NOW(), -- Quando recebemos o webhook
    processed BOOLEAN DEFAULT FALSE, -- Se já foi processado
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_payment_attempts_payment_id ON payment_attempts(payment_id);
CREATE INDEX idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX idx_payment_attempts_date_created ON payment_attempts(date_created);
CREATE INDEX idx_payment_attempts_processed ON payment_attempts(processed);
CREATE INDEX idx_payment_attempts_nome ON payment_attempts(nome);
CREATE INDEX idx_payment_attempts_telefone_whatsapp ON payment_attempts(telefone_whatsapp);

-- Comentários para documentação
COMMENT ON TABLE payment_attempts IS 'Armazena todas as tentativas de pagamento recebidas via webhook do Mercado Pago';
COMMENT ON COLUMN payment_attempts.payment_id IS 'ID único do pagamento no Mercado Pago';
COMMENT ON COLUMN payment_attempts.status IS 'Status do pagamento: pending, approved, rejected, cancelled, refunded, etc.';
COMMENT ON COLUMN payment_attempts.status_detail IS 'Detalhes específicos do status (ex: cc_rejected_insufficient_amount)';
COMMENT ON COLUMN payment_attempts.nome IS 'Nome do usuário/empresa obtido da tabela subscriptions';
COMMENT ON COLUMN payment_attempts.telefone_whatsapp IS 'Telefone formatado para WhatsApp (ex: 557582553446@s.whatsapp.net)';
COMMENT ON COLUMN payment_attempts.processed IS 'Indica se este registro já foi processado pela aplicação';