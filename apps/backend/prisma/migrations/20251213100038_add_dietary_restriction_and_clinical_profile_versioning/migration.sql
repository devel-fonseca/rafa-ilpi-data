/*
  Warnings:

  - You are about to drop the column `updatedBy` on the `allergies` table. All the data in the column will be lost.
  - You are about to drop the column `versionNumber` on the `allergies` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `conditions` table. All the data in the column will be lost.
  - You are about to drop the column `versionNumber` on the `conditions` table. All the data in the column will be lost.
  - You are about to drop the `allergy_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `condition_history` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `createdBy` to the `dietary_restrictions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "allergies" DROP CONSTRAINT "allergies_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "allergy_history" DROP CONSTRAINT "allergy_history_allergyId_fkey";

-- DropForeignKey
ALTER TABLE "allergy_history" DROP CONSTRAINT "allergy_history_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "allergy_history" DROP CONSTRAINT "allergy_history_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "condition_history" DROP CONSTRAINT "condition_history_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "condition_history" DROP CONSTRAINT "condition_history_conditionId_fkey";

-- DropForeignKey
ALTER TABLE "condition_history" DROP CONSTRAINT "condition_history_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "conditions" DROP CONSTRAINT "conditions_updatedBy_fkey";

-- DropIndex
DROP INDEX "allergies_recordedBy_idx";

-- DropIndex
DROP INDEX "allergies_updatedBy_idx";

-- DropIndex
DROP INDEX "conditions_recordedBy_idx";

-- DropIndex
DROP INDEX "conditions_updatedBy_idx";

-- AlterTable
ALTER TABLE "allergies" DROP COLUMN "updatedBy",
DROP COLUMN "versionNumber";

-- AlterTable
ALTER TABLE "clinical_profiles" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "conditions" DROP COLUMN "updatedBy",
DROP COLUMN "versionNumber";

-- AlterTable
ALTER TABLE "dietary_restrictions" ADD COLUMN     "createdBy" UUID NOT NULL,
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "allergy_history";

-- DropTable
DROP TABLE "condition_history";

-- CreateTable
CREATE TABLE "clinical_profile_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "clinicalProfileId" UUID NOT NULL,
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

    CONSTRAINT "clinical_profile_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_restriction_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dietaryRestrictionId" UUID NOT NULL,
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

    CONSTRAINT "dietary_restriction_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_profile_history_tenantId_clinicalProfileId_version_idx" ON "clinical_profile_history"("tenantId", "clinicalProfileId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "clinical_profile_history_tenantId_changedAt_idx" ON "clinical_profile_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "clinical_profile_history_changedBy_idx" ON "clinical_profile_history"("changedBy");

-- CreateIndex
CREATE INDEX "clinical_profile_history_changeType_idx" ON "clinical_profile_history"("changeType");

-- CreateIndex
CREATE INDEX "dietary_restriction_history_tenantId_dietaryRestrictionId_v_idx" ON "dietary_restriction_history"("tenantId", "dietaryRestrictionId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "dietary_restriction_history_tenantId_changedAt_idx" ON "dietary_restriction_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "dietary_restriction_history_changedBy_idx" ON "dietary_restriction_history"("changedBy");

-- CreateIndex
CREATE INDEX "dietary_restriction_history_changeType_idx" ON "dietary_restriction_history"("changeType");

-- CreateIndex
CREATE INDEX "clinical_profiles_createdBy_idx" ON "clinical_profiles"("createdBy");

-- CreateIndex
CREATE INDEX "clinical_profiles_updatedBy_idx" ON "clinical_profiles"("updatedBy");

-- CreateIndex
CREATE INDEX "dietary_restrictions_createdBy_idx" ON "dietary_restrictions"("createdBy");

-- CreateIndex
CREATE INDEX "dietary_restrictions_updatedBy_idx" ON "dietary_restrictions"("updatedBy");

-- AddForeignKey
ALTER TABLE "clinical_profiles" ADD CONSTRAINT "clinical_profiles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_profile_history" ADD CONSTRAINT "clinical_profile_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_profile_history" ADD CONSTRAINT "clinical_profile_history_clinicalProfileId_fkey" FOREIGN KEY ("clinicalProfileId") REFERENCES "clinical_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_profile_history" ADD CONSTRAINT "clinical_profile_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restriction_history" ADD CONSTRAINT "dietary_restriction_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restriction_history" ADD CONSTRAINT "dietary_restriction_history_dietaryRestrictionId_fkey" FOREIGN KEY ("dietaryRestrictionId") REFERENCES "dietary_restrictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restriction_history" ADD CONSTRAINT "dietary_restriction_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
