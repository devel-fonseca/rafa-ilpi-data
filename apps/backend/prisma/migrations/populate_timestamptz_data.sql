-- ============================================
-- POPULATE TIMESTAMPTZ COLUMNS - Phase 2
-- Date: 2025-12-06
-- Purpose: Migrate data from DATE to TIMESTAMPTZ columns
-- Strategy: Add 12 hours to avoid DST issues
-- ============================================

-- ============================================
-- RESIDENTS (3 columns)
-- ============================================
UPDATE "residents" SET
  "birth_date_tz" = "birthDate" + INTERVAL '12 hours',
  "admission_date_tz" = "admissionDate" + INTERVAL '12 hours',
  "discharge_date_tz" = CASE
    WHEN "dischargeDate" IS NOT NULL
    THEN "dischargeDate" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- PRESCRIPTIONS (3 columns)
-- ============================================
UPDATE "prescriptions" SET
  "prescription_date_tz" = "prescriptionDate" + INTERVAL '12 hours',
  "valid_until_tz" = CASE
    WHEN "validUntil" IS NOT NULL
    THEN "validUntil" + INTERVAL '12 hours'
    ELSE NULL
  END,
  "review_date_tz" = CASE
    WHEN "reviewDate" IS NOT NULL
    THEN "reviewDate" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- MEDICATIONS (2 columns)
-- ============================================
UPDATE "medications" SET
  "start_date_tz" = "startDate" + INTERVAL '12 hours',
  "end_date_tz" = CASE
    WHEN "endDate" IS NOT NULL
    THEN "endDate" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- SOS_MEDICATIONS (2 columns)
-- ============================================
UPDATE "sos_medications" SET
  "start_date_tz" = "startDate" + INTERVAL '12 hours',
  "end_date_tz" = CASE
    WHEN "endDate" IS NOT NULL
    THEN "endDate" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- MEDICATION_ADMINISTRATIONS (1 column)
-- ============================================
UPDATE "medication_administrations" SET
  "date_tz" = "date" + INTERVAL '12 hours';

-- ============================================
-- SOS_ADMINISTRATIONS (1 column)
-- ============================================
UPDATE "sos_administrations" SET
  "date_tz" = "date" + INTERVAL '12 hours';

-- ============================================
-- DAILY_RECORDS (1 column)
-- ============================================
UPDATE "daily_records" SET
  "date_tz" = "date" + INTERVAL '12 hours';

-- ============================================
-- VACCINATIONS (1 column)
-- ============================================
UPDATE "vaccinations" SET
  "date_tz" = "date" + INTERVAL '12 hours';

-- ============================================
-- USER_PROFILES (1 column)
-- ============================================
UPDATE "user_profiles" SET
  "birth_date_tz" = CASE
    WHEN "birthDate" IS NOT NULL
    THEN "birthDate" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- TENANT_PROFILES (1 column)
-- ============================================
UPDATE "tenant_profiles" SET
  "founded_at_tz" = CASE
    WHEN "foundedAt" IS NOT NULL
    THEN "foundedAt" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- TENANT_DOCUMENTS (2 columns)
-- ============================================
UPDATE "tenant_documents" SET
  "issued_at_tz" = CASE
    WHEN "issuedAt" IS NOT NULL
    THEN "issuedAt" + INTERVAL '12 hours'
    ELSE NULL
  END,
  "expires_at_tz" = CASE
    WHEN "expiresAt" IS NOT NULL
    THEN "expiresAt" + INTERVAL '12 hours'
    ELSE NULL
  END;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify data migration:

-- SELECT COUNT(*) FROM residents WHERE birth_date IS NOT NULL AND birth_date_tz IS NULL;
-- SELECT COUNT(*) FROM prescriptions WHERE prescription_date IS NOT NULL AND prescription_date_tz IS NULL;
-- SELECT COUNT(*) FROM medications WHERE start_date IS NOT NULL AND start_date_tz IS NULL;
-- SELECT COUNT(*) FROM sos_medications WHERE start_date IS NOT NULL AND start_date_tz IS NULL;
-- SELECT COUNT(*) FROM medication_administrations WHERE date IS NOT NULL AND date_tz IS NULL;
-- SELECT COUNT(*) FROM sos_administrations WHERE date IS NOT NULL AND date_tz IS NULL;
-- SELECT COUNT(*) FROM daily_records WHERE date IS NOT NULL AND date_tz IS NULL;
-- SELECT COUNT(*) FROM vaccinations WHERE date IS NOT NULL AND date_tz IS NULL;

-- All counts should be 0 after running this script
