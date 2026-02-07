-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: add_resident_health_tables
-- Descrição: Cria tabelas separadas para dados de saúde do residente
--            - ResidentBloodType (tipo sanguíneo 1:1)
--            - ResidentAnthropometry (peso/altura evolutivo 1:N)
--            - ResidentDependencyAssessment (avaliações de dependência 1:N)
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: CRIAR NOVO ENUM
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "DependencyLevel" AS ENUM ('GRAU_I', 'GRAU_II', 'GRAU_III');

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: CRIAR NOVAS TABELAS
-- ══════════════════════════════════════════════════════════════════════════════

-- 2.1 ResidentBloodType (1:1 com Resident)
CREATE TABLE "resident_blood_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "bloodType" "BloodType" NOT NULL DEFAULT 'NAO_INFORMADO',
    "source" VARCHAR(255),
    "confirmedAt" DATE,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_blood_types_pkey" PRIMARY KEY ("id")
);

-- 2.2 ResidentBloodTypeHistory
CREATE TABLE "resident_blood_type_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentBloodTypeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "resident_blood_type_history_pkey" PRIMARY KEY ("id")
);

-- 2.3 ResidentAnthropometry (1:N com Resident)
CREATE TABLE "resident_anthropometry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "height" DECIMAL(5,2),
    "weight" DECIMAL(5,1),
    "measurementDate" DATE NOT NULL,
    "bmi" DECIMAL(4,1),
    "notes" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_anthropometry_pkey" PRIMARY KEY ("id")
);

-- 2.4 ResidentAnthropometryHistory
CREATE TABLE "resident_anthropometry_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentAnthropometryId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "resident_anthropometry_history_pkey" PRIMARY KEY ("id")
);

-- 2.5 ResidentDependencyAssessment (1:N com Resident)
CREATE TABLE "resident_dependency_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "dependencyLevel" "DependencyLevel" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "endDate" DATE,
    "assessmentInstrument" VARCHAR(255) NOT NULL,
    "assessmentScore" DECIMAL(5,2),
    "assessedBy" UUID NOT NULL,
    "mobilityAid" BOOLEAN NOT NULL DEFAULT false,
    "mobilityAidDescription" VARCHAR(255),
    "notes" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_dependency_assessments_pkey" PRIMARY KEY ("id")
);

-- 2.6 ResidentDependencyAssessmentHistory
CREATE TABLE "resident_dependency_assessment_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentDependencyAssessmentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "resident_dependency_assessment_history_pkey" PRIMARY KEY ("id")
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 3: CRIAR ÍNDICES
-- ══════════════════════════════════════════════════════════════════════════════

-- ResidentBloodType
CREATE UNIQUE INDEX "resident_blood_types_residentId_key" ON "resident_blood_types"("residentId");
CREATE INDEX "resident_blood_types_tenantId_residentId_idx" ON "resident_blood_types"("tenantId", "residentId");
CREATE INDEX "resident_blood_types_deletedAt_idx" ON "resident_blood_types"("deletedAt");
CREATE INDEX "resident_blood_types_createdBy_idx" ON "resident_blood_types"("createdBy");
CREATE INDEX "resident_blood_types_updatedBy_idx" ON "resident_blood_types"("updatedBy");

-- ResidentBloodTypeHistory
CREATE INDEX "resident_blood_type_history_tenantId_residentBloodTypeId_ver_idx" ON "resident_blood_type_history"("tenantId", "residentBloodTypeId", "versionNumber" DESC);
CREATE INDEX "resident_blood_type_history_tenantId_changedAt_idx" ON "resident_blood_type_history"("tenantId", "changedAt" DESC);
CREATE INDEX "resident_blood_type_history_changedBy_idx" ON "resident_blood_type_history"("changedBy");
CREATE INDEX "resident_blood_type_history_changeType_idx" ON "resident_blood_type_history"("changeType");

-- ResidentAnthropometry
CREATE INDEX "resident_anthropometry_tenantId_residentId_idx" ON "resident_anthropometry"("tenantId", "residentId");
CREATE INDEX "resident_anthropometry_residentId_measurementDate_idx" ON "resident_anthropometry"("residentId", "measurementDate" DESC);
CREATE INDEX "resident_anthropometry_tenantId_measurementDate_idx" ON "resident_anthropometry"("tenantId", "measurementDate" DESC);
CREATE INDEX "resident_anthropometry_deletedAt_idx" ON "resident_anthropometry"("deletedAt");
CREATE INDEX "resident_anthropometry_createdBy_idx" ON "resident_anthropometry"("createdBy");
CREATE INDEX "resident_anthropometry_updatedBy_idx" ON "resident_anthropometry"("updatedBy");

