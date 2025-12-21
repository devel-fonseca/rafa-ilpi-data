-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "discountPercent" DECIMAL(5,2),
ADD COLUMN "discountReason" TEXT,
ADD COLUMN "customPrice" DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN "subscriptions"."discountPercent" IS 'Desconto percentual (0.00 a 100.00) aplicado sobre o preço base do plano';
COMMENT ON COLUMN "subscriptions"."discountReason" IS 'Razão do desconto (ex: Promoção Black Friday, Cliente VIP)';
COMMENT ON COLUMN "subscriptions"."customPrice" IS 'Preço customizado que substitui totalmente o plan.price';
