-- CreateTable
CREATE TABLE "tenant_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "users_count" INTEGER NOT NULL DEFAULT 0,
    "residents_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_stats_tenantId_key" ON "tenant_stats"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_stats_tenantId_idx" ON "tenant_stats"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_stats_last_updated_at_idx" ON "tenant_stats"("last_updated_at");

-- AddForeignKey
ALTER TABLE "tenant_stats" ADD CONSTRAINT "tenant_stats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
