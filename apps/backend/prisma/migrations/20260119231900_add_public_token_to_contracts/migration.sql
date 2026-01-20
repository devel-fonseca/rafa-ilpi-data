-- AddPublicTokenToResidentContracts
--
-- Adiciona campo publicToken à tabela resident_contracts em todos os schemas tenant_*
--
-- Campo publicToken é usado para validação pública de contratos sem expor IDs internos.
-- Cada contrato recebe um UUID único que é incluído no carimbo institucional do PDF.
--
-- Endpoint público: GET /contracts/validate/:publicToken?hash=[sha256]
--
-- IMPORTANTE: Esta migration atualiza TODOS os schemas tenant_* dinamicamente

DO $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Iterar sobre todos os schemas tenant_*
    FOR schema_name IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'tenant_%'
    LOOP
        RAISE NOTICE 'Processando schema: %', schema_name;

        -- Adicionar coluna publicToken (VARCHAR(64), NOT NULL, UNIQUE)
        EXECUTE format('
            ALTER TABLE %I.resident_contracts
            ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64);
        ', schema_name);

        -- Gerar valores únicos para registros existentes (se houver)
        EXECUTE format('
            UPDATE %I.resident_contracts
            SET "publicToken" = gen_random_uuid()::text
            WHERE "publicToken" IS NULL;
        ', schema_name);

        -- Tornar coluna NOT NULL após popular valores existentes
        EXECUTE format('
            ALTER TABLE %I.resident_contracts
            ALTER COLUMN "publicToken" SET NOT NULL;
        ', schema_name);

        -- Criar constraint UNIQUE
        EXECUTE format('
            ALTER TABLE %I.resident_contracts
            ADD CONSTRAINT %I UNIQUE ("publicToken");
        ', schema_name, 'resident_contracts_publicToken_key');

        -- Criar índice para performance em queries de validação
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I
            ON %I.resident_contracts("publicToken");
        ', 'resident_contracts_publicToken_idx', schema_name);

        RAISE NOTICE '✅ Schema % processado com sucesso', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: publicToken adicionado a todos os schemas';
END $$;
