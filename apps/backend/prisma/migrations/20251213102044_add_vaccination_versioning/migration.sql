/*
  Warnings:

  - You are about to drop the column `userId` on the `vaccinations` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `vaccinations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "vaccinations" DROP CONSTRAINT "vaccinations_userId_fkey";

-- AlterTable
ALTER TABLE "vaccinations" DROP COLUMN "userId",
ADD COLUMN     "createdBy" UUID NOT NULL,
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "vaccination_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vaccinationId" UUID NOT NULL,
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

    CONSTRAINT "vaccination_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaccination_history_tenantId_vaccinationId_versionNumber_idx" ON "vaccination_history"("tenantId", "vaccinationId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "vaccination_history_tenantId_changedAt_idx" ON "vaccination_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "vaccination_history_changedBy_idx" ON "vaccination_history"("changedBy");

-- CreateIndex
CREATE INDEX "vaccination_history_changeType_idx" ON "vaccination_history"("changeType");

-- CreateIndex
CREATE INDEX "vaccinations_createdBy_idx" ON "vaccinations"("createdBy");

-- CreateIndex
CREATE INDEX "vaccinations_updatedBy_idx" ON "vaccinations"("updatedBy");

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_history" ADD CONSTRAINT "vaccination_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_history" ADD CONSTRAINT "vaccination_history_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "vaccinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_history" ADD CONSTRAINT "vaccination_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
