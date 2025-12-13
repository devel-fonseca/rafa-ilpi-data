# Módulo: Evoluções Clínicas (SOAP) + Documentos Tiptap

**Status:** ✅ Implementado
**Versão:** 1.1.0
**Última atualização:** 08/12/2025

## Visão Geral

Sistema de evoluções clínicas com metodologia SOAP + geração opcional de documentos formatados (PDF) usando editor Tiptap WYSIWYG.

## Funcionalidades Principais

- ✅ **Metodologia SOAP**: Subjetivo, Objetivo, Avaliação, Plano
- ✅ **Editor Tiptap**: WYSIWYG para documentos anexos
- ✅ **Geração de PDF**: Layout institucional completo
- ✅ **Upload MinIO/S3**: Armazenamento de PDFs
- ✅ **Preview antes de salvar**: Modal de confirmação
- ✅ **Aba consolidada**: "Documentos de Saúde" no prontuário
- ✅ **Filtros**: Por período, profissional, residente

## Arquitetura

**Backend:**
- Controller: `apps/backend/src/clinical-notes/clinical-notes.controller.ts`
- Service: `apps/backend/src/clinical-notes/clinical-notes.service.ts`
- Migration: `20251208110650_add_clinical_note_documents`

**Frontend:**
- Form: `apps/frontend/src/components/clinical-notes/ClinicalNotesForm.tsx`
- Editor: `apps/frontend/src/components/tiptap/TiptapEditor.tsx`
- Preview: `apps/frontend/src/components/clinical-notes/DocumentPreviewModal.tsx`
- Docs Tab: `apps/frontend/src/components/medical-record/HealthDocumentsTab.tsx`

## Modelos

```prisma
model ClinicalNote {
  id          String    @id @default(uuid())
  tenantId    String    @db.Uuid
  residentId  String    @db.Uuid
  subjective  String?   @db.Text
  objective   String?   @db.Text
  assessment  String?   @db.Text
  plan        String?   @db.Text
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now())
  documents   ClinicalNoteDocument[]
}

model ClinicalNoteDocument {
  id          String    @id @default(uuid())
  noteId      String?   @db.Uuid
  title       String    @db.VarChar(255)
  type        String?   @db.VarChar(100)
  htmlContent String    @db.Text
  pdfUrl      String    @db.Text
  pdfKey      String    @db.Text
  pdfFilename String    @db.VarChar(255)
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now())
}
```

## Referências

- [CHANGELOG - 2025-12-08](../../CHANGELOG.md#2025-12-08---documentos-tiptap-para-evoluções-clínicas)
- [Documentação Completa](../../docs/CLINICAL-NOTE-DOCUMENTS.md)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
