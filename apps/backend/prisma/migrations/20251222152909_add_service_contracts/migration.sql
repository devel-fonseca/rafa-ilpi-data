-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "service_contracts" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "planId" UUID,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMPTZ(3),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedBy" UUID,

    CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_acceptances" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" TEXT NOT NULL,
    "contractVersion" VARCHAR(50) NOT NULL,
    "contractHash" VARCHAR(64) NOT NULL,
    "contractContent" TEXT NOT NULL,

    CONSTRAINT "contract_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_contracts_status_idx" ON "service_contracts"("status");

-- CreateIndex
CREATE INDEX "service_contracts_effectiveFrom_idx" ON "service_contracts"("effectiveFrom");

-- CreateIndex
CREATE INDEX "service_contracts_planId_idx" ON "service_contracts"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "service_contracts_version_planId_key" ON "service_contracts"("version", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_acceptances_tenantId_key" ON "contract_acceptances"("tenantId");

-- CreateIndex
CREATE INDEX "contract_acceptances_contractId_idx" ON "contract_acceptances"("contractId");

-- CreateIndex
CREATE INDEX "contract_acceptances_acceptedAt_idx" ON "contract_acceptances"("acceptedAt");

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_acceptances" ADD CONSTRAINT "contract_acceptances_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "service_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_acceptances" ADD CONSTRAINT "contract_acceptances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_acceptances" ADD CONSTRAINT "contract_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
