-- CreateEnum
CREATE TYPE "ClinicalProfession" AS ENUM ('MEDICINE', 'NURSING', 'NUTRITION', 'PHYSIOTHERAPY', 'PSYCHOLOGY', 'SOCIAL_WORK', 'SPEECH_THERAPY', 'OCCUPATIONAL_THERAPY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionType" ADD VALUE 'VIEW_CLINICAL_NOTES';
ALTER TYPE "PermissionType" ADD VALUE 'CREATE_CLINICAL_NOTES';
ALTER TYPE "PermissionType" ADD VALUE 'UPDATE_CLINICAL_NOTES';
ALTER TYPE "PermissionType" ADD VALUE 'DELETE_CLINICAL_NOTES';

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "profession" "ClinicalProfession" NOT NULL,
    "noteDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isAmended" BOOLEAN NOT NULL DEFAULT false,
    "editableUntil" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes_history" (
    "id" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "profession" "ClinicalProfession" NOT NULL,
    "noteDate" TIMESTAMPTZ(3) NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changeReason" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" UUID NOT NULL,

    CONSTRAINT "clinical_notes_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_notes_tenantId_residentId_noteDate_idx" ON "clinical_notes"("tenantId", "residentId", "noteDate" DESC);

-- CreateIndex
CREATE INDEX "clinical_notes_tenantId_professionalId_idx" ON "clinical_notes"("tenantId", "professionalId");

-- CreateIndex
CREATE INDEX "clinical_notes_profession_idx" ON "clinical_notes"("profession");

-- CreateIndex
CREATE INDEX "clinical_notes_noteDate_idx" ON "clinical_notes"("noteDate");

-- CreateIndex
CREATE INDEX "clinical_notes_tags_idx" ON "clinical_notes"("tags");

-- CreateIndex
CREATE INDEX "clinical_notes_isAmended_idx" ON "clinical_notes"("isAmended");

-- CreateIndex
CREATE INDEX "clinical_notes_history_noteId_version_idx" ON "clinical_notes_history"("noteId", "version");

-- CreateIndex
CREATE INDEX "clinical_notes_history_tenantId_residentId_idx" ON "clinical_notes_history"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "clinical_notes_history_changedAt_idx" ON "clinical_notes_history"("changedAt");

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes_history" ADD CONSTRAINT "clinical_notes_history_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes_history" ADD CONSTRAINT "clinical_notes_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes_history" ADD CONSTRAINT "clinical_notes_history_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes_history" ADD CONSTRAINT "clinical_notes_history_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes_history" ADD CONSTRAINT "clinical_notes_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
