-- AddInstitutionalDocumentProcessingFields
--
-- Adiciona campos de processamento com carimbo institucional à tabela tenant_documents
-- em todos os schemas tenant_*
--
-- Similar ao sistema de vacinações, cada documento institucional terá:
-- - Arquivo original (backup para auditoria)
-- - Arquivo processado (PDF com carimbo institucional)
-- - Hash SHA-256 de ambos os arquivos
-- - Token público para validação externa
-- - Metadados do processamento (JSON)
--
-- IMPORTANTE: Esta migration atualiza TODOS os schemas tenant_* dinamicamente
-- Campos são nullable para backward compatibility

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

        -- Adicionar campos de arquivo original (backup auditoria)
        EXECUTE format('
            ALTER TABLE %I.tenant_documents
            ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT,
            ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT,
            ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
            ADD COLUMN IF NOT EXISTS "originalFileSize" INTEGER,
            ADD COLUMN IF NOT EXISTS "originalFileMimeType" VARCHAR(100),
            ADD COLUMN IF NOT EXISTS "originalFileHash" VARCHAR(64);
        ', schema_name);

        -- Adicionar campos de arquivo processado (PDF com carimbo)
        EXECUTE format('
            ALTER TABLE %I.tenant_documents
            ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT,
            ADD COLUMN IF NOT EXISTS "processedFileKey" TEXT,
            ADD COLUMN IF NOT EXISTS "processedFileName" TEXT,
            ADD COLUMN IF NOT EXISTS "processedFileSize" INTEGER,
            ADD COLUMN IF NOT EXISTS "processedFileHash" VARCHAR(64);
        ', schema_name);

        -- Adicionar campo de token público para validação externa
        EXECUTE format('
            ALTER TABLE %I.tenant_documents
            ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64);
        ', schema_name);

        -- Adicionar campo de metadados do processamento (JSONB)
        EXECUTE format('
            ALTER TABLE %I.tenant_documents
            ADD COLUMN IF NOT EXISTS "processingMetadata" JSONB;
        ', schema_name);

        -- Criar constraint UNIQUE no publicToken (idempotente)
        -- IMPORTANTE: PostgreSQL converte nomes para lowercase, então verificamos lowercase
        EXECUTE format('
            DO $inner$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = ''tenant_documents_publictoken_key''
                    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = %L)
                ) THEN
                    ALTER TABLE %I.tenant_documents
                    ADD CONSTRAINT tenant_documents_publictoken_key UNIQUE ("publicToken");
                END IF;
            END $inner$;
        ', schema_name, schema_name);

        -- Criar índice para performance em queries de validação
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I
            ON %I.tenant_documents("publicToken")
            WHERE "publicToken" IS NOT NULL;
        ', 'tenant_documents_publicToken_idx', schema_name);

        RAISE NOTICE '✅ Schema % processado com sucesso', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: campos de processamento adicionados a todos os schemas';
END $$;