-- ResidentAnthropometryHistory
CREATE INDEX "resident_anthropometry_history_tenantId_anthropometryId_ver_idx" ON "resident_anthropometry_history"("tenantId", "residentAnthropometryId", "versionNumber" DESC);
CREATE INDEX "resident_anthropometry_history_tenantId_changedAt_idx" ON "resident_anthropometry_history"("tenantId", "changedAt" DESC);
CREATE INDEX "resident_anthropometry_history_changedBy_idx" ON "resident_anthropometry_history"("changedBy");
CREATE INDEX "resident_anthropometry_history_changeType_idx" ON "resident_anthropometry_history"("changeType");

-- ResidentDependencyAssessment
CREATE INDEX "resident_dependency_assessments_tenantId_residentId_idx" ON "resident_dependency_assessments"("tenantId", "residentId");
CREATE INDEX "resident_dependency_assessments_residentId_effectiveDate_idx" ON "resident_dependency_assessments"("residentId", "effectiveDate" DESC);
CREATE INDEX "resident_dependency_assessments_tenantId_effectiveDate_idx" ON "resident_dependency_assessments"("tenantId", "effectiveDate" DESC);
CREATE INDEX "resident_dependency_assessments_deletedAt_idx" ON "resident_dependency_assessments"("deletedAt");
CREATE INDEX "resident_dependency_assessments_assessedBy_idx" ON "resident_dependency_assessments"("assessedBy");
CREATE INDEX "resident_dependency_assessments_createdBy_idx" ON "resident_dependency_assessments"("createdBy");
CREATE INDEX "resident_dependency_assessments_updatedBy_idx" ON "resident_dependency_assessments"("updatedBy");
CREATE INDEX "resident_dependency_assessments_dependencyLevel_idx" ON "resident_dependency_assessments"("dependencyLevel");

-- ResidentDependencyAssessmentHistory
CREATE INDEX "resident_dependency_assessment_history_tenantId_assessmentId_ver_idx" ON "resident_dependency_assessment_history"("tenantId", "residentDependencyAssessmentId", "versionNumber" DESC);
CREATE INDEX "resident_dependency_assessment_history_tenantId_changedAt_idx" ON "resident_dependency_assessment_history"("tenantId", "changedAt" DESC);
CREATE INDEX "resident_dependency_assessment_history_changedBy_idx" ON "resident_dependency_assessment_history"("changedBy");
CREATE INDEX "resident_dependency_assessment_history_changeType_idx" ON "resident_dependency_assessment_history"("changeType");

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 4: CRIAR FOREIGN KEYS
-- ══════════════════════════════════════════════════════════════════════════════

-- ResidentBloodType
ALTER TABLE "resident_blood_types" ADD CONSTRAINT "resident_blood_types_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_blood_types" ADD CONSTRAINT "resident_blood_types_residentId_fkey"
    FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_blood_types" ADD CONSTRAINT "resident_blood_types_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resident_blood_types" ADD CONSTRAINT "resident_blood_types_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResidentBloodTypeHistory
ALTER TABLE "resident_blood_type_history" ADD CONSTRAINT "resident_blood_type_history_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_blood_type_history" ADD CONSTRAINT "resident_blood_type_history_residentBloodTypeId_fkey"
    FOREIGN KEY ("residentBloodTypeId") REFERENCES "resident_blood_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_blood_type_history" ADD CONSTRAINT "resident_blood_type_history_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ResidentAnthropometry
ALTER TABLE "resident_anthropometry" ADD CONSTRAINT "resident_anthropometry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_anthropometry" ADD CONSTRAINT "resident_anthropometry_residentId_fkey"
    FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_anthropometry" ADD CONSTRAINT "resident_anthropometry_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resident_anthropometry" ADD CONSTRAINT "resident_anthropometry_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResidentAnthropometryHistory
ALTER TABLE "resident_anthropometry_history" ADD CONSTRAINT "resident_anthropometry_history_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_anthropometry_history" ADD CONSTRAINT "resident_anthropometry_history_anthropometryId_fkey"
    FOREIGN KEY ("residentAnthropometryId") REFERENCES "resident_anthropometry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_anthropometry_history" ADD CONSTRAINT "resident_anthropometry_history_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ResidentDependencyAssessment
