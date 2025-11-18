-- AlterTable: Add new columns as nullable first
ALTER TABLE "plans" ADD COLUMN "displayName" TEXT;
ALTER TABLE "plans" ADD COLUMN "trialDays" INTEGER DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN "isPopular" BOOLEAN DEFAULT false;

-- Rename priceMonthly to price and make it nullable
ALTER TABLE "plans" RENAME COLUMN "priceMonthly" TO "price";
ALTER TABLE "plans" ALTER COLUMN "price" DROP NOT NULL;

-- Update default for features from "[]" to "{}"
ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}';

-- Populate displayName based on existing name values
UPDATE "plans" SET "displayName" =
  CASE
    WHEN "name" = 'Free' THEN 'Plano Free'
    WHEN "name" = 'Básico' THEN 'Plano Básico'
    WHEN "name" = 'Profissional' THEN 'Plano Profissional'
    WHEN "name" = 'Enterprise' THEN 'Plano Enterprise'
    ELSE "name"
  END
WHERE "displayName" IS NULL;

-- Now make displayName NOT NULL since all rows have values
ALTER TABLE "plans" ALTER COLUMN "displayName" SET NOT NULL;
