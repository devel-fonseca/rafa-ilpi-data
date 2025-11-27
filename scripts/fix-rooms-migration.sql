-- Script para corrigir problema de migração da coluna 'code' em 'rooms'
-- Este script verifica se as colunas já existem antes de tentar adicioná-las

-- Função auxiliar para verificar se uma coluna existe
DO $$
BEGIN
    -- Adicionar coluna 'code' se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'code'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "code" TEXT;
    END IF;

    -- Adicionar coluna 'roomNumber' se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'roomNumber'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "roomNumber" TEXT;
    END IF;

    -- Adicionar coluna 'hasPrivateBathroom' se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'hasPrivateBathroom'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "hasPrivateBathroom" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Adicionar coluna 'accessible' se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'accessible'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "accessible" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Adicionar coluna 'observations' se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'observations'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "observations" TEXT;
    END IF;
END $$;

-- Criar índice se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'rooms'
        AND indexname = 'rooms_code_idx'
    ) THEN
        CREATE INDEX "rooms_code_idx" ON "rooms"("code");
    END IF;
END $$;

-- Verificar e marcar a migração como aplicada se necessário
-- Isso evita que o Prisma tente aplicar a migração novamente
DO $$
BEGIN
    -- Verificar se a migração já está marcada como aplicada
    IF NOT EXISTS (
        SELECT 1
        FROM "_prisma_migrations"
        WHERE migration_name = '20251121120000_add_missing_rooms_fields'
    ) THEN
        -- Marcar a migração como aplicada
        INSERT INTO "_prisma_migrations" (
            id,
            checksum,
            finished_at,
            migration_name,
            logs,
            rolled_back_at,
            started_at,
            applied_steps_count
        ) VALUES (
            gen_random_uuid()::text,
            '4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7', -- checksum fictício
            NOW(),
            '20251121120000_add_missing_rooms_fields',
            NULL,
            NULL,
            NOW(),
            1
        );

        RAISE NOTICE 'Migração 20251121120000_add_missing_rooms_fields marcada como aplicada';
    ELSE
        RAISE NOTICE 'Migração 20251121120000_add_missing_rooms_fields já estava aplicada';
    END IF;
END $$;

-- Verificar estrutura final da tabela
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rooms'
ORDER BY ordinal_position;