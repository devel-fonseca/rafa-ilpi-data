/*
  Warnings:

  - You are about to drop the column `originCep` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originCity` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originComplement` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originDistrict` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originNumber` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originPhone` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originState` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `originStreet` on the `residents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "residents" DROP COLUMN "originCep",
DROP COLUMN "originCity",
DROP COLUMN "originComplement",
DROP COLUMN "originDistrict",
DROP COLUMN "originNumber",
DROP COLUMN "originPhone",
DROP COLUMN "originState",
DROP COLUMN "originStreet",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "legalGuardianEmail" TEXT,
ADD COLUMN     "origin" TEXT;
