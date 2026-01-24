-- AddProcessingFieldsToResidentDocuments
-- Adiciona campos para processamento com carimbo institucional aos documentos de residentes

-- Migration para adicionar os novos campos a TODOS os schemas de tenant

DO $$
DECLARE
    schema_name text;
BEGIN
    -- Iterar por todos os schemas que começam com 'tenant_'
    FOR schema_name IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'tenant_%'
    LOOP
        RAISE NOTICE 'Adicionando campos de processamento ao schema: %', schema_name;

        -- Adicionar novos campos
        EXECUTE format('
            ALTER TABLE %I.resident_documents
                ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT,
                ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT,
                ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
                ADD COLUMN IF NOT EXISTS "originalFileSize" INTEGER,
                ADD COLUMN IF NOT EXISTS "originalFileMimeType" TEXT,
                ADD COLUMN IF NOT EXISTS "originalFileHash" VARCHAR(64),
                ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT,
                ADD COLUMN IF NOT EXISTS "processedFileKey" TEXT,
                ADD COLUMN IF NOT EXISTS "processedFileName" TEXT,
                ADD COLUMN IF NOT EXISTS "processedFileSize" INTEGER,
                ADD COLUMN IF NOT EXISTS "processedFileHash" VARCHAR(64),
                ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64),
                ADD COLUMN IF NOT EXISTS "processingMetadata" JSONB;
        ', schema_name);

        -- Criar índice único no publicToken
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS "resident_documents_publicToken_key"
                ON %I.resident_documents("publicToken")
                WHERE "publicToken" IS NOT NULL;
        ', schema_name);

    END LOOP;
END $$;
