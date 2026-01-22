-- CreateCareSh iftsModule
--
-- Módulo de Gestão de Escalas de Cuidados (RDC 502/2021)
--
-- Este módulo gerencia:
-- - Turnos fixos do sistema (5 shift templates)
-- - Equipes de cuidadores
-- - Padrão semanal recorrente de escalas
-- - Plantões concretos (data + turno + equipe)
-- - Substituições pontuais e histórico completo

-- ==========================================
-- ENUMS
-- ==========================================

-- CreateEnum ShiftTemplateType
CREATE TYPE "ShiftTemplateType" AS ENUM ('DAY_8H', 'AFTERNOON_8H', 'NIGHT_8H', 'DAY_12H', 'NIGHT_12H');

-- CreateEnum ShiftStatus
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum SubstitutionType
CREATE TYPE "SubstitutionType" AS ENUM ('TEAM_REPLACEMENT', 'MEMBER_REPLACEMENT', 'MEMBER_ADDITION');

-- AlterEnum PermissionType - Adicionar permissões de escala de cuidados
ALTER TYPE "PermissionType" ADD VALUE 'VIEW_CARE_SHIFTS';
ALTER TYPE "PermissionType" ADD VALUE 'CREATE_CARE_SHIFTS';
ALTER TYPE "PermissionType" ADD VALUE 'UPDATE_CARE_SHIFTS';
ALTER TYPE "PermissionType" ADD VALUE 'DELETE_CARE_SHIFTS';
ALTER TYPE "PermissionType" ADD VALUE 'MANAGE_TEAMS';
ALTER TYPE "PermissionType" ADD VALUE 'VIEW_RDC_COMPLIANCE';
ALTER TYPE "PermissionType" ADD VALUE 'CONFIGURE_SHIFT_SETTINGS';

-- ==========================================
-- TABELAS SHARED (public schema)
-- ==========================================

-- CreateTable shift_templates
CREATE TABLE "shift_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ShiftTemplateType" NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable tenant_shift_configs
CREATE TABLE "tenant_shift_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "shiftTemplateId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customName" VARCHAR(50),
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "tenant_shift_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_templates_type_key" ON "shift_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_shift_configs_tenantId_shiftTemplateId_key" ON "tenant_shift_configs"("tenantId", "shiftTemplateId");

-- CreateIndex
CREATE INDEX "tenant_shift_configs_tenantId_isEnabled_idx" ON "tenant_shift_configs"("tenantId", "isEnabled");

-- CreateIndex
CREATE INDEX "tenant_shift_configs_deletedAt_idx" ON "tenant_shift_configs"("deletedAt");

-- AddForeignKey
ALTER TABLE "tenant_shift_configs" ADD CONSTRAINT "tenant_shift_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_shift_configs" ADD CONSTRAINT "tenant_shift_configs_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- TABELAS TENANT-SCOPED (cada schema tenant_*)
-- ==========================================
-- IMPORTANTE: Estas tabelas serão criadas em CADA schema de tenant
-- via procedimento dinâmico (similar ao padrão usado em migrations anteriores)

