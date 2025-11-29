/*
  Warnings:

  - You are about to drop the column `documentos_pessoais_urls` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `documentos_endereco_urls` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `responsavel_legal_documentos_urls` on the `residents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "residents"
DROP COLUMN IF EXISTS "documentos_pessoais_urls",
DROP COLUMN IF EXISTS "documentos_endereco_urls",
DROP COLUMN IF EXISTS "responsavel_legal_documentos_urls";
