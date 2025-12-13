# Módulo: POPs (Procedimentos Operacionais Padrão)

**Status:** ✅ Implementado
**Versão:** 1.1.0
**Última atualização:** 11/12/2025

## Visão Geral

Sistema de gerenciamento de Procedimentos Operacionais Padrão (POPs) com editor WYSIWYG, categorização editável e exportação em PDF. Permite documentar e padronizar procedimentos da ILPI.

## Funcionalidades Principais

- ✅ **Categorias editáveis**: Sistema base + categorias customizadas
- ✅ **Autocomplete inteligente**: Sugestões de categorias existentes
- ✅ **Editor Tiptap**: WYSIWYG com formatação rica
- ✅ **Versionamento**: Controle de versões dos POPs
- ✅ **Status**: ATIVO, REVISAO, ARQUIVADO
- ✅ **Exportação PDF**: Geração de documentos formatados
- ✅ **Busca e filtros**: Por categoria, status, título

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/pops/pops.controller.ts](../../apps/backend/src/pops/pops.controller.ts)
- **Service:** [apps/backend/src/pops/pops.service.ts](../../apps/backend/src/pops/pops.service.ts)
- **DTOs:** [apps/backend/src/pops/dto/](../../apps/backend/src/pops/dto/)

### Frontend
- **Editor:** [apps/frontend/src/pages/pops/PopEditor.tsx](../../apps/frontend/src/pages/pops/PopEditor.tsx)
- **Lista:** [apps/frontend/src/pages/pops/PopsList.tsx](../../apps/frontend/src/pages/pops/PopsList.tsx)
- **API:** [apps/frontend/src/api/pops.api.ts](../../apps/frontend/src/api/pops.api.ts)

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/pops` | Criar POP |
| GET | `/api/pops` | Listar com filtros |
| GET | `/api/pops/categories` | Buscar categorias únicas |
| GET | `/api/pops/:id` | Buscar por ID |
| PATCH | `/api/pops/:id` | Atualizar |
| DELETE | `/api/pops/:id` | Soft delete |
| GET | `/api/pops/:id/export-pdf` | Exportar PDF |

## Categorias Base

1. **Gestão e Operação** - Administrativos, RH, Finanças
2. **Enfermagem e Cuidados** - Assistência, medicação, curativos
3. **Higiene e Limpeza** - Sanitização, controle de infecção
4. **Nutrição e Alimentação** - Preparo, distribuição
5. **Medicação e Farmácia** - Administração, controle
6. **Segurança e Emergência** - Incêndio, evacuação, primeiros socorros
7. **Transporte e Mobilidade** - Transferências, mobilização

### Categorias Customizadas

Usuários podem criar categorias adicionais via Dialog:
- Validação de duplicatas (case-insensitive)
- Autocomplete com categorias existentes
- Limite de 100 caracteres
- Persistidas automaticamente

## Modelo de Dados

```prisma
model Pop {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  title       String    @db.VarChar(255)
  category    String    @db.VarChar(100)  // String livre (não enum)
  status      PopStatus @default(ATIVO)
  version     Int       @default(1)
  content     String    @db.Text  // HTML do Tiptap
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt   DateTime? @db.Timestamptz(3)
}

enum PopStatus {
  ATIVO
  REVISAO
  ARQUIVADO
}
```

## Referências

- [CHANGELOG - 2025-12-11](../../CHANGELOG.md#2025-12-11---categorias-editáveis-com-autocomplete-para-pops)
- [CHANGELOG - 2025-11-10](../../CHANGELOG.md#2025-11-10---módulo-de-pops)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
