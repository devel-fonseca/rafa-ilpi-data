-- CreateTable
CREATE TABLE "vaccinations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "vaccine" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "batch" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "cnes" TEXT NOT NULL,
    "healthUnit" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "certificateUrl" TEXT,
    "notes" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaccinations_tenantId_residentId_idx" ON "vaccinations"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "vaccinations_residentId_date_idx" ON "vaccinations"("residentId", "date" DESC);

-- CreateIndex
CREATE INDEX "vaccinations_tenantId_date_idx" ON "vaccinations"("tenantId", "date" DESC);

-- CreateIndex
CREATE INDEX "vaccinations_deletedAt_idx" ON "vaccinations"("deletedAt");

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
