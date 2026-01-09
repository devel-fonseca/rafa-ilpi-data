-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('CLINICA', 'ASSISTENCIAL', 'ADMINISTRATIVA');

-- CreateEnum
CREATE TYPE "IncidentSubtypeClinical" AS ENUM ('QUEDA_COM_LESAO', 'QUEDA_SEM_LESAO', 'TENTATIVA_SUICIDIO', 'DOENCA_DIARREICA_AGUDA', 'DESIDRATACAO', 'ULCERA_DECUBITO', 'DESNUTRICAO', 'ESCABIOSE', 'FEBRE_HIPERTERMIA', 'HIPOTERMIA', 'HIPOGLICEMIA', 'HIPERGLICEMIA', 'CONVULSAO', 'ALTERACAO_CONSCIENCIA', 'DOR_TORACICA', 'DISPNEIA', 'VOMITO', 'SANGRAMENTO', 'REACAO_ALERGICA', 'OBITO', 'OUTRA_CLINICA');

-- CreateEnum
CREATE TYPE "IncidentSubtypeAssistencial" AS ENUM ('ERRO_MEDICACAO', 'RECUSA_MEDICACAO', 'RECUSA_ALIMENTACAO', 'RECUSA_HIGIENE', 'RECUSA_BANHO', 'AGITACAO_PSICOMOTORA', 'AGRESSIVIDADE', 'FUGA_EVASAO', 'PERDA_OBJETOS', 'DANO_EQUIPAMENTO', 'OUTRA_ASSISTENCIAL');

-- CreateEnum
CREATE TYPE "IncidentSubtypeAdministrativa" AS ENUM ('AUSENCIA_PROFISSIONAL', 'FALTA_INSUMO', 'FALTA_MEDICAMENTO', 'EQUIPAMENTO_QUEBRADO', 'PROBLEMA_INFRAESTRUTURA', 'RECLAMACAO_FAMILIAR', 'CONFLITO_EQUIPE', 'OUTRA_ADMINISTRATIVA');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LEVE', 'MODERADA', 'GRAVE', 'CRITICA');

-- CreateEnum
CREATE TYPE "RdcIndicatorType" AS ENUM ('MORTALIDADE', 'DIARREIA_AGUDA', 'ESCABIOSE', 'DESIDRATACAO', 'ULCERA_DECUBITO', 'DESNUTRICAO');

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'INCIDENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SystemNotificationType" ADD VALUE 'INCIDENT_CREATED';
ALTER TYPE "SystemNotificationType" ADD VALUE 'INCIDENT_SENTINEL_EVENT';
ALTER TYPE "SystemNotificationType" ADD VALUE 'INCIDENT_RDC_INDICATOR_ALERT';

-- AlterTable
ALTER TABLE "daily_records" ADD COLUMN     "dataNotificacao" TIMESTAMPTZ(3),
ADD COLUMN     "incidentCategory" "IncidentCategory",
ADD COLUMN     "incidentSeverity" "IncidentSeverity",
ADD COLUMN     "incidentSubtypeAdmin" "IncidentSubtypeAdministrativa",
ADD COLUMN     "incidentSubtypeAssist" "IncidentSubtypeAssistencial",
ADD COLUMN     "incidentSubtypeClinical" "IncidentSubtypeClinical",
ADD COLUMN     "isDoencaNotificavel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEventoSentinela" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificadoVigilancia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "protocoloNotificacao" VARCHAR(100),
ADD COLUMN     "rdcIndicators" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "incident_monthly_indicators" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "indicatorType" "RdcIndicatorType" NOT NULL,
    "numerator" INTEGER NOT NULL,
    "denominator" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "incidentIds" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" UUID,

    CONSTRAINT "incident_monthly_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_event_notifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dailyRecordId" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    "protocolo" VARCHAR(100),
    "dataEnvio" TIMESTAMPTZ(3),
    "dataConfirmacao" TIMESTAMPTZ(3),
    "responsavelEnvio" UUID,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "emailEnviadoEm" TIMESTAMPTZ(3),
    "emailDestinatarios" JSONB DEFAULT '[]',
    "observacoes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sentinel_event_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_monthly_indicators_tenantId_year_month_idx" ON "incident_monthly_indicators"("tenantId", "year" DESC, "month" DESC);

-- CreateIndex
CREATE INDEX "incident_monthly_indicators_indicatorType_idx" ON "incident_monthly_indicators"("indicatorType");

-- CreateIndex
CREATE UNIQUE INDEX "incident_monthly_indicators_tenantId_year_month_indicatorTy_key" ON "incident_monthly_indicators"("tenantId", "year", "month", "indicatorType");

-- CreateIndex
CREATE INDEX "sentinel_event_notifications_tenantId_status_idx" ON "sentinel_event_notifications"("tenantId", "status");

-- CreateIndex
CREATE INDEX "sentinel_event_notifications_tenantId_createdAt_idx" ON "sentinel_event_notifications"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sentinel_event_notifications_dailyRecordId_idx" ON "sentinel_event_notifications"("dailyRecordId");

-- CreateIndex
CREATE INDEX "sentinel_event_notifications_status_idx" ON "sentinel_event_notifications"("status");

-- AddForeignKey
ALTER TABLE "incident_monthly_indicators" ADD CONSTRAINT "incident_monthly_indicators_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_monthly_indicators" ADD CONSTRAINT "incident_monthly_indicators_calculatedBy_fkey" FOREIGN KEY ("calculatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_event_notifications" ADD CONSTRAINT "sentinel_event_notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_event_notifications" ADD CONSTRAINT "sentinel_event_notifications_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "daily_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_event_notifications" ADD CONSTRAINT "sentinel_event_notifications_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_event_notifications" ADD CONSTRAINT "sentinel_event_notifications_responsavelEnvio_fkey" FOREIGN KEY ("responsavelEnvio") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
