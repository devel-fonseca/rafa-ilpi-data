-- CreateEnum
CREATE TYPE "VitalSignAlertType" AS ENUM ('PRESSURE_HIGH', 'PRESSURE_LOW', 'GLUCOSE_HIGH', 'GLUCOSE_LOW', 'TEMPERATURE_HIGH', 'TEMPERATURE_LOW', 'OXYGEN_LOW', 'HEART_RATE_HIGH', 'HEART_RATE_LOW');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'IN_TREATMENT', 'MONITORING', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "vital_sign_alerts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "vitalSignId" UUID NOT NULL,
    "notificationId" UUID,
    "type" "VitalSignAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" UUID,
    "medicalNotes" TEXT,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedBy" UUID,
    "createdBy" UUID,

    CONSTRAINT "vital_sign_alerts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (vitalSignAlertId) to clinical_notes
ALTER TABLE "clinical_notes" ADD COLUMN "vitalSignAlertId" UUID;

-- CreateIndex
CREATE INDEX "vital_sign_alerts_tenantId_residentId_idx" ON "vital_sign_alerts"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "vital_sign_alerts_tenantId_status_idx" ON "vital_sign_alerts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "vital_sign_alerts_tenantId_createdAt_idx" ON "vital_sign_alerts"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "vital_sign_alerts_residentId_status_idx" ON "vital_sign_alerts"("residentId", "status");

-- CreateIndex
CREATE INDEX "vital_sign_alerts_vitalSignId_idx" ON "vital_sign_alerts"("vitalSignId");

-- CreateIndex
CREATE INDEX "vital_sign_alerts_notificationId_idx" ON "vital_sign_alerts"("notificationId");

-- CreateIndex
CREATE INDEX "vital_sign_alerts_assignedTo_idx" ON "vital_sign_alerts"("assignedTo");

-- CreateIndex on clinical_notes
CREATE INDEX "clinical_notes_vitalSignAlertId_idx" ON "clinical_notes"("vitalSignAlertId");

-- AddForeignKey
ALTER TABLE "vital_sign_alerts" ADD CONSTRAINT "vital_sign_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_sign_alerts" ADD CONSTRAINT "vital_sign_alerts_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_sign_alerts" ADD CONSTRAINT "vital_sign_alerts_vitalSignId_fkey" FOREIGN KEY ("vitalSignId") REFERENCES "vital_signs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_sign_alerts" ADD CONSTRAINT "vital_sign_alerts_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_sign_alerts" ADD CONSTRAINT "vital_sign_alerts_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_sign_alerts" ADD CONSTRAINT "vital_sign_alerts_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_vitalSignAlertId_fkey" FOREIGN KEY ("vitalSignAlertId") REFERENCES "vital_sign_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
