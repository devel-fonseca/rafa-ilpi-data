-- Add medical review fields to Prescription table
ALTER TABLE "prescriptions"
ADD COLUMN "lastMedicalReviewDate" TIMESTAMPTZ(3),
ADD COLUMN "lastReviewedByDoctor" TEXT,
ADD COLUMN "lastReviewDoctorCrm" TEXT,
ADD COLUMN "lastReviewDoctorState" TEXT,
ADD COLUMN "lastReviewNotes" TEXT;

-- Create index for medical review queries
CREATE INDEX "prescriptions_tenantId_lastMedicalReviewDate_idx"
ON "prescriptions"("tenantId", "lastMedicalReviewDate");
