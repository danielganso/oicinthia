-- Adicionar coluna 'nome' na tabela subscriptions
-- Esta coluna armazenará o nome cadastrado pelo usuário

ALTER TABLE subscriptions 
ADD COLUMN nome VARCHAR(255);

-- Comentário para documentação
COMMENT ON COLUMN subscriptions.nome IS 'Nome completo do usuário ou nome da empresa cadastrado no registro';

-- Opcional: Criar índice para melhor performance em buscas por nome
CREATE INDEX idx_subscriptions_nome ON subscriptions(nome);