-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('ROTINA', 'ALTERACAO_PONTUAL', 'ANTIBIOTICO', 'ALTO_RISCO', 'CONTROLADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "AdministrationRoute" AS ENUM ('VO', 'IM', 'EV', 'SC', 'TOPICA', 'SL', 'RETAL', 'OCULAR', 'NASAL', 'INALATORIA', 'OUTRA');

-- CreateEnum
CREATE TYPE "MedicationPresentation" AS ENUM ('COMPRIMIDO', 'CAPSULA', 'AMPOLA', 'GOTAS', 'SOLUCAO', 'SUSPENSAO', 'POMADA', 'CREME', 'SPRAY', 'INALADOR', 'ADESIVO', 'SUPOSITORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AMARELA', 'AZUL', 'BRANCA_ESPECIAL', 'NAO_APLICA');

-- CreateEnum
CREATE TYPE "ControlledClass" AS ENUM ('BZD', 'PSICOFARMACO', 'OPIOIDE', 'ANTICONVULSIVANTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "MedicationFrequency" AS ENUM ('UMA_VEZ_DIA', 'DUAS_VEZES_DIA', 'SEIS_SEIS_H', 'OITO_OITO_H', 'DOZE_DOZE_H', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "SOSIndicationType" AS ENUM ('DOR', 'FEBRE', 'ANSIEDADE', 'AGITACAO', 'NAUSEA', 'INSONIA', 'OUTRO');

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "doctorName" TEXT NOT NULL,
    "doctorCrm" TEXT NOT NULL,
    "doctorCrmState" TEXT NOT NULL,
    "prescriptionDate" DATE NOT NULL,
    "prescriptionType" "PrescriptionType" NOT NULL,
    "validUntil" DATE,
    "controlledClass" "ControlledClass",
    "notificationNumber" TEXT,
    "notificationType" "NotificationType",
    "prescriptionImageUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdBy" UUID NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "presentation" "MedicationPresentation" NOT NULL,
    "concentration" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" "AdministrationRoute" NOT NULL,
    "frequency" "MedicationFrequency" NOT NULL,
    "scheduledTimes" JSONB NOT NULL DEFAULT '[]',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "requiresDoubleCheck" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_medications" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "presentation" "MedicationPresentation" NOT NULL,
    "concentration" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" "AdministrationRoute" NOT NULL,
    "indication" "SOSIndicationType" NOT NULL,
    "indicationDetails" TEXT,
    "minInterval" TEXT NOT NULL,
    "maxDailyDoses" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "instructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sos_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "actualTime" TEXT,
    "wasAdministered" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "administeredBy" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "checkedBy" TEXT,
    "checkedByUserId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_administrations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "sosMedicationId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "indication" TEXT NOT NULL,
    "administeredBy" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sos_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_residentId_idx" ON "prescriptions"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_isActive_idx" ON "prescriptions"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_validUntil_idx" ON "prescriptions"("tenantId", "validUntil");

-- CreateIndex
CREATE INDEX "prescriptions_deletedAt_idx" ON "prescriptions"("deletedAt");

-- CreateIndex
CREATE INDEX "medications_prescriptionId_idx" ON "medications"("prescriptionId");

-- CreateIndex
CREATE INDEX "medications_isControlled_idx" ON "medications"("isControlled");

-- CreateIndex
CREATE INDEX "medications_startDate_endDate_idx" ON "medications"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "medications_deletedAt_idx" ON "medications"("deletedAt");

-- CreateIndex
CREATE INDEX "sos_medications_prescriptionId_idx" ON "sos_medications"("prescriptionId");

-- CreateIndex
CREATE INDEX "sos_medications_indication_idx" ON "sos_medications"("indication");

-- CreateIndex
CREATE INDEX "sos_medications_deletedAt_idx" ON "sos_medications"("deletedAt");

-- CreateIndex
CREATE INDEX "medication_administrations_tenantId_date_idx" ON "medication_administrations"("tenantId", "date" DESC);

-- CreateIndex
CREATE INDEX "medication_administrations_residentId_date_idx" ON "medication_administrations"("residentId", "date" DESC);

-- CreateIndex
CREATE INDEX "medication_administrations_medicationId_date_idx" ON "medication_administrations"("medicationId", "date");

-- CreateIndex
CREATE INDEX "medication_administrations_wasAdministered_idx" ON "medication_administrations"("wasAdministered");

-- CreateIndex
CREATE INDEX "sos_administrations_tenantId_date_idx" ON "sos_administrations"("tenantId", "date" DESC);

-- CreateIndex
CREATE INDEX "sos_administrations_residentId_date_idx" ON "sos_administrations"("residentId", "date" DESC);

-- CreateIndex
CREATE INDEX "sos_administrations_sosMedicationId_date_idx" ON "sos_administrations"("sosMedicationId", "date");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_medications" ADD CONSTRAINT "sos_medications_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_sosMedicationId_fkey" FOREIGN KEY ("sosMedicationId") REFERENCES "sos_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
