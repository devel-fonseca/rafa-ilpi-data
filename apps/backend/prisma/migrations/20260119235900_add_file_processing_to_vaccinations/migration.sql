-- AddFileProcessingToVaccinations
--
-- Adiciona campos de processamento de arquivo à tabela vaccinations em todos os schemas tenant_*
--
-- Campos adicionados:
-- - Original file: originalFileUrl, originalFileKey, originalFileName, originalFileSize, originalFileMimeType, originalFileHash
-- - Processed file: processedFileUrl, processedFileKey, processedFileName, processedFileSize, processedFileHash
-- - Public token: publicToken (UUID único para validação externa)
-- - Processing metadata: processingMetadata (JSON com dados do carimbo institucional)
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

        -- Adicionar campos de arquivo original
        EXECUTE format('
            ALTER TABLE %I.vaccinations
            ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT,
            ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT,
            ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
            ADD COLUMN IF NOT EXISTS "originalFileSize" INTEGER,
            ADD COLUMN IF NOT EXISTS "originalFileMimeType" VARCHAR(100),
            ADD COLUMN IF NOT EXISTS "originalFileHash" VARCHAR(64);
        ', schema_name);

        -- Adicionar campos de arquivo processado
        EXECUTE format('
            ALTER TABLE %I.vaccinations
            ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT,
            ADD COLUMN IF NOT EXISTS "processedFileKey" TEXT,
            ADD COLUMN IF NOT EXISTS "processedFileName" TEXT,
            ADD COLUMN IF NOT EXISTS "processedFileSize" INTEGER,
            ADD COLUMN IF NOT EXISTS "processedFileHash" VARCHAR(64);
        ', schema_name);

        -- Adicionar campo publicToken
        EXECUTE format('
            ALTER TABLE %I.vaccinations
            ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64);
        ', schema_name);

        -- Gerar valores únicos para registros existentes que têm certificateUrl
        EXECUTE format('
            UPDATE %I.vaccinations
            SET "publicToken" = gen_random_uuid()::text
            WHERE "certificateUrl" IS NOT NULL AND "publicToken" IS NULL;
        ', schema_name);

        -- Criar constraint UNIQUE no publicToken (se não existir)
        BEGIN
            EXECUTE format('
                ALTER TABLE %I.vaccinations
                ADD CONSTRAINT %I UNIQUE ("publicToken");
            ', schema_name, 'vaccinations_publicToken_key');
        EXCEPTION
            WHEN duplicate_table THEN
                RAISE NOTICE 'Constraint %I já existe, pulando...', 'vaccinations_publicToken_key';
        END;

        -- Criar índice para performance em queries de validação (se não existir)
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I
            ON %I.vaccinations("publicToken");
        ', 'vaccinations_publicToken_idx', schema_name);

        -- Adicionar campo processingMetadata
        EXECUTE format('
            ALTER TABLE %I.vaccinations
            ADD COLUMN IF NOT EXISTS "processingMetadata" JSONB;
        ', schema_name);

        RAISE NOTICE '✅ Schema % processado com sucesso', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: campos de processamento de arquivo adicionados a todos os schemas';
END $$;
