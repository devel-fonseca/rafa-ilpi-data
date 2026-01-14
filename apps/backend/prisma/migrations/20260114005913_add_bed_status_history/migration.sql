-- CreateTable
CREATE TABLE "bed_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "bedId" UUID NOT NULL,
    "previousStatus" VARCHAR(50) NOT NULL,
    "newStatus" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bed_status_history_bedId_changedAt_idx" ON "bed_status_history"("bedId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "bed_status_history_tenantId_changedAt_idx" ON "bed_status_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "bed_status_history_tenantId_bedId_idx" ON "bed_status_history"("tenantId", "bedId");

-- AddForeignKey
ALTER TABLE "bed_status_history" ADD CONSTRAINT "bed_status_history_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_status_history" ADD CONSTRAINT "bed_status_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_status_history" ADD CONSTRAINT "bed_status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
