-- ──────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Simplificar Escalas - Remover Padrões Semanais
--
-- Remove o conceito complexo de "padrões semanais" (weekNumber, numberOfWeeks)
-- e substitui por designações diretas por data (DayScheduleAssignment)
-- ──────────────────────────────────────────────────────────────────────────────

-- ==========================================
-- 1. CRIAR NOVA TABELA: day_schedule_assignments
-- ==========================================

CREATE TABLE "day_schedule_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "shiftTemplateId" UUID NOT NULL,
    "teamId" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" UUID,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "day_schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "day_schedule_assignments_tenantId_date_shiftTemplateId_del_key"
    ON "day_schedule_assignments"("tenantId", "date", "shiftTemplateId", "deletedAt");
CREATE INDEX "day_schedule_assignments_tenantId_date_idx"
    ON "day_schedule_assignments"("tenantId", "date");
CREATE INDEX "day_schedule_assignments_teamId_idx"
    ON "day_schedule_assignments"("teamId");
CREATE INDEX "day_schedule_assignments_deletedAt_idx"
    ON "day_schedule_assignments"("deletedAt");

-- Foreign Key para Team (same-schema)
ALTER TABLE "day_schedule_assignments"
    ADD CONSTRAINT "day_schedule_assignments_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ==========================================
-- 2. REMOVER COLUNAS OBSOLETAS DE shifts
-- ==========================================

-- Remover colunas relacionadas a padrões
ALTER TABLE "shifts" DROP COLUMN IF EXISTS "isFromPattern";
ALTER TABLE "shifts" DROP COLUMN IF EXISTS "patternId";

-- ==========================================
-- 3. REMOVER TABELAS ANTIGAS (ORDEM CORRETA)
-- ==========================================

-- Primeiro: Remover tabela dependente
DROP TABLE IF EXISTS "weekly_schedule_pattern_assignments" CASCADE;

-- Segundo: Remover tabela pai
DROP TABLE IF EXISTS "weekly_schedule_patterns" CASCADE;

-- ==========================================
-- 4. COMENTÁRIOS FINAIS
-- ==========================================

COMMENT ON TABLE "day_schedule_assignments" IS
'Designações de equipes para turnos em datas específicas. Substitui o conceito de padrões semanais recorrentes.';

COMMENT ON COLUMN "day_schedule_assignments"."date" IS
'Data específica da designação (civil date, sem timezone)';

COMMENT ON COLUMN "day_schedule_assignments"."shiftTemplateId" IS
'Referência ao turno (ex: Dia 12h, Noite 12h). Cross-schema para public.shift_templates.';

COMMENT ON COLUMN "day_schedule_assignments"."teamId" IS
'Equipe designada para este turno nesta data. NULL = sem equipe designada.';
