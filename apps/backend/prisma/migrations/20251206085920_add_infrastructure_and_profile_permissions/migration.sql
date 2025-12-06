-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionType" ADD VALUE 'MANAGE_INFRASTRUCTURE';
ALTER TYPE "PermissionType" ADD VALUE 'VIEW_INSTITUTIONAL_PROFILE';
ALTER TYPE "PermissionType" ADD VALUE 'UPDATE_INSTITUTIONAL_PROFILE';
