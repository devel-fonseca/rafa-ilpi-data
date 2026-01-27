-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN "subscribed_features" JSONB;

-- Backfill: Copiar features do plano para subscriptions existentes
-- Isso garante que assinantes mantenham acesso mesmo se o plano mudar
UPDATE "public"."subscriptions" s
SET "subscribed_features" = p.features
FROM "public"."plans" p
WHERE s."planId" = p.id
  AND s."subscribed_features" IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN "public"."subscriptions"."subscribed_features" IS 'Snapshot das features do plano no momento da assinatura. Garante que mudanças no plano não afetem assinantes existentes.';
