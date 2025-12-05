-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "public" VERSION "1.3";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog" VERSION "1.0";

-- DropForeignKey
ALTER TABLE "clinical_profiles" DROP CONSTRAINT "clinical_profiles_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "clinical_profiles" DROP CONSTRAINT "clinical_profiles_residentId_fkey";

-- DropForeignKey
ALTER TABLE "clinical_profiles" DROP CONSTRAINT "clinical_profiles_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "allergies" DROP CONSTRAINT "allergies_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "allergies" DROP CONSTRAINT "allergies_residentId_fkey";

-- DropForeignKey
ALTER TABLE "allergies" DROP CONSTRAINT "allergies_recordedBy_fkey";

-- DropForeignKey
ALTER TABLE "conditions" DROP CONSTRAINT "conditions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "conditions" DROP CONSTRAINT "conditions_residentId_fkey";

-- DropForeignKey
ALTER TABLE "conditions" DROP CONSTRAINT "conditions_recordedBy_fkey";

-- DropForeignKey
ALTER TABLE "dietary_restrictions" DROP CONSTRAINT "dietary_restrictions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "dietary_restrictions" DROP CONSTRAINT "dietary_restrictions_residentId_fkey";

-- DropForeignKey
ALTER TABLE "dietary_restrictions" DROP CONSTRAINT "dietary_restrictions_recordedBy_fkey";

-- AlterTable
ALTER TABLE "residents" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "chronicConditions" TEXT,
ADD COLUMN     "dietaryRestrictions" TEXT,
ADD COLUMN     "functionalAspects" TEXT,
ADD COLUMN     "healthStatus" TEXT,
ADD COLUMN     "specialNeeds" TEXT;

-- DropTable
DROP TABLE "clinical_profiles";

-- DropTable
DROP TABLE "allergies";

-- DropTable
DROP TABLE "conditions";

-- DropTable
DROP TABLE "dietary_restrictions";

-- DropEnum
DROP TYPE "AllergySeverity";

-- DropEnum
DROP TYPE "RestrictionType";

