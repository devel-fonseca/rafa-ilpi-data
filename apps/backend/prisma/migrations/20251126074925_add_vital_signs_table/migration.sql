-- CreateTable
CREATE TABLE "vital_signs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "systolicBloodPressure" DOUBLE PRECISION,
    "diastolicBloodPressure" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "oxygenSaturation" DOUBLE PRECISION,
    "bloodGlucose" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vital_signs_tenantId_residentId_timestamp_idx" ON "vital_signs"("tenantId", "residentId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "vital_signs_residentId_timestamp_idx" ON "vital_signs"("residentId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "vital_signs_tenantId_timestamp_idx" ON "vital_signs"("tenantId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "vital_signs_deletedAt_idx" ON "vital_signs"("deletedAt");

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
