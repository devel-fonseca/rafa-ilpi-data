/*
  Warnings:

  - Added the required column `createdBy` to the `medications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "createdBy" UUID NOT NULL,
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "medication_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
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

    CONSTRAINT "medication_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medication_history_tenantId_medicationId_versionNumber_idx" ON "medication_history"("tenantId", "medicationId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "medication_history_tenantId_changedAt_idx" ON "medication_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "medication_history_changedBy_idx" ON "medication_history"("changedBy");

-- CreateIndex
CREATE INDEX "medication_history_changeType_idx" ON "medication_history"("changeType");

-- CreateIndex
CREATE INDEX "medications_createdBy_idx" ON "medications"("createdBy");

-- CreateIndex
CREATE INDEX "medications_updatedBy_idx" ON "medications"("updatedBy");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
