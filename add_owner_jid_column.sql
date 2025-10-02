-- Adicionar coluna owner_jid na tabela evolution_instances
ALTER TABLE evolution_instances 
ADD COLUMN IF NOT EXISTS owner_jid text;

-- Criar índice para melhor performance nas consultas por owner_jid
CREATE INDEX IF NOT EXISTS idx_evo_inst_owner_jid ON evolution_instances(owner_jid);

-- Comentário sobre o campo
COMMENT ON COLUMN evolution_instances.owner_jid IS 'JID do proprietário da instância WhatsApp (ex: 5511999999999@s.whatsapp.net)';