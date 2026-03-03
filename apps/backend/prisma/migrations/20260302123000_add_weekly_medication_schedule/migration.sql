-- Add weekly frequencies to MedicationFrequency enum
ALTER TYPE "MedicationFrequency" ADD VALUE IF NOT EXISTS 'UMA_VEZ_SEMANA';
ALTER TYPE "MedicationFrequency" ADD VALUE IF NOT EXISTS 'DUAS_VEZES_SEMANA';

-- Add optional scheduled weekdays (0-6) for weekly medications
ALTER TABLE "medications"
  ADD COLUMN IF NOT EXISTS "scheduledWeekDays" JSONB NOT NULL DEFAULT '[]'::jsonb;
