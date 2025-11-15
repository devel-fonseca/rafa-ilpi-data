-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASICO', 'PROFISSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A_POSITIVO', 'A_NEGATIVO', 'B_POSITIVO', 'B_NEGATIVO', 'AB_POSITIVO', 'AB_NEGATIVO', 'O_POSITIVO', 'O_NEGATIVO', 'NAO_INFORMADO');

-- CreateExtension (pgcrypto para encriptação futura)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "maxResidents" INTEGER NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "schemaName" TEXT NOT NULL,
    "addressCity" TEXT,
    "addressDistrict" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressState" TEXT,
    "addressZipCode" TEXT,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMPTZ(3),
    "currentPeriodStart" TIMESTAMPTZ(3),
    "currentPeriodEnd" TIMESTAMPTZ(3),
    "trialEndDate" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMPTZ(3),
    "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "fullName" TEXT NOT NULL,
    "socialName" TEXT,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "rgIssuer" TEXT,
    "education" TEXT,
    "profession" TEXT,
    "cns" TEXT,
    "gender" "Gender" NOT NULL,
    "civilStatus" "CivilStatus",
    "religion" TEXT,
    "birthDate" DATE NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Brasileira',
    "birthCity" TEXT,
    "birthState" TEXT,
    "motherName" TEXT,
    "fatherName" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "currentCep" TEXT,
    "currentState" TEXT,
    "currentCity" TEXT,
    "currentStreet" TEXT,
    "currentNumber" TEXT,
    "currentComplement" TEXT,
    "currentDistrict" TEXT,
    "currentPhone" TEXT,
    "originCep" TEXT,
    "originState" TEXT,
    "originCity" TEXT,
    "originStreet" TEXT,
    "originNumber" TEXT,
    "originComplement" TEXT,
    "originDistrict" TEXT,
    "originPhone" TEXT,
    "addressDocuments" JSONB NOT NULL DEFAULT '[]',
    "emergencyContacts" JSONB NOT NULL DEFAULT '[]',
    "legalGuardianName" TEXT,
    "legalGuardianCpf" TEXT,
    "legalGuardianRg" TEXT,
    "legalGuardianPhone" TEXT,
    "legalGuardianType" TEXT,
    "legalGuardianCep" TEXT,
    "legalGuardianState" TEXT,
    "legalGuardianCity" TEXT,
    "legalGuardianStreet" TEXT,
    "legalGuardianNumber" TEXT,
    "legalGuardianComplement" TEXT,
    "legalGuardianDistrict" TEXT,
    "legalGuardianDocuments" JSONB NOT NULL DEFAULT '[]',
    "admissionDate" DATE NOT NULL,
    "admissionType" TEXT,
    "admissionReason" TEXT,
    "admissionConditions" TEXT,
    "dischargeDate" DATE,
    "dischargeReason" TEXT,
    "healthStatus" TEXT,
    "bloodType" "BloodType" NOT NULL DEFAULT 'NAO_INFORMADO',
    "height" DECIMAL(5,2),
    "weight" DECIMAL(5,1),
    "dependencyLevel" TEXT,
    "mobilityAid" BOOLEAN,
    "specialNeeds" TEXT,
    "functionalAspects" TEXT,
    "medicationsOnAdmission" TEXT,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "dietaryRestrictions" TEXT,
    "medicalReport" JSONB NOT NULL DEFAULT '[]',
    "healthPlans" JSONB NOT NULL DEFAULT '[]',
    "belongings" JSONB NOT NULL DEFAULT '[]',
    "roomId" TEXT,
    "bedId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_schemaName_key" ON "tenants"("schemaName");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "residents_tenantId_status_idx" ON "residents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "residents_tenantId_admissionDate_idx" ON "residents"("tenantId", "admissionDate" DESC);

-- CreateIndex
CREATE INDEX "residents_deletedAt_idx" ON "residents"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "residents_tenantId_cpf_key" ON "residents"("tenantId", "cpf");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- TRIGGERS para atualização automática de updatedAt
-- ============================================================================

-- Função genérica para atualizar updatedAt
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updatedAt
CREATE TRIGGER set_timestamp_plans
BEFORE UPDATE ON "plans"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_tenants
BEFORE UPDATE ON "tenants"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_subscriptions
BEFORE UPDATE ON "subscriptions"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_residents
BEFORE UPDATE ON "residents"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
