-- AlterTable
ALTER TABLE "public"."tenant_shift_configs" ADD COLUMN "customStartTime" VARCHAR(5),
ADD COLUMN "customEndTime" VARCHAR(5),
ADD COLUMN "customDuration" INTEGER;
