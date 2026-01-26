-- AddTenantShiftConfig
-- Cria tabela tenant_shift_config em todos os schemas tenant_*

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

        -- Criar tabela tenant_shift_config
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.tenant_shift_config (
                id UUID PRIMARY KEY,
                "tenantId" UUID NOT NULL,
                "shiftTemplateId" UUID NOT NULL,
                "isEnabled" BOOLEAN NOT NULL DEFAULT true,
                "customName" VARCHAR(50),
                "customStartTime" VARCHAR(5),
                "customEndTime" VARCHAR(5),
                "customDuration" INTEGER,
                notes TEXT,
                "createdBy" UUID NOT NULL,
                "updatedBy" UUID,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,
                "deletedAt" TIMESTAMPTZ(3)
            );
        ', schema_name);

        -- Criar unique constraint
        -- IMPORTANTE: PostgreSQL converte nomes para lowercase, então verificamos lowercase
        EXECUTE format('
            DO $inner$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = ''tenant_shift_config_shifttemplateid_deletedat_key''
                    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = %L)
                ) THEN
                    ALTER TABLE %I.tenant_shift_config
                    ADD CONSTRAINT tenant_shift_config_shifttemplateid_deletedat_key
                    UNIQUE ("shiftTemplateId", "deletedAt");
                END IF;
            END $inner$;
        ', schema_name, schema_name);

        -- Criar índices
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I.tenant_shift_config("tenantId");
        ', 'tenant_shift_config_tenantId_idx', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I.tenant_shift_config("isEnabled");
        ', 'tenant_shift_config_isEnabled_idx', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I ON %I.tenant_shift_config("deletedAt");
        ', 'tenant_shift_config_deletedAt_idx', schema_name);

        RAISE NOTICE '✅ Schema % processado', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: tenant_shift_config adicionado a todos os schemas';
END $$;
