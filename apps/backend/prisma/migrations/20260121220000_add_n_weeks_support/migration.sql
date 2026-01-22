-- ==========================================
-- Migration: Adicionar Suporte a Padrões N-Semanas
-- Data: 21/01/2026
-- Descrição: Permite padrões de 1-4 semanas para suportar turnos rotativos (ex: 12x36)
-- ==========================================

-- 1. Adicionar numberOfWeeks ao pattern (default 1 para retrocompatibilidade)
ALTER TABLE weekly_schedule_patterns
  ADD COLUMN IF NOT EXISTS "numberOfWeeks" INTEGER NOT NULL DEFAULT 1;

-- 2. Adicionar constraint check (1-4 semanas)
ALTER TABLE weekly_schedule_patterns
  DROP CONSTRAINT IF EXISTS weekly_schedule_patterns_numberOfweeks_check;

ALTER TABLE weekly_schedule_patterns
  ADD CONSTRAINT weekly_schedule_patterns_numberOfweeks_check
  CHECK ("numberOfWeeks" >= 1 AND "numberOfWeeks" <= 4);

-- 3. Adicionar weekNumber aos assignments (default 0 para retrocompatibilidade)
ALTER TABLE weekly_schedule_pattern_assignments
  ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER NOT NULL DEFAULT 0;

-- 4. Adicionar constraint check (0-3, compatível com numberOfWeeks)
ALTER TABLE weekly_schedule_pattern_assignments
  DROP CONSTRAINT IF EXISTS weekly_schedule_pattern_assignments_weeknumber_check;

ALTER TABLE weekly_schedule_pattern_assignments
  ADD CONSTRAINT weekly_schedule_pattern_assignments_weeknumber_check
  CHECK ("weekNumber" >= 0 AND "weekNumber" <= 3);

-- 5. Dropar constraint/índice antigo de unicidade (SEM weekNumber)
-- IMPORTANTE: O nome pode estar truncado devido a limite de 63 caracteres do PostgreSQL
ALTER TABLE weekly_schedule_pattern_assignments
  DROP CONSTRAINT IF EXISTS weekly_schedule_pattern_assignments_patternid_dayofweek_shifttemplateid_key;

ALTER TABLE weekly_schedule_pattern_assignments
  DROP CONSTRAINT IF EXISTS weekly_schedule_pattern_assignments_patternId_dayOfWeek_shiftT_key;

-- Dropar o índice único antigo (nome truncado)
DROP INDEX IF EXISTS weekly_schedule_pattern_assignments_patternid_dayofweek_shiftte;

-- 6. Criar novo constraint de unicidade incluindo weekNumber
ALTER TABLE weekly_schedule_pattern_assignments
  ADD CONSTRAINT weekly_schedule_pattern_assignments_pattern_week_day_shift_key
  UNIQUE ("patternId", "weekNumber", "dayOfWeek", "shiftTemplateId");

-- 7. Criar índice para performance
DROP INDEX IF EXISTS idx_weekly_schedule_pattern_assignments_week_day;

CREATE INDEX IF NOT EXISTS idx_weekly_schedule_pattern_assignments_week_day
  ON weekly_schedule_pattern_assignments ("patternId", "weekNumber", "dayOfWeek");

-- ==========================================
-- Observações:
-- - Padrões existentes receberão numberOfWeeks=1 (padrão semanal)
-- - Assignments existentes receberão weekNumber=0 (primeira semana)
-- - Frontend detectará numberOfWeeks=1 e não mostrará tabs
-- ==========================================
