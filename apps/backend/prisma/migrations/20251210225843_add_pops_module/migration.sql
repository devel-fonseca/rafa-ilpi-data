-- CreateEnum: PopStatus
CREATE TYPE "PopStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OBSOLETE');

-- CreateEnum: PopCategory
CREATE TYPE "PopCategory" AS ENUM ('GESTAO_OPERACAO', 'ENFERMAGEM_CUIDADOS');

-- CreateEnum: PopAction
CREATE TYPE "PopAction" AS ENUM ('CREATED', 'UPDATED', 'PUBLISHED', 'VERSIONED', 'OBSOLETED', 'DELETED');

-- AlterEnum: PermissionType - Add POPs permissions
ALTER TYPE "PermissionType" ADD VALUE 'VIEW_POPS';
ALTER TYPE "PermissionType" ADD VALUE 'CREATE_POPS';
ALTER TYPE "PermissionType" ADD VALUE 'UPDATE_POPS';
ALTER TYPE "PermissionType" ADD VALUE 'DELETE_POPS';
ALTER TYPE "PermissionType" ADD VALUE 'PUBLISH_POPS';
ALTER TYPE "PermissionType" ADD VALUE 'MANAGE_POPS';

-- AlterEnum: SystemNotificationType - Add POP review notification
ALTER TYPE "SystemNotificationType" ADD VALUE 'POP_REVIEW_DUE';

-- AlterEnum: NotificationCategory - Add POP category
ALTER TYPE "NotificationCategory" ADD VALUE 'POP';

-- CreateTable: pops
CREATE TABLE "pops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" "PopCategory" NOT NULL,
    "templateId" VARCHAR(100),
    "content" TEXT NOT NULL,
    "status" "PopStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacedById" UUID,
    "replacedAt" TIMESTAMPTZ(3),
    "reviewIntervalMonths" INTEGER,
    "lastReviewedAt" TIMESTAMPTZ(3),
    "nextReviewDate" TIMESTAMPTZ(3),
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "publishedBy" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "pops_pkey" PRIMARY KEY ("id")
);

-- CreateTable: pop_history
CREATE TABLE "pop_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "popId" UUID NOT NULL,
    "action" "PopAction" NOT NULL,
    "reason" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedBy" UUID NOT NULL,
    "changedByName" VARCHAR(255) NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,

    CONSTRAINT "pop_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: pop_attachments
CREATE TABLE "pop_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "popId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER,
    "mimeType" VARCHAR(100),
    "description" TEXT,
    "type" VARCHAR(50),
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "pop_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: pops indices
CREATE INDEX "pops_tenantId_status_idx" ON "pops"("tenantId", "status");
CREATE INDEX "pops_tenantId_category_status_idx" ON "pops"("tenantId", "category", "status");
CREATE INDEX "pops_tenantId_templateId_idx" ON "pops"("tenantId", "templateId");
CREATE INDEX "pops_status_idx" ON "pops"("status");
CREATE INDEX "pops_category_idx" ON "pops"("category");
CREATE INDEX "pops_nextReviewDate_idx" ON "pops"("nextReviewDate");
CREATE INDEX "pops_requiresReview_idx" ON "pops"("requiresReview");
CREATE INDEX "pops_replacedById_idx" ON "pops"("replacedById");
CREATE INDEX "pops_deletedAt_idx" ON "pops"("deletedAt");

-- CreateIndex: pop_history indices
CREATE INDEX "pop_history_tenantId_popId_changedAt_idx" ON "pop_history"("tenantId", "popId", "changedAt" DESC);
CREATE INDEX "pop_history_popId_action_idx" ON "pop_history"("popId", "action");
CREATE INDEX "pop_history_changedAt_idx" ON "pop_history"("changedAt" DESC);
CREATE INDEX "pop_history_action_idx" ON "pop_history"("action");

-- CreateIndex: pop_attachments indices
CREATE INDEX "pop_attachments_tenantId_popId_idx" ON "pop_attachments"("tenantId", "popId");
CREATE INDEX "pop_attachments_popId_idx" ON "pop_attachments"("popId");
CREATE INDEX "pop_attachments_deletedAt_idx" ON "pop_attachments"("deletedAt");

-- AddForeignKey
ALTER TABLE "pops" ADD CONSTRAINT "pops_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pops" ADD CONSTRAINT "pops_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "pops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_history" ADD CONSTRAINT "pop_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pop_history" ADD CONSTRAINT "pop_history_popId_fkey" FOREIGN KEY ("popId") REFERENCES "pops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_attachments" ADD CONSTRAINT "pop_attachments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pop_attachments" ADD CONSTRAINT "pop_attachments_popId_fkey" FOREIGN KEY ("popId") REFERENCES "pops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
