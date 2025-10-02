-- Adicionar campo public_code na tabela subscriptions
-- Este campo será usado para identificar a clínica nos planos ate_3 e ate_5

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS public_code VARCHAR(20);

-- Comentário para documentação
COMMENT ON COLUMN subscriptions.public_code IS 'Código público da clínica para planos ate_3 e ate_5 (formato: CPRF-XXXXX)';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_public_code ON subscriptions(public_code);

-- Função para gerar public_code automaticamente
CREATE OR REPLACE FUNCTION generate_clinic_public_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Gerar código no formato CPRF-XXXXX (5 caracteres aleatórios)
        new_code := 'CPRF-' || upper(substring(md5(random()::text) from 1 for 5));
        
        -- Verificar se o código já existe
        SELECT EXISTS(
            SELECT 1 FROM subscriptions WHERE public_code = new_code
        ) INTO code_exists;
        
        -- Se não existe, retornar o código
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar public_code automaticamente para planos ate_3 e ate_5
CREATE OR REPLACE FUNCTION set_public_code_for_clinic_plans()
RETURNS TRIGGER AS $$
BEGIN
    -- Se é um plano ate_3 ou ate_5 e não tem public_code, gerar um
    IF (NEW.plan = 'ate_3' OR NEW.plan = 'ate_5') AND NEW.public_code IS NULL THEN
        NEW.public_code := generate_clinic_public_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS trg_set_public_code_insert ON subscriptions;
CREATE TRIGGER trg_set_public_code_insert
    BEFORE INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_public_code_for_clinic_plans();

-- Criar trigger para UPDATE (caso o plano mude)
DROP TRIGGER IF EXISTS trg_set_public_code_update ON subscriptions;
CREATE TRIGGER trg_set_public_code_update
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
    EXECUTE FUNCTION set_public_code_for_clinic_plans();