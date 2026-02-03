-- CreateEnum
CREATE TYPE "BelongingCategory" AS ENUM ('DOCUMENTOS', 'VESTUARIO', 'CALCADOS', 'ITENS_HIGIENE', 'ELETRONICOS', 'OBJETOS_VALOR', 'AUXILIARES_MOBILIDADE', 'PROTESES_ORTESES', 'ITENS_AFETIVOS', 'OUTROS');

-- CreateEnum
CREATE TYPE "ConservationState" AS ENUM ('NOVO', 'BOM', 'REGULAR', 'RUIM', 'AVARIADO');

-- CreateEnum
CREATE TYPE "BelongingStatus" AS ENUM ('EM_GUARDA', 'DEVOLVIDO', 'EXTRAVIADO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "BelongingTermType" AS ENUM ('RECEBIMENTO', 'ATUALIZACAO', 'DEVOLUCAO_FINAL');

-- CreateEnum
CREATE TYPE "BelongingTermStatus" AS ENUM ('PENDENTE', 'ASSINADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "BelongingMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'ALTERACAO_ESTADO');

-- CreateEnum
CREATE TYPE "BelongingAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'DELETED');

-- CreateTable
CREATE TABLE "resident_belongings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "category" "BelongingCategory" NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "brandModel" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "conservationState" "ConservationState" NOT NULL,
    "identification" VARCHAR(100),
    "declaredValue" DECIMAL(10,2),
    "storageLocation" VARCHAR(100),
    "entryDate" DATE NOT NULL,
    "deliveredBy" VARCHAR(150) NOT NULL,
    "receivedBy" VARCHAR(150) NOT NULL,
    "entryTermId" UUID,
    "exitDate" DATE,
    "exitReceivedBy" VARCHAR(150),
    "exitReason" TEXT,
    "exitTermId" UUID,
    "status" "BelongingStatus" NOT NULL DEFAULT 'EM_GUARDA',
    "notes" TEXT,
    "photoUrl" TEXT,
    "photoKey" TEXT,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_belongings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "belonging_terms" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "type" "BelongingTermType" NOT NULL,
    "termNumber" VARCHAR(50) NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "termDate" DATE NOT NULL,
    "issuedBy" VARCHAR(150) NOT NULL,
    "receivedBy" VARCHAR(150),
    "receiverDocument" VARCHAR(50),
    "notes" TEXT,
    "signedFileUrl" TEXT,
    "signedFileKey" TEXT,
    "signedFileName" TEXT,
    "signedFileSize" INTEGER,
    "signedFileHash" VARCHAR(64),
    "status" "BelongingTermStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "belonging_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "belonging_term_items" (
    "id" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "belongingId" UUID NOT NULL,
    "movementType" "BelongingMovementType" NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "previousState" "ConservationState",
    "newState" "ConservationState",
    "stateChangeReason" TEXT,

    CONSTRAINT "belonging_term_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "belonging_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "belongingId" UUID NOT NULL,
    "action" "BelongingAction" NOT NULL,
    "reason" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "belonging_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident_belongings_tenantId_residentId_idx" ON "resident_belongings"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "resident_belongings_residentId_status_idx" ON "resident_belongings"("residentId", "status");

-- CreateIndex
CREATE INDEX "resident_belongings_category_idx" ON "resident_belongings"("category");

-- CreateIndex
CREATE INDEX "resident_belongings_deletedAt_idx" ON "resident_belongings"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "belonging_terms_tenantId_termNumber_key" ON "belonging_terms"("tenantId", "termNumber");

-- CreateIndex
CREATE INDEX "belonging_terms_tenantId_residentId_idx" ON "belonging_terms"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "belonging_terms_type_idx" ON "belonging_terms"("type");

-- CreateIndex
CREATE INDEX "belonging_terms_status_idx" ON "belonging_terms"("status");

-- CreateIndex
CREATE INDEX "belonging_term_items_termId_idx" ON "belonging_term_items"("termId");

-- CreateIndex
CREATE INDEX "belonging_term_items_belongingId_idx" ON "belonging_term_items"("belongingId");

-- CreateIndex
CREATE INDEX "belonging_history_tenantId_belongingId_idx" ON "belonging_history"("tenantId", "belongingId");

-- CreateIndex
CREATE INDEX "belonging_history_belongingId_idx" ON "belonging_history"("belongingId");

-- CreateIndex
CREATE INDEX "belonging_history_action_idx" ON "belonging_history"("action");

-- CreateIndex
CREATE INDEX "belonging_history_changedAt_idx" ON "belonging_history"("changedAt");

-- AddForeignKey
ALTER TABLE "resident_belongings" ADD CONSTRAINT "resident_belongings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_belongings" ADD CONSTRAINT "resident_belongings_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_belongings" ADD CONSTRAINT "resident_belongings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_belongings" ADD CONSTRAINT "resident_belongings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_belongings" ADD CONSTRAINT "resident_belongings_entryTermId_fkey" FOREIGN KEY ("entryTermId") REFERENCES "belonging_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_belongings" ADD CONSTRAINT "resident_belongings_exitTermId_fkey" FOREIGN KEY ("exitTermId") REFERENCES "belonging_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_terms" ADD CONSTRAINT "belonging_terms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_terms" ADD CONSTRAINT "belonging_terms_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_terms" ADD CONSTRAINT "belonging_terms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_term_items" ADD CONSTRAINT "belonging_term_items_termId_fkey" FOREIGN KEY ("termId") REFERENCES "belonging_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_term_items" ADD CONSTRAINT "belonging_term_items_belongingId_fkey" FOREIGN KEY ("belongingId") REFERENCES "resident_belongings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_history" ADD CONSTRAINT "belonging_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_history" ADD CONSTRAINT "belonging_history_belongingId_fkey" FOREIGN KEY ("belongingId") REFERENCES "resident_belongings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belonging_history" ADD CONSTRAINT "belonging_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