DO $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Iterar sobre todos os schemas tenant_*
    FOR schema_name IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'tenant_%'
    LOOP
        RAISE NOTICE 'Processando schema: %', schema_name;

        -- ==========================================
        -- CreateTable teams
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.teams (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                color VARCHAR(7),
                "createdBy" UUID NOT NULL,
                "updatedBy" UUID,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,
                "deletedAt" TIMESTAMPTZ(3),

                CONSTRAINT teams_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable team_members
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.team_members (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "teamId" UUID NOT NULL,
                "userId" UUID NOT NULL,
                role VARCHAR(50),
                "addedBy" UUID NOT NULL,
                "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "removedBy" UUID,
                "removedAt" TIMESTAMPTZ(3),

                CONSTRAINT team_members_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable weekly_schedule_patterns
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.weekly_schedule_patterns (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "startDate" DATE NOT NULL,
                "endDate" DATE,
                "createdBy" UUID NOT NULL,
                "updatedBy" UUID,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,
                "deletedAt" TIMESTAMPTZ(3),

                CONSTRAINT weekly_schedule_patterns_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable weekly_schedule_pattern_assignments
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.weekly_schedule_pattern_assignments (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "patternId" UUID NOT NULL,
                "dayOfWeek" INTEGER NOT NULL,
                "shiftTemplateId" UUID NOT NULL,
                "teamId" UUID,
                "createdBy" UUID NOT NULL,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedBy" UUID,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,

                CONSTRAINT weekly_schedule_pattern_assignments_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable shifts
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.shifts (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                date DATE NOT NULL,
                "shiftTemplateId" UUID NOT NULL,
                "teamId" UUID,
                status "ShiftStatus" NOT NULL DEFAULT ''SCHEDULED'',
                "isFromPattern" BOOLEAN NOT NULL DEFAULT false,
                "patternId" UUID,
                notes TEXT,
                "versionNumber" INTEGER NOT NULL DEFAULT 1,
                "createdBy" UUID NOT NULL,
                "updatedBy" UUID,
                "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ(3) NOT NULL,
                "deletedAt" TIMESTAMPTZ(3),

                CONSTRAINT shifts_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable shift_assignments
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.shift_assignments (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "shiftId" UUID NOT NULL,
                "userId" UUID NOT NULL,
                "isFromTeam" BOOLEAN NOT NULL DEFAULT true,
                "assignedBy" UUID NOT NULL,
                "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "removedBy" UUID,
                "removedAt" TIMESTAMPTZ(3),

                CONSTRAINT shift_assignments_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable shift_substitutions
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.shift_substitutions (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "shiftId" UUID NOT NULL,
                type "SubstitutionType" NOT NULL,
                reason TEXT NOT NULL,
                "originalTeamId" UUID,
                "newTeamId" UUID,
                "originalUserId" UUID,
                "newUserId" UUID,
                "substitutedBy" UUID NOT NULL,
                "substitutedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT shift_substitutions_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- CreateTable shift_history
        -- ==========================================
        EXECUTE format('
            CREATE TABLE %I.shift_history (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                "tenantId" UUID NOT NULL,
                "shiftId" UUID NOT NULL,
                "versionNumber" INTEGER NOT NULL,
                "changeType" "ChangeType" NOT NULL,
                "changeReason" TEXT NOT NULL,
                "previousData" JSONB,
                "newData" JSONB NOT NULL,
                "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
                "changedBy" UUID NOT NULL,
                "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT shift_history_pkey PRIMARY KEY (id)
            );
        ', schema_name);

        -- ==========================================
        -- ÍNDICES (teams)
        -- ==========================================
        EXECUTE format('CREATE INDEX teams_tenantId_isActive_idx ON %I.teams("tenantId", "isActive");', schema_name);
        EXECUTE format('CREATE INDEX teams_deletedAt_idx ON %I.teams("deletedAt");', schema_name);

        -- ==========================================
        -- ÍNDICES (team_members)
        -- ==========================================
        EXECUTE format('CREATE UNIQUE INDEX team_members_teamId_userId_removedAt_key ON %I.team_members("teamId", "userId", "removedAt");', schema_name);
        EXECUTE format('CREATE INDEX team_members_tenantId_teamId_idx ON %I.team_members("tenantId", "teamId");', schema_name);
        EXECUTE format('CREATE INDEX team_members_userId_idx ON %I.team_members("userId");', schema_name);
        EXECUTE format('CREATE INDEX team_members_removedAt_idx ON %I.team_members("removedAt");', schema_name);

        -- ==========================================
        -- ÍNDICES (weekly_schedule_patterns)
        -- ==========================================
        EXECUTE format('CREATE INDEX weekly_schedule_patterns_tenantId_isActive_idx ON %I.weekly_schedule_patterns("tenantId", "isActive");', schema_name);
        EXECUTE format('CREATE INDEX weekly_schedule_patterns_tenantId_startDate_idx ON %I.weekly_schedule_patterns("tenantId", "startDate");', schema_name);
        EXECUTE format('CREATE INDEX weekly_schedule_patterns_deletedAt_idx ON %I.weekly_schedule_patterns("deletedAt");', schema_name);

        -- ==========================================
        -- ÍNDICES (weekly_schedule_pattern_assignments)
        -- ==========================================
        EXECUTE format('CREATE UNIQUE INDEX weekly_schedule_pattern_assignments_patternId_dayOfWeek_shiftTemplateId_key ON %I.weekly_schedule_pattern_assignments("patternId", "dayOfWeek", "shiftTemplateId");', schema_name);
        EXECUTE format('CREATE INDEX weekly_schedule_pattern_assignments_tenantId_patternId_idx ON %I.weekly_schedule_pattern_assignments("tenantId", "patternId");', schema_name);
        EXECUTE format('CREATE INDEX weekly_schedule_pattern_assignments_teamId_idx ON %I.weekly_schedule_pattern_assignments("teamId");', schema_name);

        -- ==========================================
        -- ÍNDICES (shifts)
        -- ==========================================
        EXECUTE format('CREATE UNIQUE INDEX shifts_tenantId_date_shiftTemplateId_deletedAt_key ON %I.shifts("tenantId", date, "shiftTemplateId", "deletedAt");', schema_name);
        EXECUTE format('CREATE INDEX shifts_tenantId_date_idx ON %I.shifts("tenantId", date);', schema_name);
        EXECUTE format('CREATE INDEX shifts_tenantId_date_status_idx ON %I.shifts("tenantId", date, status);', schema_name);
        EXECUTE format('CREATE INDEX shifts_teamId_idx ON %I.shifts("teamId");', schema_name);
        EXECUTE format('CREATE INDEX shifts_status_idx ON %I.shifts(status);', schema_name);
        EXECUTE format('CREATE INDEX shifts_deletedAt_idx ON %I.shifts("deletedAt");', schema_name);

        -- ==========================================
        -- ÍNDICES (shift_assignments)
        -- ==========================================
        EXECUTE format('CREATE UNIQUE INDEX shift_assignments_shiftId_userId_removedAt_key ON %I.shift_assignments("shiftId", "userId", "removedAt");', schema_name);
        EXECUTE format('CREATE INDEX shift_assignments_tenantId_shiftId_idx ON %I.shift_assignments("tenantId", "shiftId");', schema_name);
        EXECUTE format('CREATE INDEX shift_assignments_userId_idx ON %I.shift_assignments("userId");', schema_name);
        EXECUTE format('CREATE INDEX shift_assignments_removedAt_idx ON %I.shift_assignments("removedAt");', schema_name);

        -- ==========================================
        -- ÍNDICES (shift_substitutions)
        -- ==========================================
        EXECUTE format('CREATE INDEX shift_substitutions_tenantId_shiftId_idx ON %I.shift_substitutions("tenantId", "shiftId");', schema_name);
        EXECUTE format('CREATE INDEX shift_substitutions_shiftId_type_idx ON %I.shift_substitutions("shiftId", type);', schema_name);

        -- ==========================================
        -- ÍNDICES (shift_history)
        -- ==========================================
        EXECUTE format('CREATE INDEX shift_history_tenantId_shiftId_versionNumber_idx ON %I.shift_history("tenantId", "shiftId", "versionNumber" DESC);', schema_name);
        EXECUTE format('CREATE INDEX shift_history_tenantId_changedAt_idx ON %I.shift_history("tenantId", "changedAt" DESC);', schema_name);
        EXECUTE format('CREATE INDEX shift_history_changedBy_idx ON %I.shift_history("changedBy");', schema_name);

        -- ==========================================
        -- FOREIGN KEYS (tenant-scoped)
        -- ==========================================
        -- IMPORTANTE: Sem FKs para public.tenants (cross-schema violation)
        -- IMPORTANTE: FKs para public.shift_templates via shiftTemplateId são CROSS-SCHEMA,
        --             mas permitidos porque shift_templates é SHARED (read-only)

        -- team_members
        EXECUTE format('ALTER TABLE %I.team_members ADD CONSTRAINT team_members_teamId_fkey FOREIGN KEY ("teamId") REFERENCES %I.teams(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.team_members ADD CONSTRAINT team_members_userId_fkey FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name);

        -- weekly_schedule_pattern_assignments
        EXECUTE format('ALTER TABLE %I.weekly_schedule_pattern_assignments ADD CONSTRAINT weekly_schedule_pattern_assignments_patternId_fkey FOREIGN KEY ("patternId") REFERENCES %I.weekly_schedule_patterns(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.weekly_schedule_pattern_assignments ADD CONSTRAINT weekly_schedule_pattern_assignments_shiftTemplateId_fkey FOREIGN KEY ("shiftTemplateId") REFERENCES public.shift_templates(id) ON DELETE RESTRICT ON UPDATE CASCADE;', schema_name);
        EXECUTE format('ALTER TABLE %I.weekly_schedule_pattern_assignments ADD CONSTRAINT weekly_schedule_pattern_assignments_teamId_fkey FOREIGN KEY ("teamId") REFERENCES %I.teams(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name, schema_name);

        -- shifts
        EXECUTE format('ALTER TABLE %I.shifts ADD CONSTRAINT shifts_shiftTemplateId_fkey FOREIGN KEY ("shiftTemplateId") REFERENCES public.shift_templates(id) ON DELETE RESTRICT ON UPDATE CASCADE;', schema_name);
        EXECUTE format('ALTER TABLE %I.shifts ADD CONSTRAINT shifts_teamId_fkey FOREIGN KEY ("teamId") REFERENCES %I.teams(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.shifts ADD CONSTRAINT shifts_patternId_fkey FOREIGN KEY ("patternId") REFERENCES %I.weekly_schedule_patterns(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name, schema_name);

        -- shift_assignments
        EXECUTE format('ALTER TABLE %I.shift_assignments ADD CONSTRAINT shift_assignments_shiftId_fkey FOREIGN KEY ("shiftId") REFERENCES %I.shifts(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.shift_assignments ADD CONSTRAINT shift_assignments_userId_fkey FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE;', schema_name);

        -- shift_substitutions
        EXECUTE format('ALTER TABLE %I.shift_substitutions ADD CONSTRAINT shift_substitutions_shiftId_fkey FOREIGN KEY ("shiftId") REFERENCES %I.shifts(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.shift_substitutions ADD CONSTRAINT shift_substitutions_originalTeamId_fkey FOREIGN KEY ("originalTeamId") REFERENCES %I.teams(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.shift_substitutions ADD CONSTRAINT shift_substitutions_newTeamId_fkey FOREIGN KEY ("newTeamId") REFERENCES %I.teams(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.shift_substitutions ADD CONSTRAINT shift_substitutions_originalUserId_fkey FOREIGN KEY ("originalUserId") REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name);
        EXECUTE format('ALTER TABLE %I.shift_substitutions ADD CONSTRAINT shift_substitutions_newUserId_fkey FOREIGN KEY ("newUserId") REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;', schema_name);

        -- shift_history
        EXECUTE format('ALTER TABLE %I.shift_history ADD CONSTRAINT shift_history_shiftId_fkey FOREIGN KEY ("shiftId") REFERENCES %I.shifts(id) ON DELETE CASCADE ON UPDATE CASCADE;', schema_name, schema_name);
        EXECUTE format('ALTER TABLE %I.shift_history ADD CONSTRAINT shift_history_changedBy_fkey FOREIGN KEY ("changedBy") REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE;', schema_name);

        RAISE NOTICE '✅ Schema % processado com sucesso', schema_name;
    END LOOP;

    RAISE NOTICE '✅ Migration concluída: módulo de Escalas de Cuidados criado em todos os schemas';
END $$;
