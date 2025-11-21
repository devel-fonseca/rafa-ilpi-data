-- AlterTable
ALTER TABLE "rooms" ADD COLUMN "code" TEXT,
ADD COLUMN "roomNumber" TEXT,
ADD COLUMN "hasPrivateBathroom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "accessible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "observations" TEXT;

-- AddIndex
CREATE INDEX "rooms_code_idx" ON "rooms"("code");
