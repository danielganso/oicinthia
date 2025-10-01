-- SQL para adicionar colunas CPF, CNPJ e telefone na tabela subscriptions
-- Execute este comando no Supabase SQL Editor

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- Adicionar comentários para documentar as colunas
COMMENT ON COLUMN subscriptions.cpf IS 'CPF do usuário (apenas números, formato: 12345678901)';
COMMENT ON COLUMN subscriptions.cnpj IS 'CNPJ da empresa (apenas números, formato: 12345678000195)';
COMMENT ON COLUMN subscriptions.telefone IS 'Telefone de contato (formato: +5511999999999)';

-- Opcional: Criar índices para melhorar performance em consultas
CREATE INDEX IF NOT EXISTS idx_subscriptions_cpf ON subscriptions(cpf);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cnpj ON subscriptions(cnpj);
CREATE INDEX IF NOT EXISTS idx_subscriptions_telefone ON subscriptions(telefone);