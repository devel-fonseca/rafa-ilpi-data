-- CreateEnum
CREATE TYPE "ContractDocumentStatus" AS ENUM ('VIGENTE', 'VENCENDO_EM_30_DIAS', 'VENCIDO');

-- CreateEnum
CREATE TYPE "ContractHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'REPLACED', 'DELETED');

-- CreateEnum
CREATE TYPE "SignatoryRole" AS ENUM ('RESIDENTE', 'RESPONSAVEL_LEGAL', 'TESTEMUNHA', 'ILPI');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionType" ADD VALUE 'VIEW_CONTRACTS';
ALTER TYPE "PermissionType" ADD VALUE 'CREATE_CONTRACTS';
ALTER TYPE "PermissionType" ADD VALUE 'UPDATE_CONTRACTS';
ALTER TYPE "PermissionType" ADD VALUE 'REPLACE_CONTRACTS';
ALTER TYPE "PermissionType" ADD VALUE 'DELETE_CONTRACTS';
ALTER TYPE "PermissionType" ADD VALUE 'VALIDATE_CONTRACTS';

-- CreateTable
CREATE TABLE "resident_contracts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "contractNumber" VARCHAR(100) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "monthlyAmount" DECIMAL(10,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "status" "ContractDocumentStatus" NOT NULL,
    "adjustmentIndex" VARCHAR(50),
    "adjustmentRate" DECIMAL(5,2),
    "lastAdjustmentDate" DATE,
    "signatories" JSONB NOT NULL,
    "originalFileUrl" TEXT NOT NULL,
    "originalFileKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalFileSize" INTEGER NOT NULL,
    "originalFileMimeType" VARCHAR(100) NOT NULL,
    "originalFileHash" VARCHAR(64) NOT NULL,
    "processedFileUrl" TEXT NOT NULL,
    "processedFileKey" TEXT NOT NULL,
    "processedFileName" TEXT NOT NULL,
    "processedFileSize" INTEGER NOT NULL,
    "processedFileHash" VARCHAR(64) NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacedById" UUID,
    "replacedAt" TIMESTAMPTZ(3),
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_contracts_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "action" "ContractHistoryAction" NOT NULL,
    "reason" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident_contracts_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident_contracts_tenantId_residentId_idx" ON "resident_contracts"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "resident_contracts_tenantId_status_idx" ON "resident_contracts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "resident_contracts_tenantId_endDate_idx" ON "resident_contracts"("tenantId", "endDate");

-- CreateIndex
CREATE INDEX "resident_contracts_residentId_idx" ON "resident_contracts"("residentId");

-- CreateIndex
CREATE INDEX "resident_contracts_endDate_idx" ON "resident_contracts"("endDate");

-- CreateIndex
CREATE INDEX "resident_contracts_status_idx" ON "resident_contracts"("status");

-- CreateIndex
CREATE INDEX "resident_contracts_deletedAt_idx" ON "resident_contracts"("deletedAt");

-- CreateIndex
CREATE INDEX "resident_contracts_replacedById_idx" ON "resident_contracts"("replacedById");

-- CreateIndex
CREATE INDEX "resident_contracts_version_idx" ON "resident_contracts"("version");

-- CreateIndex
CREATE INDEX "resident_contracts_processedFileHash_idx" ON "resident_contracts"("processedFileHash");

-- CreateIndex
CREATE UNIQUE INDEX "resident_contracts_tenantId_contractNumber_key" ON "resident_contracts"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "resident_contracts_history_tenantId_contractId_idx" ON "resident_contracts_history"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "resident_contracts_history_contractId_idx" ON "resident_contracts_history"("contractId");

-- CreateIndex
CREATE INDEX "resident_contracts_history_action_idx" ON "resident_contracts_history"("action");

-- CreateIndex
CREATE INDEX "resident_contracts_history_changedAt_idx" ON "resident_contracts_history"("changedAt");

-- AddForeignKey
ALTER TABLE "resident_contracts" ADD CONSTRAINT "resident_contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_contracts" ADD CONSTRAINT "resident_contracts_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_contracts" ADD CONSTRAINT "resident_contracts_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_contracts" ADD CONSTRAINT "resident_contracts_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "resident_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_contracts_history" ADD CONSTRAINT "resident_contracts_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_contracts_history" ADD CONSTRAINT "resident_contracts_history_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "resident_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_contracts_history" ADD CONSTRAINT "resident_contracts_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
