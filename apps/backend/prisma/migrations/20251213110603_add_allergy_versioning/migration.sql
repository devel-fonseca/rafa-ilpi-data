/*
  Warnings:

  - You are about to drop the column `recordedBy` on the `allergies` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `allergies` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "allergies" DROP CONSTRAINT "allergies_recordedBy_fkey";

-- AlterTable
ALTER TABLE "allergies" DROP COLUMN "recordedBy",
ADD COLUMN     "createdBy" UUID NOT NULL,
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "allergy_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "allergyId" UUID NOT NULL,
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

    CONSTRAINT "allergy_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "allergy_history_tenantId_allergyId_versionNumber_idx" ON "allergy_history"("tenantId", "allergyId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "allergy_history_tenantId_changedAt_idx" ON "allergy_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "allergy_history_changedBy_idx" ON "allergy_history"("changedBy");

-- CreateIndex
CREATE INDEX "allergy_history_changeType_idx" ON "allergy_history"("changeType");

-- CreateIndex
CREATE INDEX "allergies_createdBy_idx" ON "allergies"("createdBy");

-- CreateIndex
CREATE INDEX "allergies_updatedBy_idx" ON "allergies"("updatedBy");

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_history" ADD CONSTRAINT "allergy_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_history" ADD CONSTRAINT "allergy_history_allergyId_fkey" FOREIGN KEY ("allergyId") REFERENCES "allergies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_history" ADD CONSTRAINT "allergy_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
