-- CreateTable: medication_locks (Sprint 2 - WebSocket Medication Safety)
-- Objetivo: Prevenir administração duplicada de medicamentos via locking em tempo real

-- Criar tabela em cada schema de tenant
DO $$
DECLARE
    tenant_schema TEXT;
    medications_exists BOOLEAN;
BEGIN
    -- Iterar sobre todos os schemas de tenant
    FOR tenant_schema IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        -- Verificar se tabela medications existe no schema
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = tenant_schema AND table_name = 'medications'
        ) INTO medications_exists;

        -- Apenas criar medication_locks se medications existir
        IF medications_exists THEN
            -- Criar tabela medication_locks
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.medication_locks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id UUID NOT NULL,
                    medication_id UUID NOT NULL,
                    scheduled_date DATE NOT NULL,
                    scheduled_time VARCHAR(5) NOT NULL, -- Ex: "06:00", "14:00", "22:00"

                    -- Lock info
                    locked_by_user_id UUID NOT NULL,
                    locked_by_user_name VARCHAR(255) NOT NULL,
                    locked_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
                    expires_at TIMESTAMPTZ(3) NOT NULL, -- Auto-expira após 5 minutos

                    -- Metadados
                    session_id VARCHAR(255), -- ID da sessão do browser
                    ip_address VARCHAR(45), -- IPv4 ou IPv6

                    -- Constraints
                    CONSTRAINT fk_medication_locks_medication
                        FOREIGN KEY (medication_id)
                        REFERENCES %I.medications(id)
                        ON DELETE CASCADE,

                    CONSTRAINT fk_medication_locks_user
                        FOREIGN KEY (locked_by_user_id)
                        REFERENCES public.users(id)
                        ON DELETE CASCADE,

                    -- Unique constraint: apenas 1 lock por medicamento+data+horário
                    CONSTRAINT uq_medication_locks_unique_lock
                        UNIQUE (medication_id, scheduled_date, scheduled_time)
                );
            ', tenant_schema, tenant_schema);

            -- Criar índices para performance
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_medication_locks_medication_id
                ON %I.medication_locks(medication_id);
            ', tenant_schema);

            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_medication_locks_locked_by
                ON %I.medication_locks(locked_by_user_id);
            ', tenant_schema);

            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_medication_locks_expires_at
                ON %I.medication_locks(expires_at);
            ', tenant_schema);

            -- Índice composto para query de locks ativos (sem WHERE parcial pois NOW() não é IMMUTABLE)
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS idx_medication_locks_active
                ON %I.medication_locks(medication_id, scheduled_date, scheduled_time, expires_at);
            ', tenant_schema);

            RAISE NOTICE 'Created medication_locks table in schema: %', tenant_schema;
        ELSE
            RAISE NOTICE 'Skipped medication_locks (medications table not found) in schema: %', tenant_schema;
        END IF;
    END LOOP;
END $$;
