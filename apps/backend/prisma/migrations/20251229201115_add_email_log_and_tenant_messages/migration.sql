-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "MessageRecipientFilter" AS ENUM ('ALL_TENANTS', 'ACTIVE_ONLY', 'TRIAL_ONLY', 'OVERDUE_ONLY', 'SPECIFIC_TENANTS');

-- CreateEnum
CREATE TYPE "TenantMessageStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT');

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "templateKey" VARCHAR(100),
    "recipientEmail" VARCHAR(255) NOT NULL,
    "recipientName" VARCHAR(255),
    "subject" VARCHAR(500) NOT NULL,
    "tenantId" UUID,
    "resendId" VARCHAR(255),
    "status" "EmailStatus" NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_messages" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "recipientFilter" "MessageRecipientFilter" NOT NULL,
    "specificTenantIds" UUID[],
    "scheduledFor" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "status" "TenantMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_templateKey_idx" ON "email_logs"("templateKey");

-- CreateIndex
CREATE INDEX "email_logs_tenantId_idx" ON "email_logs"("tenantId");

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_recipientEmail_idx" ON "email_logs"("recipientEmail");

-- CreateIndex
CREATE INDEX "tenant_messages_status_idx" ON "tenant_messages"("status");

-- CreateIndex
CREATE INDEX "tenant_messages_scheduledFor_idx" ON "tenant_messages"("scheduledFor");

-- CreateIndex
CREATE INDEX "tenant_messages_createdBy_idx" ON "tenant_messages"("createdBy");

-- CreateIndex
CREATE INDEX "tenant_messages_createdAt_idx" ON "tenant_messages"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_messages" ADD CONSTRAINT "tenant_messages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
