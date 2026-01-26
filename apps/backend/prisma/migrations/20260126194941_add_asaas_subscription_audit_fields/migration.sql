-- AlterTable
ALTER TABLE "public"."subscriptions"
  ADD COLUMN IF NOT EXISTS "asaas_created_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "asaas_creation_error" TEXT,
  ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "asaas_sync_error" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "public"."subscriptions"."asaas_created_at" IS 'Data de criação da subscription no Asaas (auditoria)';
COMMENT ON COLUMN "public"."subscriptions"."asaas_creation_error" IS 'Erro na tentativa de criação no Asaas (para retry manual)';
COMMENT ON COLUMN "public"."subscriptions"."last_synced_at" IS 'Última sincronização com Asaas (job de sync bidirecional)';
COMMENT ON COLUMN "public"."subscriptions"."asaas_sync_error" IS 'Erro na sincronização com Asaas';
