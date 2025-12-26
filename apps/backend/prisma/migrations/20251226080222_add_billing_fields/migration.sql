-- AlterTable: Add annualDiscountPercent to plans table
ALTER TABLE "plans" ADD COLUMN "annual_discount_percent" DECIMAL(5,2) DEFAULT 0;

-- AlterTable: Add billing cycle and payment method to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN "billing_cycle" VARCHAR(20);
ALTER TABLE "subscriptions" ADD COLUMN "preferred_payment_method" VARCHAR(50);

-- AlterTable: Add billing information fields to invoices table
ALTER TABLE "invoices" ADD COLUMN "original_amount" DECIMAL(10,2);
ALTER TABLE "invoices" ADD COLUMN "discount_percent" DECIMAL(5,2);
ALTER TABLE "invoices" ADD COLUMN "discount_reason" VARCHAR(255);
ALTER TABLE "invoices" ADD COLUMN "billing_cycle" VARCHAR(20);
ALTER TABLE "invoices" ADD COLUMN "description" TEXT;
