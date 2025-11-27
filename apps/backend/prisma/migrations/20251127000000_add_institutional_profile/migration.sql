-- CreateEnum
CREATE TYPE "LegalNature" AS ENUM ('ASSOCIACAO', 'FUNDACAO', 'EMPRESA_PRIVADA', 'MEI');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('OK', 'PENDENTE', 'VENCENDO', 'VENCIDO');

-- CreateTable
CREATE TABLE "tenant_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "logoUrl" TEXT,
    "logoKey" TEXT,
    "legalNature" "LegalNature",
    "tradeName" TEXT,
    "cnesCode" VARCHAR(20),
    "capacityDeclared" INTEGER,
    "capacityLicensed" INTEGER,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "foundedAt" DATE,
    "mission" TEXT,
    "vision" TEXT,
    "values" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_documents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" VARCHAR(100),
    "issuedAt" DATE,
    "expiresAt" DATE,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "tenant_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profiles_tenantId_key" ON "tenant_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_profiles_tenantId_idx" ON "tenant_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_profiles_legalNature_idx" ON "tenant_profiles"("legalNature");

-- CreateIndex
CREATE INDEX "tenant_profiles_deletedAt_idx" ON "tenant_profiles"("deletedAt");

-- CreateIndex
CREATE INDEX "tenant_documents_tenantId_type_idx" ON "tenant_documents"("tenantId", "type");

-- CreateIndex
CREATE INDEX "tenant_documents_tenantId_status_idx" ON "tenant_documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_documents_tenantId_expiresAt_idx" ON "tenant_documents"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "tenant_documents_expiresAt_idx" ON "tenant_documents"("expiresAt");

-- CreateIndex
CREATE INDEX "tenant_documents_status_idx" ON "tenant_documents"("status");

-- CreateIndex
CREATE INDEX "tenant_documents_deletedAt_idx" ON "tenant_documents"("deletedAt");

-- AddForeignKey
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
