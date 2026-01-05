-- CreateEnum
CREATE TYPE "InstitutionalEventType" AS ENUM ('DOCUMENT_EXPIRY', 'TRAINING', 'MEETING', 'INSPECTION', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "InstitutionalEventVisibility" AS ENUM ('ADMIN_ONLY', 'RT_ONLY', 'ALL_USERS');

-- CreateTable
CREATE TABLE "institutional_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "eventType" "InstitutionalEventType" NOT NULL,
    "visibility" "InstitutionalEventVisibility" NOT NULL DEFAULT 'ALL_USERS',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledDate" TIMESTAMPTZ(3) NOT NULL,
    "scheduledTime" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "status" "ScheduledEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMPTZ(3),
    "notes" TEXT,

    -- Campos específicos para vencimento de documentos
    "documentType" TEXT,
    "documentNumber" TEXT,
    "expiryDate" TIMESTAMPTZ(3),
    "responsible" TEXT,

    -- Campos específicos para treinamentos
    "trainingTopic" TEXT,
    "instructor" TEXT,
    "targetAudience" TEXT,
    "location" TEXT,

    -- Metadados adicionais (JSON flexível)
    "metadata" JSONB,

    -- Auditoria
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "institutional_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "institutional_events_tenantId_idx" ON "institutional_events"("tenantId");
CREATE INDEX "institutional_events_scheduledDate_idx" ON "institutional_events"("scheduledDate");
CREATE INDEX "institutional_events_eventType_idx" ON "institutional_events"("eventType");
CREATE INDEX "institutional_events_visibility_idx" ON "institutional_events"("visibility");
CREATE INDEX "institutional_events_status_idx" ON "institutional_events"("status");
CREATE INDEX "institutional_events_deletedAt_idx" ON "institutional_events"("deletedAt");
CREATE INDEX "institutional_events_tenantId_scheduledDate_idx" ON "institutional_events"("tenantId", "scheduledDate");
CREATE INDEX "institutional_events_tenantId_eventType_scheduledDate_idx" ON "institutional_events"("tenantId", "eventType", "scheduledDate");
CREATE INDEX "institutional_events_expiryDate_idx" ON "institutional_events"("expiryDate");

-- AddForeignKey
ALTER TABLE "institutional_events" ADD CONSTRAINT "institutional_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_events" ADD CONSTRAINT "institutional_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_events" ADD CONSTRAINT "institutional_events_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
