-- Add RESCINDIDO to ContractDocumentStatus enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ContractDocumentStatus'
      AND e.enumlabel = 'RESCINDIDO'
  ) THEN
    ALTER TYPE "ContractDocumentStatus" ADD VALUE 'RESCINDIDO';
  END IF;
END $$;

-- Contract v2 fields
ALTER TABLE "resident_contracts"
  ADD COLUMN IF NOT EXISTS "isIndefinite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "versionMajor" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "versionMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rescindedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "rescissionReason" TEXT;

-- endDate becomes nullable to support indefinite contracts
ALTER TABLE "resident_contracts"
  ALTER COLUMN "endDate" DROP NOT NULL;

-- Backfill for existing rows
UPDATE "resident_contracts"
SET "versionMajor" = COALESCE("version", 1),
    "versionMinor" = 0
WHERE "versionMajor" IS NULL
   OR "versionMinor" IS NULL;

-- Indexes for new access patterns
CREATE INDEX IF NOT EXISTS "resident_contracts_isIndefinite_idx"
  ON "resident_contracts"("isIndefinite");

CREATE INDEX IF NOT EXISTS "resident_contracts_rescindedAt_idx"
  ON "resident_contracts"("rescindedAt");

CREATE INDEX IF NOT EXISTS "resident_contracts_versionMajor_versionMinor_idx"
  ON "resident_contracts"("versionMajor", "versionMinor");
