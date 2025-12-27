-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "trial_alert_7_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN "trial_alert_3_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN "trial_alert_1_sent" BOOLEAN NOT NULL DEFAULT false;
