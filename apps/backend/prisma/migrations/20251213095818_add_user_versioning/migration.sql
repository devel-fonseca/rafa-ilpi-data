-- AlterTable
ALTER TABLE "sos_medication_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sos_medications" ALTER COLUMN "createdBy" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "user_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "user_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_history_tenantId_userId_versionNumber_idx" ON "user_history"("tenantId", "userId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "user_history_tenantId_changedAt_idx" ON "user_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "user_history_changedBy_idx" ON "user_history"("changedBy");

-- CreateIndex
CREATE INDEX "user_history_changeType_idx" ON "user_history"("changeType");

-- CreateIndex
CREATE INDEX "users_createdBy_idx" ON "users"("createdBy");

-- CreateIndex
CREATE INDEX "users_updatedBy_idx" ON "users"("updatedBy");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_history" ADD CONSTRAINT "user_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
