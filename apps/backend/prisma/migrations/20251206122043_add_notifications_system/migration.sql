-- CreateEnum
CREATE TYPE "SystemNotificationType" AS ENUM ('PRESCRIPTION_EXPIRED', 'PRESCRIPTION_EXPIRING', 'PRESCRIPTION_MISSING_RECEIPT', 'PRESCRIPTION_CONTROLLED_NO_RECEIPT', 'VITAL_SIGN_ABNORMAL_BP', 'VITAL_SIGN_ABNORMAL_GLUCOSE', 'VITAL_SIGN_ABNORMAL_TEMPERATURE', 'VITAL_SIGN_ABNORMAL_HEART_RATE', 'VITAL_SIGN_ABNORMAL_RESPIRATORY_RATE', 'DOCUMENT_EXPIRED', 'DOCUMENT_EXPIRING', 'DAILY_RECORD_MISSING', 'MEDICATION_ADMINISTRATION_MISSED', 'MEDICATION_ADMINISTRATION_LATE', 'SYSTEM_UPDATE', 'SYSTEM_MAINTENANCE', 'USER_MENTION');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('PRESCRIPTION', 'VITAL_SIGN', 'DOCUMENT', 'DAILY_RECORD', 'MEDICATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO', 'SUCCESS');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "type" "SystemNotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "entityType" VARCHAR(50),
    "entityId" UUID,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_read_createdAt_idx" ON "notifications"("tenantId", "userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_tenantId_category_read_createdAt_idx" ON "notifications"("tenantId", "category", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_tenantId_severity_read_createdAt_idx" ON "notifications"("tenantId", "severity", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_severity_idx" ON "notifications"("severity");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
