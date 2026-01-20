-- Script para aplicar migration de notification_recipients em todos os schemas de tenants
-- Executar com: PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user -d rafa_ilpi -f scripts/migrate-tenant-schemas.sql

-- Função para aplicar migration em um schema específico
CREATE OR REPLACE FUNCTION apply_notification_recipients_migration(schema_name text)
RETURNS void AS $$
BEGIN
    -- Criar tabela notification_recipients no schema do tenant
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.notification_recipients (
            id UUID NOT NULL,
            "notificationId" UUID NOT NULL,
            "userId" UUID NOT NULL,
            "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT notification_recipients_pkey PRIMARY KEY (id)
        )', schema_name);

    -- Criar índice único
    EXECUTE format('
        CREATE UNIQUE INDEX IF NOT EXISTS notification_recipients_notificationId_userId_key
        ON %I.notification_recipients("notificationId", "userId")
    ', schema_name);

    -- Criar índice de busca por userId
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS notification_recipients_userId_createdAt_idx
        ON %I.notification_recipients("userId", "createdAt" DESC)
    ', schema_name);

    -- Criar índice de busca por notificationId
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS notification_recipients_notificationId_idx
        ON %I.notification_recipients("notificationId")
    ', schema_name);

    -- Adicionar foreign key para notifications (verificar se já existe antes)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_recipients_notificationId_fkey'
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = schema_name)
    ) THEN
        EXECUTE format('
            ALTER TABLE %I.notification_recipients
            ADD CONSTRAINT notification_recipients_notificationId_fkey
            FOREIGN KEY ("notificationId") REFERENCES %I.notifications(id)
            ON DELETE CASCADE ON UPDATE CASCADE
        ', schema_name, schema_name);
    END IF;

    -- Adicionar foreign key para users (verificar se já existe antes)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_recipients_userId_fkey'
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = schema_name)
    ) THEN
        EXECUTE format('
            ALTER TABLE %I.notification_recipients
            ADD CONSTRAINT notification_recipients_userId_fkey
            FOREIGN KEY ("userId") REFERENCES %I.users(id)
            ON DELETE CASCADE ON UPDATE CASCADE
        ', schema_name, schema_name);
    END IF;

    RAISE NOTICE 'Migration aplicada no schema: %', schema_name;
END;
$$ LANGUAGE plpgsql;

-- Aplicar migration em todos os schemas de tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN
        SELECT "schemaName" FROM public.tenants WHERE "deletedAt" IS NULL
    LOOP
        PERFORM apply_notification_recipients_migration(tenant_record."schemaName");
    END LOOP;
END $$;

-- Limpar função temporária
DROP FUNCTION IF EXISTS apply_notification_recipients_migration(text);

-- Confirmar schemas processados
SELECT "schemaName", "name"
FROM public.tenants
WHERE "deletedAt" IS NULL
ORDER BY "createdAt";
