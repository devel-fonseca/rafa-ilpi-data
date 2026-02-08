-- AlterEnum: Add new medication administration permissions
-- These permissions allow managing medication administration records

ALTER TYPE "PermissionType" ADD VALUE IF NOT EXISTS 'UPDATE_MEDICATION_ADMINISTRATIONS';
ALTER TYPE "PermissionType" ADD VALUE IF NOT EXISTS 'DELETE_MEDICATION_ADMINISTRATIONS';
