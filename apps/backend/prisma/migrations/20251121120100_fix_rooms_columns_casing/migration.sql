-- Renomear colunas para camelCase (Prisma usa camelCase)
ALTER TABLE "rooms" RENAME COLUMN "roomnumber" TO "roomNumber";
ALTER TABLE "rooms" RENAME COLUMN "hasprivatebathroom" TO "hasPrivateBathroom";
ALTER TABLE "rooms" RENAME COLUMN "accessible" TO "accessible"; -- já está ok

-- Recrear índice com nome correto
DROP INDEX IF EXISTS "rooms_code_idx";
CREATE INDEX "rooms_code_idx" ON "rooms"("code");
