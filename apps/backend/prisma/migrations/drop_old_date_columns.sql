-- ============================================
-- DROP OLD DATE COLUMNS - Phase 4 (Cleanup)
-- Date: 2025-12-06
-- Purpose: Remove backup *_old columns after successful TIMESTAMPTZ migration
-- ============================================

-- RESIDENTS (3 columns)
ALTER TABLE "residents" DROP COLUMN IF EXISTS "birthDate_old";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "admissionDate_old";
ALTER TABLE "residents" DROP COLUMN IF EXISTS "dischargeDate_old";

-- PRESCRIPTIONS (3 columns)
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "prescriptionDate_old";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "validUntil_old";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "reviewDate_old";

-- MEDICATIONS (2 columns)
ALTER TABLE "medications" DROP COLUMN IF EXISTS "startDate_old";
ALTER TABLE "medications" DROP COLUMN IF EXISTS "endDate_old";

-- SOS_MEDICATIONS (2 columns)
ALTER TABLE "sos_medications" DROP COLUMN IF EXISTS "startDate_old";
ALTER TABLE "sos_medications" DROP COLUMN IF EXISTS "endDate_old";

-- MEDICATION_ADMINISTRATIONS (1 column)
ALTER TABLE "medication_administrations" DROP COLUMN IF EXISTS "date_old";

-- SOS_ADMINISTRATIONS (1 column)
ALTER TABLE "sos_administrations" DROP COLUMN IF EXISTS "date_old";

-- DAILY_RECORDS (1 column)
ALTER TABLE "daily_records" DROP COLUMN IF EXISTS "date_old";

-- VACCINATIONS (1 column)
ALTER TABLE "vaccinations" DROP COLUMN IF EXISTS "date_old";

-- USER_PROFILES (1 column)
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "birthDate_old";

-- TENANT_PROFILES (1 column)
ALTER TABLE "tenant_profiles" DROP COLUMN IF EXISTS "foundedAt_old";

-- TENANT_DOCUMENTS (2 columns)
ALTER TABLE "tenant_documents" DROP COLUMN IF EXISTS "issuedAt_old";
ALTER TABLE "tenant_documents" DROP COLUMN IF EXISTS "expiresAt_old";

-- ============================================
-- TOTAL: 20 colunas removidas
-- ============================================
