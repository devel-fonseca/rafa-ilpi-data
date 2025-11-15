-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('HIGIENE', 'ALIMENTACAO', 'HIDRATACAO', 'MONITORAMENTO', 'ELIMINACAO', 'COMPORTAMENTO', 'INTERCORRENCIA', 'ATIVIDADES', 'VISITA', 'OUTROS');

-- CreateTable
CREATE TABLE "daily_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "type" "RecordType" NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "recordedBy" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "daily_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_records_tenantId_residentId_date_idx" ON "daily_records"("tenantId", "residentId", "date" DESC);

-- CreateIndex
CREATE INDEX "daily_records_tenantId_date_idx" ON "daily_records"("tenantId", "date" DESC);

-- CreateIndex
CREATE INDEX "daily_records_residentId_date_time_idx" ON "daily_records"("residentId", "date" DESC, "time");

-- CreateIndex
CREATE INDEX "daily_records_deletedAt_idx" ON "daily_records"("deletedAt");

-- AddForeignKey
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
