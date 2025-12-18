-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScheduledEventType" AS ENUM ('VACCINATION', 'CONSULTATION', 'EXAM', 'PROCEDURE', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduledEventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionType" ADD VALUE 'VIEW_RESIDENT_SCHEDULE';
ALTER TYPE "PermissionType" ADD VALUE 'MANAGE_RESIDENT_SCHEDULE';

-- CreateTable
CREATE TABLE "resident_schedule_configs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "recordType" "RecordType" NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "suggestedTimes" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_schedule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_scheduled_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "eventType" "ScheduledEventType" NOT NULL,
    "scheduledDate" TIMESTAMPTZ(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vaccineData" JSONB,
    "status" "ScheduledEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedRecordId" UUID,
    "completedAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_scheduled_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident_schedule_configs_tenantId_residentId_idx" ON "resident_schedule_configs"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "resident_schedule_configs_residentId_isActive_idx" ON "resident_schedule_configs"("residentId", "isActive");

-- CreateIndex
CREATE INDEX "resident_schedule_configs_recordType_idx" ON "resident_schedule_configs"("recordType");

-- CreateIndex
CREATE INDEX "resident_schedule_configs_deletedAt_idx" ON "resident_schedule_configs"("deletedAt");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_tenantId_scheduledDate_idx" ON "resident_scheduled_events"("tenantId", "scheduledDate");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_residentId_scheduledDate_idx" ON "resident_scheduled_events"("residentId", "scheduledDate");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_status_scheduledDate_idx" ON "resident_scheduled_events"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_eventType_idx" ON "resident_scheduled_events"("eventType");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_deletedAt_idx" ON "resident_scheduled_events"("deletedAt");

-- AddForeignKey
ALTER TABLE "resident_schedule_configs" ADD CONSTRAINT "resident_schedule_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_schedule_configs" ADD CONSTRAINT "resident_schedule_configs_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_schedule_configs" ADD CONSTRAINT "resident_schedule_configs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_schedule_configs" ADD CONSTRAINT "resident_schedule_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_scheduled_events" ADD CONSTRAINT "resident_scheduled_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_scheduled_events" ADD CONSTRAINT "resident_scheduled_events_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_scheduled_events" ADD CONSTRAINT "resident_scheduled_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_scheduled_events" ADD CONSTRAINT "resident_scheduled_events_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
