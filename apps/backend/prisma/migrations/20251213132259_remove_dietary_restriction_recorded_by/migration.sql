/*
  Warnings:

  - You are about to drop the column `recordedBy` on the `dietary_restrictions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "dietary_restrictions" DROP CONSTRAINT "dietary_restrictions_recordedBy_fkey";

-- AlterTable
ALTER TABLE "dietary_restrictions" DROP COLUMN "recordedBy";
