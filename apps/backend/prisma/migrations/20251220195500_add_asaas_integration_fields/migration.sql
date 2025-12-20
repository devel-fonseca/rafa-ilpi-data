-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable: Add asaasCustomerId to tenants
ALTER TABLE "tenants" ADD COLUMN "asaasCustomerId" VARCHAR(255);

-- AlterTable: Add asaasSubscriptionId to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "asaasSubscriptionId" VARCHAR(255);

-- AlterTable: Add billingCycle to plans
ALTER TABLE "plans" ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

-- CreateIndex: Unique constraint for asaasCustomerId
CREATE UNIQUE INDEX "tenants_asaasCustomerId_key" ON "tenants"("asaasCustomerId");

-- CreateIndex: Unique constraint for asaasSubscriptionId
CREATE UNIQUE INDEX "subscriptions_asaasSubscriptionId_key" ON "subscriptions"("asaasSubscriptionId");
