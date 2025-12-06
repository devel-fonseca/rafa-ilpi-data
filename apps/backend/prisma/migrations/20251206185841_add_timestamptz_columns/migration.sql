-- Migration: Add TIMESTAMPTZ columns (Phase 1 - Coexistence Strategy)
-- Date: 2025-12-06
-- Purpose: Replace DATE columns with TIMESTAMPTZ to eliminate timezone bugs

-- ============================================
-- RESIDENTS (3 columns)
-- ============================================
ALTER TABLE "residents" ADD COLUMN "birth_date_tz" TIMESTAMPTZ(3);
ALTER TABLE "residents" ADD COLUMN "admission_date_tz" TIMESTAMPTZ(3);
ALTER TABLE "residents" ADD COLUMN "discharge_date_tz" TIMESTAMPTZ(3);

-- ============================================
-- PRESCRIPTIONS (3 columns)
-- ============================================
ALTER TABLE "prescriptions" ADD COLUMN "prescription_date_tz" TIMESTAMPTZ(3);
ALTER TABLE "prescriptions" ADD COLUMN "valid_until_tz" TIMESTAMPTZ(3);
ALTER TABLE "prescriptions" ADD COLUMN "review_date_tz" TIMESTAMPTZ(3);

-- ============================================
-- MEDICATIONS (2 columns)
-- ============================================
ALTER TABLE "medications" ADD COLUMN "start_date_tz" TIMESTAMPTZ(3);
ALTER TABLE "medications" ADD COLUMN "end_date_tz" TIMESTAMPTZ(3);

-- ============================================
-- SOS_MEDICATIONS (2 columns)
-- ============================================
ALTER TABLE "sos_medications" ADD COLUMN "start_date_tz" TIMESTAMPTZ(3);
ALTER TABLE "sos_medications" ADD COLUMN "end_date_tz" TIMESTAMPTZ(3);

-- ============================================
-- MEDICATION_ADMINISTRATIONS (1 column)
-- ============================================
ALTER TABLE "medication_administrations" ADD COLUMN "date_tz" TIMESTAMPTZ(3);

-- ============================================
-- SOS_ADMINISTRATIONS (1 column)
-- ============================================
ALTER TABLE "sos_administrations" ADD COLUMN "date_tz" TIMESTAMPTZ(3);

-- ============================================
-- DAILY_RECORDS (1 column)
-- ============================================
ALTER TABLE "daily_records" ADD COLUMN "date_tz" TIMESTAMPTZ(3);

-- ============================================
-- VACCINATIONS (1 column)
-- ============================================
ALTER TABLE "vaccinations" ADD COLUMN "date_tz" TIMESTAMPTZ(3);

-- ============================================
-- USER_PROFILES (1 column)
-- ============================================
ALTER TABLE "user_profiles" ADD COLUMN "birth_date_tz" TIMESTAMPTZ(3);

-- ============================================
-- TENANT_PROFILES (1 column)
-- ============================================
ALTER TABLE "tenant_profiles" ADD COLUMN "founded_at_tz" TIMESTAMPTZ(3);

-- ============================================
-- TENANT_DOCUMENTS (2 columns)
-- ============================================
ALTER TABLE "tenant_documents" ADD COLUMN "issued_at_tz" TIMESTAMPTZ(3);
ALTER TABLE "tenant_documents" ADD COLUMN "expires_at_tz" TIMESTAMPTZ(3);

-- ============================================
-- PHASE 2: Populate new columns (run separately via UPDATE statements)
-- This migration only ADDS columns, data migration is done in Phase 2
-- ============================================

-- Total: 20 new TIMESTAMPTZ(3) columns added
-- Next step: Run UPDATE statements to populate these columns from existing DATE columns