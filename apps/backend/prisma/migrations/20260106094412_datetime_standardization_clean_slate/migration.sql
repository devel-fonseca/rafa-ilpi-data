-- AlterTable
ALTER TABLE "daily_records" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "institutional_events" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "scheduledDate" SET DATA TYPE DATE,
ALTER COLUMN "expiryDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "dueDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "medication_administrations" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "medications" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "prescriptions" ALTER COLUMN "prescriptionDate" SET DATA TYPE DATE,
ALTER COLUMN "validUntil" SET DATA TYPE DATE,
ALTER COLUMN "reviewDate" SET DATA TYPE DATE,
ALTER COLUMN "lastMedicalReviewDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "resident_scheduled_events" ALTER COLUMN "scheduledDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "residents" ALTER COLUMN "birthDate" SET DATA TYPE DATE,
ALTER COLUMN "admissionDate" SET DATA TYPE DATE,
ALTER COLUMN "dischargeDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "sos_administrations" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "sos_medications" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "tenant_documents" ALTER COLUMN "issuedAt" SET DATA TYPE DATE,
ALTER COLUMN "expiresAt" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "tenant_profiles" ALTER COLUMN "foundedAt" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo';

-- AlterTable
ALTER TABLE "user_profiles" ALTER COLUMN "birthDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "vaccinations" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "vital_sign_alert_history" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "tenants_timezone_idx" ON "tenants"("timezone");
