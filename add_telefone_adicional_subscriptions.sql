-- Adicionar campo telefone_adicional na tabela subscriptions
-- Este campo armazenará um telefone adicional do usuário

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS telefone_adicional VARCHAR(20);

-- Comentário para documentação
COMMENT ON COLUMN subscriptions.telefone_adicional IS 'Telefone adicional de contato (formato: +5511999999999)';

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_subscriptions_telefone_adicional ON subscriptions(telefone_adicional);