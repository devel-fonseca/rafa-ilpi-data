# Padrão de Dados Clínicos Assistenciais (ILPI)

**Data:** 2026-02-17  
**Versão:** 1.0.0  
**Status:** Em implementação (Fase 1 entregue)

---

## Objetivo

Padronizar o registro de **Alergias**, **Condições Crônicas** e **Restrições Alimentares** para contexto assistencial de ILPI, com foco em:

- segurança clínica para o cuidado diário;
- preenchimento consistente pelo RT/equipe multiprofissional;
- trilha de auditoria e versionamento;
- conformidade com arquitetura multi-tenant e padrão de data/hora.

---

## Premissas Arquiteturais Obrigatórias

### 1) Multi-Tenancy (Schema Isolation)

Conforme:

- `docs/architecture/multi-tenancy.md`
- `docs/architecture/MULTI-TENANT-ISOLATION.md`
- `docs/architecture/MULTI-TENANT-VALIDATION.md`

Regras:

1. Entidades clínicas são **tenant-scoped** (schema do tenant).
2. Services usam `TenantContextService` (`this.tenantContext.client...`) para tabelas de tenant.
3. Não usar `this.prisma.<tenantModel>` em services de tenant.
4. Não fazer JOIN cross-schema via Prisma (`public` ↔ `tenant`).

### 2) Data/Hora

Conforme `docs/standards/DATETIME_STANDARD.md`:

1. Datas clínicas de referência devem usar **DATE** (data civil, sem fuso).
2. Auditoria e versionamento devem usar **TIMESTAMPTZ UTC**.
3. Não usar `new Date('YYYY-MM-DD')` para lógica de data civil.

---

## Domínios Clínicos Padronizados

### Alergias

Campos clínicos principais:

- `substance` (obrigatório)
- `severity` (opcional)
- `reaction` (opcional)
- `notes` (opcional)
- `contraindications` (opcional)

### Condições Crônicas

Campos clínicos principais:

- `condition` (obrigatório)
- `icdCode` (opcional)
- `notes` (opcional)
- `contraindications` (opcional)

### Restrições Alimentares

Campos clínicos principais:

- `restrictionType` (obrigatório)
- `description` (obrigatório)
- `notes` (opcional)
- `contraindications` (opcional)

---

## Auditoria e Versionamento

Para os três domínios:

- manter `versionNumber`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `deletedAt`;
- manter histórico com `changeReason`/`deleteReason`, `previousData`, `newData`, `changedFields`, `changedAt`, `changedBy`.

---

## Diretriz Assistencial ILPI

`contraindications` deve ser usado para orientação prática de cuidado, por exemplo:

- “Evitar dipirona e AINEs”; 
- “Evitar alimentos ultraprocessados e embutidos”; 
- “Evitar sedação sem avaliação médica prévia”.

Este campo **não altera automaticamente prescrição** nesta fase. Serve para sinalização clínica contextual no prontuário e telas assistenciais.

---

## Escopo de Implementação

### Fase 1 (entregue)

1. Inclusão de `contraindications` em:
   - `allergies`
   - `conditions`
   - `dietary_restrictions`
2. Atualização de DTOs backend (create/update).
3. Atualização de services backend (create/update/history snapshots).
4. Atualização de tipos e formulários frontend.
5. Exibição de contraindicações em Perfil Clínico e Sumário do Residente.

### Fase 2 (planejada)

1. Campos clínicos adicionais comuns (ex.: status clínico, data de identificação, revisão opcional).
2. Alertas assistenciais contextuais padronizados por risco.
3. Consolidação de indicadores clínicos em relatórios institucionais.

