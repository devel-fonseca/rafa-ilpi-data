/*
  Warnings:

  - You are about to drop the column `recordedBy` on the `conditions` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `conditions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conditions" DROP CONSTRAINT "conditions_recordedBy_fkey";

-- AlterTable
ALTER TABLE "conditions" DROP COLUMN "recordedBy",
ADD COLUMN     "createdBy" UUID NOT NULL,
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "condition_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "conditionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "condition_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "condition_history_tenantId_conditionId_versionNumber_idx" ON "condition_history"("tenantId", "conditionId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "condition_history_tenantId_changedAt_idx" ON "condition_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "condition_history_changedBy_idx" ON "condition_history"("changedBy");

-- CreateIndex
CREATE INDEX "condition_history_changeType_idx" ON "condition_history"("changeType");

-- CreateIndex
CREATE INDEX "conditions_createdBy_idx" ON "conditions"("createdBy");

-- CreateIndex
CREATE INDEX "conditions_updatedBy_idx" ON "conditions"("updatedBy");

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_history" ADD CONSTRAINT "condition_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_history" ADD CONSTRAINT "condition_history_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_history" ADD CONSTRAINT "condition_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