ALTER TABLE "resident_dependency_assessments" ADD CONSTRAINT "resident_dependency_assessments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_dependency_assessments" ADD CONSTRAINT "resident_dependency_assessments_residentId_fkey"
    FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_dependency_assessments" ADD CONSTRAINT "resident_dependency_assessments_assessedBy_fkey"
    FOREIGN KEY ("assessedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resident_dependency_assessments" ADD CONSTRAINT "resident_dependency_assessments_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resident_dependency_assessments" ADD CONSTRAINT "resident_dependency_assessments_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResidentDependencyAssessmentHistory
ALTER TABLE "resident_dependency_assessment_history" ADD CONSTRAINT "resident_dependency_assessment_history_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_dependency_assessment_history" ADD CONSTRAINT "resident_dependency_assessment_history_assessmentId_fkey"
    FOREIGN KEY ("residentDependencyAssessmentId") REFERENCES "resident_dependency_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_dependency_assessment_history" ADD CONSTRAINT "resident_dependency_assessment_history_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 5: MIGRAR DADOS EXISTENTES
-- ══════════════════════════════════════════════════════════════════════════════

-- 5.1 Migrar bloodType para resident_blood_types
INSERT INTO "resident_blood_types" (
    "id", "tenantId", "residentId", "bloodType", "source",
    "versionNumber", "createdBy", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    r."tenantId",
    r."id",
    r."bloodType",
    'Migrado do cadastro original',
    1,
    r."createdBy",
    r."createdAt",
    r."updatedAt"
FROM "residents" r
WHERE r."bloodType" IS NOT NULL
  AND r."bloodType" != 'NAO_INFORMADO'
  AND r."deletedAt" IS NULL;

-- 5.2 Migrar height/weight para resident_anthropometry (como primeira medição)
INSERT INTO "resident_anthropometry" (
    "id", "tenantId", "residentId", "height", "weight", "measurementDate", "bmi", "notes",
    "versionNumber", "createdBy", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    r."tenantId",
    r."id",
    r."height",
    r."weight",
    COALESCE(r."admissionDate", r."createdAt"::date),
    CASE
        WHEN r."height" IS NOT NULL AND r."height" > 0 AND r."weight" IS NOT NULL
        THEN ROUND((r."weight" / (r."height" * r."height"))::numeric, 1)
        ELSE NULL
    END,
    'Dados migrados do cadastro original',
    1,
    r."createdBy",
    r."createdAt",
    r."updatedAt"
FROM "residents" r
WHERE (r."height" IS NOT NULL OR r."weight" IS NOT NULL)
  AND r."deletedAt" IS NULL;

-- 5.3 Migrar dependencyLevel e mobilityAid para resident_dependency_assessments
INSERT INTO "resident_dependency_assessments" (
    "id", "tenantId", "residentId", "dependencyLevel", "effectiveDate",
    "assessmentInstrument", "assessedBy", "mobilityAid", "notes",
    "versionNumber", "createdBy", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    r."tenantId",
    r."id",
    CASE
        WHEN r."dependencyLevel" ILIKE '%grau i%' AND r."dependencyLevel" NOT ILIKE '%grau ii%' AND r."dependencyLevel" NOT ILIKE '%grau iii%' THEN 'GRAU_I'::"DependencyLevel"
        WHEN r."dependencyLevel" ILIKE '%grau ii%' AND r."dependencyLevel" NOT ILIKE '%grau iii%' THEN 'GRAU_II'::"DependencyLevel"
        WHEN r."dependencyLevel" ILIKE '%grau iii%' THEN 'GRAU_III'::"DependencyLevel"
        ELSE 'GRAU_I'::"DependencyLevel"
    END,
    COALESCE(r."admissionDate", r."createdAt"::date),
    'Avaliação inicial (dados migrados)',
    r."createdBy",
    COALESCE(r."mobilityAid", false),
    'Dados migrados do cadastro original. Grau original: ' || COALESCE(r."dependencyLevel", 'Não informado'),
    1,
    r."createdBy",
    r."createdAt",
    r."updatedAt"
FROM "residents" r
WHERE r."dependencyLevel" IS NOT NULL
  AND r."deletedAt" IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 6: REMOVER CAMPOS ANTIGOS DA TABELA RESIDENTS
-- ══════════════════════════════════════════════════════════════════════════════

-- Remover campos que foram migrados para as novas tabelas
ALTER TABLE "residents" DROP COLUMN IF EXISTS "bloodType";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "height";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "weight";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "dependencyLevel";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "mobilityAid";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "medicationsOnAdmission";
