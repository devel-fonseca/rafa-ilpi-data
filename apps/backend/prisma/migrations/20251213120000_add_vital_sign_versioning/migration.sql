-- AlterTable: Adicionar campos de versionamento no VitalSign
ALTER TABLE "vital_signs" ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "vital_signs" ADD COLUMN "createdBy" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE "vital_signs" ADD COLUMN "updatedBy" UUID;

-- CreateTable: VitalSignHistory
CREATE TABLE "vital_sign_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "vitalSignId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "changedFields" TEXT[],
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,

    CONSTRAINT "vital_sign_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vital_sign_history_vitalSignId_versionNumber_idx" ON "vital_sign_history"("vitalSignId", "versionNumber");
CREATE INDEX "vital_sign_history_tenantId_changedAt_idx" ON "vital_sign_history"("tenantId", "changedAt" DESC);

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_sign_history" ADD CONSTRAINT "vital_sign_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vital_sign_history" ADD CONSTRAINT "vital_sign_history_vitalSignId_fkey" FOREIGN KEY ("vitalSignId") REFERENCES "vital_signs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vital_sign_history" ADD CONSTRAINT "vital_sign_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
