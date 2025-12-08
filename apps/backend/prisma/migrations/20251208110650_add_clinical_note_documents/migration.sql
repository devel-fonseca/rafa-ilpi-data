-- CreateTable
CREATE TABLE "clinical_note_documents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100),
    "documentDate" TIMESTAMPTZ(3) NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "pdfFileUrl" TEXT,
    "pdfFileKey" TEXT,
    "pdfFileName" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "clinical_note_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_note_documents_tenantId_residentId_idx" ON "clinical_note_documents"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "clinical_note_documents_noteId_idx" ON "clinical_note_documents"("noteId");

-- AddForeignKey
ALTER TABLE "clinical_note_documents" ADD CONSTRAINT "clinical_note_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_documents" ADD CONSTRAINT "clinical_note_documents_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "clinical_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_documents" ADD CONSTRAINT "clinical_note_documents_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_note_documents" ADD CONSTRAINT "clinical_note_documents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
