-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('LEVE', 'MODERADA', 'GRAVE', 'ANAFILAXIA');

-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('ALERGIA_ALIMENTAR', 'INTOLERANCIA', 'RESTRICAO_MEDICA', 'RESTRICAO_RELIGIOSA', 'DISFAGIA', 'DIABETES', 'HIPERTENSAO', 'OUTRA');

-- CreateTable: clinical_profiles
CREATE TABLE "clinical_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "healthStatus" TEXT,
    "specialNeeds" TEXT,
    "functionalAspects" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "updatedBy" UUID,

    CONSTRAINT "clinical_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: allergies
CREATE TABLE "allergies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity",
    "notes" TEXT,
    "recordedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conditions
CREATE TABLE "conditions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "condition" TEXT NOT NULL,
    "icdCode" VARCHAR(10),
    "notes" TEXT,
    "recordedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: dietary_restrictions
CREATE TABLE "dietary_restrictions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "restrictionType" "RestrictionType" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "dietary_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_profiles_residentId_key" ON "clinical_profiles"("residentId");

-- CreateIndex
CREATE INDEX "clinical_profiles_tenantId_residentId_idx" ON "clinical_profiles"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "clinical_profiles_deletedAt_idx" ON "clinical_profiles"("deletedAt");

-- CreateIndex
CREATE INDEX "allergies_tenantId_residentId_idx" ON "allergies"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "allergies_residentId_idx" ON "allergies"("residentId");

-- CreateIndex
CREATE INDEX "allergies_substance_idx" ON "allergies"("substance");

-- CreateIndex
CREATE INDEX "allergies_deletedAt_idx" ON "allergies"("deletedAt");

-- CreateIndex
CREATE INDEX "conditions_tenantId_residentId_idx" ON "conditions"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "conditions_residentId_idx" ON "conditions"("residentId");

-- CreateIndex
CREATE INDEX "conditions_condition_idx" ON "conditions"("condition");

-- CreateIndex
CREATE INDEX "conditions_deletedAt_idx" ON "conditions"("deletedAt");

-- CreateIndex
CREATE INDEX "dietary_restrictions_tenantId_residentId_idx" ON "dietary_restrictions"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "dietary_restrictions_residentId_idx" ON "dietary_restrictions"("residentId");

-- CreateIndex
CREATE INDEX "dietary_restrictions_restrictionType_idx" ON "dietary_restrictions"("restrictionType");

-- CreateIndex
CREATE INDEX "dietary_restrictions_deletedAt_idx" ON "dietary_restrictions"("deletedAt");

-- AddForeignKey
ALTER TABLE "clinical_profiles" ADD CONSTRAINT "clinical_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_profiles" ADD CONSTRAINT "clinical_profiles_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_profiles" ADD CONSTRAINT "clinical_profiles_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- MIGRAÇÃO DE DADOS: Mover dados clínicos existentes para novas tabelas
-- ============================================================================

-- 1. Migrar dados para clinical_profiles
INSERT INTO "clinical_profiles" (
    "id",
    "tenantId",
    "residentId",
    "healthStatus",
    "specialNeeds",
    "functionalAspects",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "tenantId",
    "id",
    "healthStatus",
    "specialNeeds",
    "functionalAspects",
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "residents"
WHERE "deletedAt" IS NULL
  AND ("healthStatus" IS NOT NULL OR "specialNeeds" IS NOT NULL OR "functionalAspects" IS NOT NULL);

-- 2. Migrar alergias (dividir string por vírgula ou linha)
-- Nota: Esta é uma migração simplificada que coloca o texto inteiro como uma entrada
-- Para dividir por vírgula, seria necessário usar uma função PL/pgSQL mais complexa
INSERT INTO "allergies" (
    "id",
    "tenantId",
    "residentId",
    "substance",
    "recordedBy",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    r."tenantId",
    r."id",
    r."allergies",
    u."id", -- Primeiro admin do tenant como recordedBy
    COALESCE(r."createdAt", CURRENT_TIMESTAMP),
    COALESCE(r."updatedAt", CURRENT_TIMESTAMP)
FROM "residents" r
CROSS JOIN LATERAL (
    SELECT "id"
    FROM "users"
    WHERE "tenantId" = r."tenantId"
      AND "role" = 'admin'
      AND "deletedAt" IS NULL
    LIMIT 1
) u
WHERE r."deletedAt" IS NULL
  AND r."allergies" IS NOT NULL
  AND TRIM(r."allergies") != '';

-- 3. Migrar condições crônicas
INSERT INTO "conditions" (
    "id",
    "tenantId",
    "residentId",
    "condition",
    "recordedBy",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    r."tenantId",
    r."id",
    r."chronicConditions",
    u."id",
    COALESCE(r."createdAt", CURRENT_TIMESTAMP),
    COALESCE(r."updatedAt", CURRENT_TIMESTAMP)
FROM "residents" r
CROSS JOIN LATERAL (
    SELECT "id"
    FROM "users"
    WHERE "tenantId" = r."tenantId"
      AND "role" = 'admin'
      AND "deletedAt" IS NULL
    LIMIT 1
) u
WHERE r."deletedAt" IS NULL
  AND r."chronicConditions" IS NOT NULL
  AND TRIM(r."chronicConditions") != '';

-- 4. Migrar restrições alimentares
INSERT INTO "dietary_restrictions" (
    "id",
    "tenantId",
    "residentId",
    "restrictionType",
    "description",
    "recordedBy",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    r."tenantId",
    r."id",
    'OUTRA',
    r."dietaryRestrictions",
    u."id",
    COALESCE(r."createdAt", CURRENT_TIMESTAMP),
    COALESCE(r."updatedAt", CURRENT_TIMESTAMP)
FROM "residents" r
CROSS JOIN LATERAL (
    SELECT "id"
    FROM "users"
    WHERE "tenantId" = r."tenantId"
      AND "role" = 'admin'
      AND "deletedAt" IS NULL
    LIMIT 1
) u
WHERE r."deletedAt" IS NULL
  AND r."dietaryRestrictions" IS NOT NULL
  AND TRIM(r."dietaryRestrictions") != '';

-- ============================================================================
-- REMOVER COLUNAS ANTIGAS DA TABELA RESIDENTS
-- ============================================================================

-- AlterTable: Remover campos clínicos migrados
ALTER TABLE "residents" DROP COLUMN "healthStatus";
ALTER TABLE "residents" DROP COLUMN "specialNeeds";
ALTER TABLE "residents" DROP COLUMN "functionalAspects";
ALTER TABLE "residents" DROP COLUMN "allergies";
ALTER TABLE "residents" DROP COLUMN "chronicConditions";
ALTER TABLE "residents" DROP COLUMN "dietaryRestrictions";
