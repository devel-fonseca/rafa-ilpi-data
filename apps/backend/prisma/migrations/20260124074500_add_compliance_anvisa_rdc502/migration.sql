-- AddComplianceAnvisaRDC502
--
-- Módulo de Autodiagnóstico de Conformidade ANVISA - RDC 502/2021
--
-- Este módulo gerencia:
-- - Versões da regulamentação RDC 502/2021 (permite versionamento futuro)
-- - 37 questões oficiais do Roteiro Objetivo de Inspeção ILPI (ANVISA)
-- - Autodiagnósticos realizados por cada tenant (ILPI)
-- - Respostas individuais de cada questão
--
-- Arquitetura Multi-Tenant:
-- - TABELAS PÚBLICAS (public): Questões regulatórias compartilhadas (imutáveis)
-- - TABELAS TENANT (tenant_*): Autodiagnósticos e respostas isoladas por ILPI

-- ==========================================
-- PERMISSÕES
-- ==========================================

-- AlterEnum PermissionType - Adicionar permissões de conformidade ANVISA
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PermissionType') THEN
        RAISE EXCEPTION 'Enum PermissionType não existe';
    END IF;

    -- Adicionar VIEW_COMPLIANCE_DASHBOARD se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'PermissionType' AND e.enumlabel = 'VIEW_COMPLIANCE_DASHBOARD'
    ) THEN
        ALTER TYPE "PermissionType" ADD VALUE 'VIEW_COMPLIANCE_DASHBOARD';
    END IF;

    -- Adicionar MANAGE_COMPLIANCE_ASSESSMENT se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'PermissionType' AND e.enumlabel = 'MANAGE_COMPLIANCE_ASSESSMENT'
    ) THEN
        ALTER TYPE "PermissionType" ADD VALUE 'MANAGE_COMPLIANCE_ASSESSMENT';
    END IF;
END $$;

-- ==========================================
-- TABELAS PÚBLICAS (public schema)
-- Questões regulatórias compartilhadas
-- ==========================================

-- CreateTable compliance_question_versions
CREATE TABLE IF NOT EXISTS "compliance_question_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regulationName" VARCHAR(100) NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "description" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable compliance_questions
CREATE TABLE IF NOT EXISTS "compliance_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "criticalityLevel" VARCHAR(5) NOT NULL,
    "legalReference" TEXT NOT NULL,
    "category" VARCHAR(100),
    "responseOptions" JSONB NOT NULL,

    CONSTRAINT "compliance_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_question_versions_regulationName_versionNumber_key"
    ON "compliance_question_versions"("regulationName", "versionNumber");

CREATE INDEX IF NOT EXISTS "compliance_question_versions_effectiveDate_idx"
    ON "compliance_question_versions"("effectiveDate");

CREATE INDEX IF NOT EXISTS "compliance_question_versions_expiresAt_idx"
    ON "compliance_question_versions"("expiresAt");

-- CreateIndex compliance_questions
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_questions_versionId_questionNumber_key"
    ON "compliance_questions"("versionId", "questionNumber");

CREATE INDEX IF NOT EXISTS "compliance_questions_versionId_idx"
    ON "compliance_questions"("versionId");

CREATE INDEX IF NOT EXISTS "compliance_questions_criticalityLevel_idx"
    ON "compliance_questions"("criticalityLevel");

CREATE INDEX IF NOT EXISTS "compliance_questions_category_idx"
    ON "compliance_questions"("category");

-- AddForeignKey
ALTER TABLE "compliance_questions"
    ADD CONSTRAINT "compliance_questions_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "compliance_question_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================================
-- TABELAS TENANT-SCOPED (cada schema tenant_*)
-- Autodiagnósticos e respostas isoladas
-- ==========================================

DO $$
DECLARE
    schema_name text;
BEGIN
    -- Iterar sobre todos os schemas de tenants existentes
    FOR schema_name IN
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant_%'
    LOOP
        RAISE NOTICE 'Processando schema: %', schema_name;

        -- ==========================================
        -- CreateTable compliance_assessments
        -- ==========================================
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.compliance_assessments (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "versionId" UUID NOT NULL,
                "assessmentDate" TIMESTAMPTZ(3) NOT NULL,
                "performedBy" UUID,
                status VARCHAR(20) NOT NULL,
                "totalQuestions" INTEGER NOT NULL,
                "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
                "questionsNA" INTEGER NOT NULL DEFAULT 0,
                "applicableQuestions" INTEGER NOT NULL DEFAULT 37,
                "totalPointsObtained" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "totalPointsPossible" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "compliancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "complianceLevel" VARCHAR(20) NOT NULL DEFAULT ''IRREGULAR'',
                "criticalNonCompliant" JSONB,
                notes TEXT,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,
                "deletedAt" TIMESTAMPTZ(3),

                CONSTRAINT compliance_assessments_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable compliance_assessment_responses
        -- ==========================================
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.compliance_assessment_responses (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "assessmentId" UUID NOT NULL,
                "questionId" UUID NOT NULL,
                "questionNumber" INTEGER NOT NULL,
                "selectedPoints" INTEGER,
                "selectedText" TEXT,
                "isNotApplicable" BOOLEAN NOT NULL DEFAULT false,
                "questionTextSnapshot" TEXT NOT NULL,
                "criticalityLevel" VARCHAR(5) NOT NULL,
                observations TEXT,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,

                CONSTRAINT compliance_assessment_responses_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateIndex compliance_assessments
        -- ==========================================
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessments_tenantId_assessmentDate_idx"
                ON %I.compliance_assessments("tenantId", "assessmentDate" DESC);
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessments_status_idx"
                ON %I.compliance_assessments(status);
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessments_versionId_idx"
                ON %I.compliance_assessments("versionId");
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessments_performedBy_idx"
                ON %I.compliance_assessments("performedBy");
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessments_deletedAt_idx"
                ON %I.compliance_assessments("deletedAt");
        ', schema_name);

        -- ==========================================
        -- CreateIndex compliance_assessment_responses
        -- ==========================================
        EXECUTE format('
            CREATE UNIQUE INDEX IF NOT EXISTS "compliance_assessment_responses_assessmentId_questionNumber_key"
                ON %I.compliance_assessment_responses("assessmentId", "questionNumber");
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessment_responses_assessmentId_idx"
                ON %I.compliance_assessment_responses("assessmentId");
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessment_responses_tenantId_idx"
                ON %I.compliance_assessment_responses("tenantId");
        ', schema_name);

        EXECUTE format('
            CREATE INDEX IF NOT EXISTS "compliance_assessment_responses_questionId_idx"
                ON %I.compliance_assessment_responses("questionId");
        ', schema_name);

        -- ==========================================
        -- AddForeignKey compliance_assessment_responses
        -- ==========================================
        -- IMPORTANTE: PostgreSQL converte nomes para lowercase, então verificamos lowercase
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'compliance_assessment_responses_assessmentid_fkey'
            AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = schema_name)
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.compliance_assessment_responses
                    ADD CONSTRAINT compliance_assessment_responses_assessmentId_fkey
                    FOREIGN KEY ("assessmentId") REFERENCES %I.compliance_assessments(id)
                    ON DELETE CASCADE ON UPDATE CASCADE;
            ', schema_name, schema_name);
        END IF;

        RAISE NOTICE '✅ Schema % processado com sucesso', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: Compliance ANVISA RDC 502/2021 criado em todos os schemas';
END $$;
