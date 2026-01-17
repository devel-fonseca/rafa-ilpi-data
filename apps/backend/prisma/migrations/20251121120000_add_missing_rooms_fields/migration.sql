-- Migração condicional para adicionar colunas em rooms apenas se não existirem
-- IMPORTANTE: Usa current_schema() para funcionar tanto no schema public quanto em schemas de tenant

DO $$
BEGIN
    -- Adicionar coluna 'code' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'rooms' AND column_name = 'code'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "code" TEXT;
    END IF;

    -- Adicionar coluna 'roomNumber' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'rooms' AND column_name = 'roomNumber'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "roomNumber" TEXT;
    END IF;

    -- Adicionar coluna 'hasPrivateBathroom' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'rooms' AND column_name = 'hasPrivateBathroom'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "hasPrivateBathroom" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Adicionar coluna 'accessible' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'rooms' AND column_name = 'accessible'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "accessible" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Adicionar coluna 'observations' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'rooms' AND column_name = 'observations'
    ) THEN
        ALTER TABLE "rooms" ADD COLUMN "observations" TEXT;
    END IF;

    -- Criar índice se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema() AND tablename = 'rooms' AND indexname = 'rooms_code_idx'
    ) THEN
        CREATE INDEX "rooms_code_idx" ON "rooms"("code");
    END IF;
END $$;