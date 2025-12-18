-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'SCHEDULED_EVENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SystemNotificationType" ADD VALUE 'SCHEDULED_EVENT_DUE';
ALTER TYPE "SystemNotificationType" ADD VALUE 'SCHEDULED_EVENT_MISSED';
