-- Add immutable ledger for financial bank accounts (tenant-scoped)

CREATE TABLE IF NOT EXISTS "financial_bank_account_ledger" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "bankAccountId" UUID NOT NULL,
  "transactionId" UUID,
  "entryType" VARCHAR(40) NOT NULL,
  "referenceType" VARCHAR(40),
  "referenceId" UUID,
  "description" TEXT,
  "effectiveDate" DATE NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "balanceAfter" DECIMAL(15,2) NOT NULL,
  "createdBy" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_bank_account_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "financial_bank_account_ledger_tenant_account_date_created_idx"
  ON "financial_bank_account_ledger" ("tenantId", "bankAccountId", "effectiveDate", "createdAt");

CREATE INDEX IF NOT EXISTS "financial_bank_account_ledger_transaction_idx"
  ON "financial_bank_account_ledger" ("transactionId");

CREATE INDEX IF NOT EXISTS "financial_bank_account_ledger_tenant_entryType_idx"
  ON "financial_bank_account_ledger" ("tenantId", "entryType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_bank_account_ledger_bankAccountId_fkey'
  ) THEN
    ALTER TABLE "financial_bank_account_ledger"
      ADD CONSTRAINT "financial_bank_account_ledger_bankAccountId_fkey"
      FOREIGN KEY ("bankAccountId") REFERENCES "financial_bank_accounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_bank_account_ledger_transactionId_fkey'
  ) THEN
    ALTER TABLE "financial_bank_account_ledger"
      ADD CONSTRAINT "financial_bank_account_ledger_transactionId_fkey"
      FOREIGN KEY ("transactionId") REFERENCES "financial_transactions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
