-- ──────────────────────────────────────────────────────────────────────────────
--  MIGRATION: Add Shift Check-in and Handover
--
--  Adiciona campos de check-in ao modelo Shift e cria tabela ShiftHandover
--  para registrar passagem de plantão obrigatória.
--
--  Data: 2026-02-10
--  Autor: Claude Code
-- ──────────────────────────────────────────────────────────────────────────────

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

        -- ==========================================
        -- 1. ADICIONAR CAMPOS DE CHECK-IN EM SHIFTS
        -- ==========================================

        -- Campo para momento exato do check-in (transição CONFIRMED → IN_PROGRESS)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = schema_name
            AND table_name = 'shifts'
            AND column_name = 'checked_in_at'
        ) THEN
            EXECUTE format('ALTER TABLE %I.shifts ADD COLUMN "checked_in_at" TIMESTAMPTZ(3);', schema_name);
        END IF;

        -- Campo para identificar quem fez o check-in (Líder ou Suplente)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = schema_name
            AND table_name = 'shifts'
            AND column_name = 'checked_in_by'
        ) THEN
            EXECUTE format('ALTER TABLE %I.shifts ADD COLUMN "checked_in_by" UUID;', schema_name);
        END IF;

        -- ==========================================
        -- 2. CRIAR TABELA SHIFT_HANDOVERS
        -- ==========================================

        -- Tabela para registrar passagem de plantão (obrigatória antes de COMPLETED)
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.shift_handovers (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "shiftId" UUID NOT NULL,
                "handedOverBy" UUID NOT NULL,
                "receivedBy" UUID,
                report TEXT NOT NULL,
                "activitiesSnapshot" JSONB NOT NULL,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT shift_handovers_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- 3. CRIAR ÍNDICES
        -- ==========================================

        -- Índice único para garantir 1:1 entre Shift e ShiftHandover
        EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS shift_handovers_shiftId_key ON %I.shift_handovers("shiftId");', schema_name);

        -- Índices para consultas frequentes
        EXECUTE format('CREATE INDEX IF NOT EXISTS shift_handovers_tenantId_idx ON %I.shift_handovers("tenantId");', schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS shift_handovers_shiftId_idx ON %I.shift_handovers("shiftId");', schema_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS shift_handovers_handedOverBy_idx ON %I.shift_handovers("handedOverBy");', schema_name);

        -- ==========================================
        -- 4. CRIAR FOREIGN KEY
        -- ==========================================

        -- FK para Shift com cascade delete (verificar se não existe antes)
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'shift_handovers_shiftid_fkey'
            AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = schema_name)
        ) THEN
            EXECUTE format('ALTER TABLE %I.shift_handovers ADD CONSTRAINT shift_handovers_shiftId_fkey FOREIGN KEY ("shiftId") REFERENCES %I.shifts(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name, schema_name);
        END IF;

        RAISE NOTICE '✅ Schema % processado com sucesso', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: check-in e handover adicionados em todos os schemas';
END $$;
