-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('VIEW_RESIDENTS', 'CREATE_RESIDENTS', 'UPDATE_RESIDENTS', 'DELETE_RESIDENTS', 'VIEW_DAILY_RECORDS', 'CREATE_DAILY_RECORDS', 'UPDATE_DAILY_RECORDS', 'DELETE_DAILY_RECORDS', 'VIEW_PRESCRIPTIONS', 'CREATE_PRESCRIPTIONS', 'UPDATE_PRESCRIPTIONS', 'DELETE_PRESCRIPTIONS', 'VIEW_MEDICATIONS', 'ADMINISTER_MEDICATIONS', 'ADMINISTER_CONTROLLED_MEDICATIONS', 'VIEW_VITAL_SIGNS', 'RECORD_VITAL_SIGNS', 'VIEW_VACCINATIONS', 'RECORD_VACCINATIONS', 'VIEW_BEDS', 'MANAGE_BEDS', 'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DELETE_DOCUMENTS', 'VIEW_USERS', 'CREATE_USERS', 'UPDATE_USERS', 'DELETE_USERS', 'MANAGE_PERMISSIONS', 'VIEW_REPORTS', 'EXPORT_DATA', 'VIEW_AUDIT_LOGS', 'VIEW_INSTITUTIONAL_SETTINGS', 'UPDATE_INSTITUTIONAL_SETTINGS');

-- CreateEnum
CREATE TYPE "PositionCode" AS ENUM ('ADMINISTRATOR', 'TECHNICAL_MANAGER', 'NURSING_COORDINATOR', 'NURSE', 'NURSING_TECHNICIAN', 'DOCTOR', 'NUTRITIONIST', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'SPEECH_THERAPIST', 'SOCIAL_WORKER', 'CAREGIVER', 'ADMINISTRATIVE_ASSISTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('COREN', 'CRM', 'CRN', 'CREFITO', 'CRP', 'CREFONO', 'CRESS', 'NONE');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "isNursingCoordinator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTechnicalManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "positionCode" "PositionCode",
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "registrationState" TEXT,
ADD COLUMN     "registrationType" "RegistrationType";

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "permission" "PermissionType" NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" UUID NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permissions_tenantId_userProfileId_idx" ON "user_permissions"("tenantId", "userProfileId");

-- CreateIndex
CREATE INDEX "user_permissions_permission_idx" ON "user_permissions"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userProfileId_permission_key" ON "user_permissions"("userProfileId", "permission");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
