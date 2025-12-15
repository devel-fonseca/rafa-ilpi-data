-- AlterTable
ALTER TABLE "vital_sign_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vital_signs" ALTER COLUMN "createdBy" DROP DEFAULT;

-- CreateTable
CREATE TABLE "bed_transfer_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "fromBedId" UUID NOT NULL,
    "toBedId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "transferredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "bed_transfer_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bed_transfer_history_tenantId_residentId_idx" ON "bed_transfer_history"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "bed_transfer_history_residentId_transferredAt_idx" ON "bed_transfer_history"("residentId", "transferredAt" DESC);

-- CreateIndex
CREATE INDEX "bed_transfer_history_fromBedId_idx" ON "bed_transfer_history"("fromBedId");

-- CreateIndex
CREATE INDEX "bed_transfer_history_toBedId_idx" ON "bed_transfer_history"("toBedId");

-- CreateIndex
CREATE INDEX "bed_transfer_history_deletedAt_idx" ON "bed_transfer_history"("deletedAt");

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_fromBedId_fkey" FOREIGN KEY ("fromBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_toBedId_fkey" FOREIGN KEY ("toBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_transfer_history" ADD CONSTRAINT "bed_transfer_history_transferredBy_fkey" FOREIGN KEY ("transferredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
