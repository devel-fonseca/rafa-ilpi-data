-- ============================================
-- RENAME DATE COLUMNS - Phase 3
-- Date: 2025-12-06
-- Purpose: Rename old DATE columns to _old and TIMESTAMPTZ to official names
-- ============================================

-- RESIDENTS
ALTER TABLE "residents" RENAME COLUMN "birthDate" TO "birthDate_old";
ALTER TABLE "residents" RENAME COLUMN "birth_date_tz" TO "birthDate";

ALTER TABLE "residents" RENAME COLUMN "admissionDate" TO "admissionDate_old";
ALTER TABLE "residents" RENAME COLUMN "admission_date_tz" TO "admissionDate";

ALTER TABLE "residents" RENAME COLUMN "dischargeDate" TO "dischargeDate_old";
ALTER TABLE "residents" RENAME COLUMN "discharge_date_tz" TO "dischargeDate";

-- PRESCRIPTIONS
ALTER TABLE "prescriptions" RENAME COLUMN "prescriptionDate" TO "prescriptionDate_old";
ALTER TABLE "prescriptions" RENAME COLUMN "prescription_date_tz" TO "prescriptionDate";

ALTER TABLE "prescriptions" RENAME COLUMN "validUntil" TO "validUntil_old";
ALTER TABLE "prescriptions" RENAME COLUMN "valid_until_tz" TO "validUntil";

ALTER TABLE "prescriptions" RENAME COLUMN "reviewDate" TO "reviewDate_old";
ALTER TABLE "prescriptions" RENAME COLUMN "review_date_tz" TO "reviewDate";

-- MEDICATIONS
ALTER TABLE "medications" RENAME COLUMN "startDate" TO "startDate_old";
ALTER TABLE "medications" RENAME COLUMN "start_date_tz" TO "startDate";

ALTER TABLE "medications" RENAME COLUMN "endDate" TO "endDate_old";
ALTER TABLE "medications" RENAME COLUMN "end_date_tz" TO "endDate";

-- SOS_MEDICATIONS
ALTER TABLE "sos_medications" RENAME COLUMN "startDate" TO "startDate_old";
ALTER TABLE "sos_medications" RENAME COLUMN "start_date_tz" TO "startDate";

ALTER TABLE "sos_medications" RENAME COLUMN "endDate" TO "endDate_old";
ALTER TABLE "sos_medications" RENAME COLUMN "end_date_tz" TO "endDate";

-- MEDICATION_ADMINISTRATIONS
ALTER TABLE "medication_administrations" RENAME COLUMN "date" TO "date_old";
ALTER TABLE "medication_administrations" RENAME COLUMN "date_tz" TO "date";

-- SOS_ADMINISTRATIONS
ALTER TABLE "sos_administrations" RENAME COLUMN "date" TO "date_old";
ALTER TABLE "sos_administrations" RENAME COLUMN "date_tz" TO "date";

-- DAILY_RECORDS
ALTER TABLE "daily_records" RENAME COLUMN "date" TO "date_old";
ALTER TABLE "daily_records" RENAME COLUMN "date_tz" TO "date";

-- VACCINATIONS
ALTER TABLE "vaccinations" RENAME COLUMN "date" TO "date_old";
ALTER TABLE "vaccinations" RENAME COLUMN "date_tz" TO "date";

-- USER_PROFILES
ALTER TABLE "user_profiles" RENAME COLUMN "birthDate" TO "birthDate_old";
ALTER TABLE "user_profiles" RENAME COLUMN "birth_date_tz" TO "birthDate";

-- TENANT_PROFILES
ALTER TABLE "tenant_profiles" RENAME COLUMN "foundedAt" TO "foundedAt_old";
ALTER TABLE "tenant_profiles" RENAME COLUMN "founded_at_tz" TO "foundedAt";

-- TENANT_DOCUMENTS
ALTER TABLE "tenant_documents" RENAME COLUMN "issuedAt" TO "issuedAt_old";
ALTER TABLE "tenant_documents" RENAME COLUMN "issued_at_tz" TO "issuedAt";

ALTER TABLE "tenant_documents" RENAME COLUMN "expiresAt" TO "expiresAt_old";
ALTER TABLE "tenant_documents" RENAME COLUMN "expires_at_tz" TO "expiresAt";

-- ============================================
-- Verification: Check new column types
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'residents' AND column_name LIKE '%Date%';
