-- Add standardized contraindications field to clinical entities
ALTER TABLE "allergies"
  ADD COLUMN "contraindications" TEXT;

ALTER TABLE "conditions"
  ADD COLUMN "contraindications" TEXT;

ALTER TABLE "dietary_restrictions"
  ADD COLUMN "contraindications" TEXT;
