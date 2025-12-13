# Schema do Banco de Dados

**Versão:** 5.22.0 (Prisma)
**Última atualização:** 11/12/2025

## Visão Geral

PostgreSQL 14+ com Prisma ORM. Schema completo em `apps/backend/prisma/schema.prisma`.

## Principais Tabelas

### Core
- `tenants` - ILPIs/Instituições
- `users` - Usuários do sistema
- `residents` - Residentes

### Acomodações
- `buildings` - Prédios
- `floors` - Andares
- `rooms` - Quartos
- `beds` - Leitos

### Saúde
- `daily_records` - Registros diários
- `daily_record_history` - Histórico de alterações
- `vital_signs` - Sinais vitais
- `clinical_notes` - Evoluções SOAP
- `clinical_note_documents` - Documentos Tiptap
- `vaccinations` - Vacinações

### Medicação
- `medications` - Medicamentos cadastrados
- `prescriptions` - Prescrições médicas
- `medication_prescriptions` - Pivot prescrição-medicamento

### Documentos
- `tenant_documents` - Documentos institucionais
- `document_history` - Histórico de documentos

### POPs
- `pops` - Procedimentos Operacionais Padrão

### Notificações
- `notifications` - Notificações do sistema

## Convenções

- **IDs:** UUID v4 (`@db.Uuid`)
- **Timestamps:** `@db.Timestamptz(3)` (UTC)
- **Soft Delete:** Campo `deletedAt` nullable
- **Audit:** `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

## Migrations

Pasta: `apps/backend/prisma/migrations/`

Principais migrations:
- `20251115141651_add_daily_records`
- `20251208110650_add_clinical_note_documents`
- `20251206122043_add_notifications_system`
- `20251202221041_add_ilpi_permissions_system`
- `20251129030423_add_resident_documents_table`

## Referências

- [Arquivo Schema](../../apps/backend/prisma/schema.prisma)
- [Multi-Tenancy](multi-tenancy.md)
