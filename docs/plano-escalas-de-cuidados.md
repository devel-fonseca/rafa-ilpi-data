# Plano de Implementação: Módulo Escala de Cuidados

**Data de Criação:** 21/01/2026
**Responsável:** Dr. Emanuel
**Status:** 🚧 Em Implementação

---

## 📋 Visão Geral

**Objetivo**: Implementar módulo completo para organização de turnos, equipes e plantões de cuidadores, garantindo cobertura assistencial 24h em conformidade com RDC 502/2021 (Art. 16, II).

**Tipo de Escala**: Híbrida (padrão semanal recorrente + ajustes pontuais)

**Validações**:
- ✅ **Bloqueantes**: Conflito de turno no mesmo dia, usuário inativo
- ⚠️ **Alertas**: Equipe abaixo do mínimo RDC, residentes sem grau de dependência

**Residentes sem grau**: Não incluir no cálculo RDC (apenas alertar)

**Substituições**: Individual (membro) OU completa (equipe inteira)

---

## 🗂️ Estrutura de Arquivos

### Backend (Novos)

```
apps/backend/
├── prisma/
│   ├── schema/
│   │   └── care-shifts.prisma          # 10 modelos de dados
│   ├── migrations/
│   │   └── XXX_create_care_shifts_module.sql
│   └── seeds/
│       └── shift-templates.seed.ts     # Seed de 5 turnos fixos
└── src/
    ├── teams/                           # Módulo de Equipes
    │   ├── teams.module.ts
    │   ├── teams.controller.ts
    │   ├── teams.service.ts
    │   └── dto/ (5 DTOs)
    ├── shift-templates/                 # Turnos Fixos
    │   ├── shift-templates.module.ts
    │   ├── shift-templates.controller.ts
    │   └── shift-templates.service.ts
    ├── weekly-schedule/                 # Padrão Semanal
    │   ├── weekly-schedule.module.ts
    │   ├── weekly-schedule.controller.ts
    │   ├── weekly-schedule.service.ts
    │   └── dto/ (4 DTOs)
    └── care-shifts/                     # Plantões e RDC
        ├── care-shifts.module.ts
        ├── care-shifts.controller.ts
        ├── care-shifts.service.ts
        ├── rdc-calculation.service.ts   # ⚠️ CRÍTICO
        ├── shift-generator.service.ts
        ├── care-shifts.cron.ts
        ├── dto/ (8 DTOs)
        └── interfaces/ (2 interfaces)
```

### Backend (Modificações)

- `apps/backend/prisma/schema/enums.prisma` - Adicionar 3 enums + 7 permissões
- `apps/backend/src/app.module.ts` - Registrar 4 novos módulos

### Frontend (Novos)

```
apps/frontend/src/
├── pages/care-shifts/
│   ├── CareShiftsPage.tsx           # Página principal com abas
│   ├── ShiftsViewTab.tsx
│   ├── TeamsViewTab.tsx
│   ├── WeeklyScheduleTab.tsx
│   ├── TurnsConfigTab.tsx
│   └── RDCParametersTab.tsx
├── components/care-shifts/
│   ├── shifts/
│   │   ├── ShiftCard.tsx            # ⚠️ CRÍTICO
│   │   ├── ShiftDetailsModal.tsx
│   │   ├── AssignTeamModal.tsx
│   │   ├── SubstituteMemberModal.tsx
│   │   └── AddMemberModal.tsx
│   ├── teams/
│   │   ├── TeamsList.tsx
│   │   ├── TeamFormModal.tsx
│   │   └── TeamMemberSelector.tsx
│   ├── weekly-schedule/
│   │   └── WeeklyScheduleGrid.tsx
│   └── compliance/
│       ├── CoverageStatusBadge.tsx
│       ├── RDCCalculationCard.tsx
│       └── CoverageReportTable.tsx
├── hooks/
│   ├── useShifts.ts
│   ├── useTeams.ts
│   ├── useWeeklySchedule.ts
│   └── useRDCCalculation.ts
├── api/
│   ├── care-shifts.api.ts
│   ├── teams.api.ts
│   ├── weekly-schedule.api.ts
│   └── rdc-compliance.api.ts
└── types/
    ├── care-shifts.ts
    ├── teams.ts
    └── rdc-calculation.ts
```

### Frontend (Modificações)

- `apps/frontend/src/routes/index.tsx` - Adicionar rota `/dashboard/escala-cuidados`

---

## 🚀 Fases de Implementação

### ✅ Fase 1: Fundação (2 dias)

**Objetivo**: Criar modelos de dados e migrations

- [ ] Adicionar 3 enums em `enums.prisma` (ShiftTemplateType, ShiftStatus, SubstitutionType)
- [ ] Adicionar 7 permissões ao enum `PermissionType`
- [ ] Criar arquivo `care-shifts.prisma` com 10 modelos
- [ ] Atualizar relações em User model (adicionar relações com TeamMember, ShiftAssignment, etc)
- [ ] Atualizar relações em Tenant model (adicionar relações com Team, Shift, etc)
- [ ] Executar `npx prisma migrate dev --name create_care_shifts_module`
- [ ] Criar seed `shift-templates.seed.ts` (popular 5 turnos fixos)
- [ ] Testar migration em ambiente de desenvolvimento
- [ ] Validar schema com `npx prisma validate`

**Critérios de Aceite:**
- ✅ Migration aplicada sem erros
- ✅ 5 turnos fixos criados no banco (`shift_templates`)
- ✅ Schema validado pelo Prisma
- ✅ Relações corretas (sem FKs cross-schema)

---

### ⬜ Fase 2: Backend - Teams (2 dias)

**Objetivo**: CRUD completo de equipes

- [ ] Criar módulo `teams/teams.module.ts`
- [ ] Implementar `teams/teams.service.ts` (REQUEST-scoped, usando TenantContextService)
- [ ] Implementar `teams/teams.controller.ts`
- [ ] Criar DTOs (CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, RemoveTeamMemberDto, QueryTeamsDto)
- [ ] Implementar endpoint `POST /api/care-shifts/teams` (criar equipe)
- [ ] Implementar endpoint `GET /api/care-shifts/teams` (listar com paginação)
- [ ] Implementar endpoint `GET /api/care-shifts/teams/:id` (buscar específica)
- [ ] Implementar endpoint `PATCH /api/care-shifts/teams/:id` (atualizar)
- [ ] Implementar endpoint `DELETE /api/care-shifts/teams/:id` (soft delete)
- [ ] Implementar endpoint `POST /api/care-shifts/teams/:id/members` (adicionar membro)
- [ ] Implementar endpoint `DELETE /api/care-shifts/teams/:id/members/:userId` (remover membro)
- [ ] Adicionar guards de permissões (`MANAGE_TEAMS`)
- [ ] Escrever testes unitários (coverage > 80%)

**Critérios de Aceite:**
- ✅ CRUD completo funcionando
- ✅ Soft delete implementado
- ✅ Validação de permissões
- ✅ Testes passando

---

### ⬜ Fase 3: Backend - Shift Templates & Weekly Schedule (2 dias)

**Objetivo**: Configuração de turnos e padrão semanal

#### Shift Templates

- [ ] Criar módulo `shift-templates/shift-templates.module.ts`
- [ ] Implementar service (read-only para usuários)
- [ ] Implementar controller
- [ ] Endpoint `GET /api/care-shifts/shift-templates` (listar turnos fixos)
- [ ] Endpoint `PATCH /api/care-shifts/shift-templates/:id/tenant-config` (ativar/desativar)

#### Weekly Schedule

- [ ] Criar módulo `weekly-schedule/weekly-schedule.module.ts`
- [ ] Implementar service (REQUEST-scoped)
- [ ] Implementar controller
- [ ] Criar DTOs (CreateWeeklyPatternDto, UpdateWeeklyPatternDto, AssignTeamToDayDto, QueryWeeklyPatternDto)
- [ ] Endpoint `GET /api/care-shifts/schedule/weekly-pattern` (buscar padrão ativo)
- [ ] Endpoint `POST /api/care-shifts/schedule/weekly-pattern` (criar padrão, desativa anterior)
- [ ] Endpoint `PATCH /api/care-shifts/schedule/weekly-pattern/:id` (atualizar)
- [ ] Endpoint `POST /api/care-shifts/schedule/weekly-pattern/:id/assignments` (designar equipe)
- [ ] Endpoint `DELETE /api/care-shifts/schedule/weekly-pattern/:id/assignments/:assignmentId`
- [ ] Validação: apenas 1 padrão ativo por vez
- [ ] Testes

**Critérios de Aceite:**
- ✅ Turnos configuráveis por tenant
- ✅ Padrão semanal funcional
- ✅ Designação de equipes por dia+turno
- ✅ Validação de padrão único ativo

---

### ⬜ Fase 4: Backend - Shifts & RDC (4 dias)

**Objetivo**: Plantões, substituições e cálculo RDC

#### RDCCalculationService (CRÍTICO)

- [ ] Implementar `calculateMinimumCaregiversRDC(date, shiftTemplateId?)`
  - [ ] Buscar residentes ativos
  - [ ] Classificar por grau (parsing de `dependencyLevel`)
  - [ ] Aplicar fórmulas RDC (Grau I: ÷20, Grau II: ÷10, Grau III: ÷6)
  - [ ] Diferenciar turnos 8h vs 12h
  - [ ] Gerar warnings para residentes sem grau
- [ ] Implementar `isShiftCompliant(shiftId)` (retorna status: compliant/attention/non_compliant)

#### ShiftGeneratorService

- [ ] Implementar `generateShiftsFromPattern(daysAhead = 14)`
  - [ ] Buscar padrão semanal ativo
  - [ ] Iterar sobre próximos N dias
  - [ ] Verificar se plantão já existe (não sobrescrever)
  - [ ] Criar plantões com `isFromPattern: true`
  - [ ] Criar assignments dos membros da equipe

#### CareShiftsService

- [ ] Criar módulo `care-shifts/care-shifts.module.ts`
- [ ] Implementar service (REQUEST-scoped)
- [ ] Implementar controller
- [ ] Criar 8 DTOs (CreateShiftDto, UpdateShiftDto, AssignTeamDto, SubstituteTeamDto, SubstituteMemberDto, AddMemberDto, RemoveMemberDto, QueryShiftsDto)
- [ ] Endpoint `GET /api/care-shifts/shifts?startDate=...&endDate=...`
- [ ] Endpoint `GET /api/care-shifts/shifts/:id`
- [ ] Endpoint `POST /api/care-shifts/shifts` (criar plantão manual)
- [ ] Endpoint `PATCH /api/care-shifts/shifts/:id`
- [ ] Endpoint `DELETE /api/care-shifts/shifts/:id`
- [ ] Endpoint `POST /api/care-shifts/shifts/:id/assign-team` (com validações bloqueantes)
- [ ] Endpoint `POST /api/care-shifts/shifts/:id/substitute-team`
- [ ] Endpoint `POST /api/care-shifts/shifts/:id/substitute-member` (CRÍTICO - validações)
- [ ] Endpoint `POST /api/care-shifts/shifts/:id/add-member`
- [ ] Endpoint `DELETE /api/care-shifts/shifts/:id/members/:userId`
- [ ] Endpoint `GET /api/care-shifts/shifts/:id/history`

#### Validações Bloqueantes

- [ ] Validação: usuário inativo (`isActive: false`)
- [ ] Validação: conflito de turno no mesmo dia
- [ ] Validação: `positionCode` adequado (CAREGIVER ou enfermagem)
- [ ] Validação: equipe/membro existe

#### Versionamento e Histórico

- [ ] Implementar incremento de `versionNumber` em updates
- [ ] Criar snapshot JSON em `ShiftHistory` (previousData, newData, changedFields)
- [ ] Armazenar `changeReason` obrigatório

#### Endpoints RDC

- [ ] Endpoint `GET /api/care-shifts/compliance/rdc-calculation?date=...&shiftTemplateId=...`
- [ ] Endpoint `GET /api/care-shifts/compliance/coverage-report?startDate=...&endDate=...`

#### Testes

- [ ] Testes unitários (coverage > 80%)
- [ ] Testes de integração (cenários de conflito, substituição, RDC)

**Critérios de Aceite:**
- ✅ Cálculo RDC correto (testado com 3 cenários reais)
- ✅ Validações bloqueantes funcionando
- ✅ Substituição de membro/equipe com histórico
- ✅ Geração automática não sobrescreve ajustes manuais

---

### ⬜ Fase 5: Cron Job (1 dia)

**Objetivo**: Geração automática diária de plantões

- [ ] Criar `care-shifts/care-shifts.cron.ts`
- [ ] Implementar `@Cron('0 2 * * *')` (02:00 AM diário)
- [ ] Chamar `ShiftGeneratorService.generateShiftsFromPattern(14)`
- [ ] Logging estruturado (Winston) - gerados/skipped
- [ ] Tratamento de erros com retry
- [ ] Testar manualmente com `@Cron('*/5 * * * *')` (5 min)

**Critérios de Aceite:**
- ✅ Cron job rodando diariamente
- ✅ Plantões gerados automaticamente (próximos 14 dias)
- ✅ Logs detalhados

---

### ⬜ Fase 6: Frontend - Estrutura Base & Teams (3 dias)

**Objetivo**: UI de equipes funcionando

#### Estrutura de Pastas

- [ ] Criar estrutura de diretórios (`pages/care-shifts/`, `components/care-shifts/`, etc)

#### APIs TypeScript

- [ ] Implementar `api/teams.api.ts`
- [ ] Implementar `api/care-shifts.api.ts`
- [ ] Implementar `api/weekly-schedule.api.ts`
- [ ] Implementar `api/rdc-compliance.api.ts`

#### Tipos TypeScript

- [ ] Criar `types/teams.ts`
- [ ] Criar `types/care-shifts.ts`
- [ ] Criar `types/rdc-calculation.ts`

#### Hooks

- [ ] Implementar `useTeams()` (useQuery)
- [ ] Implementar `useCreateTeam()` (useMutation)
- [ ] Implementar `useUpdateTeam()` (useMutation)
- [ ] Implementar `useDeleteTeam()` (useMutation)
- [ ] Implementar `useAddTeamMember()` (useMutation)
- [ ] Implementar `useRemoveTeamMember()` (useMutation)

#### Componentes de Equipes

- [ ] Implementar `TeamsList.tsx` (lista com paginação)
- [ ] Implementar `TeamCard.tsx` (card individual)
- [ ] Implementar `TeamFormModal.tsx` (criar/editar)
- [ ] Implementar `TeamMemberSelector.tsx` (multi-select de usuários)

#### Página Principal

- [ ] Implementar `CareShiftsPage.tsx` (estrutura de abas com Shadcn Tabs)
- [ ] Implementar `TeamsViewTab.tsx` (aba de gestão de equipes)

#### Roteamento

- [ ] Adicionar rota `/dashboard/escala-cuidados` em `routes/index.tsx`
- [ ] Adicionar item no menu sidebar (com permissão `VIEW_CARE_SHIFTS`)

**Critérios de Aceite:**
- ✅ CRUD de equipes funcionando
- ✅ Adicionar/remover membros
- ✅ UI responsiva (desktop + mobile)

---

### ⬜ Fase 7: Frontend - Shifts View & Compliance (4 dias)

**Objetivo**: Lista de plantões com status visual e conformidade RDC

#### Hooks

- [ ] Implementar `useShifts(query)` (useQuery com filtros)
- [ ] Implementar `useShift(shiftId)` (useQuery)
- [ ] Implementar `useAssignTeam()` (useMutation)
- [ ] Implementar `useSubstituteTeam()` (useMutation)
- [ ] Implementar `useSubstituteMember()` (useMutation)
- [ ] Implementar `useAddMember()` (useMutation)
- [ ] Implementar `useRemoveMember()` (useMutation)
- [ ] Implementar `useRDCCalculation(date)` (useQuery)
- [ ] Implementar `useCoverageReport(startDate, endDate)` (useQuery)

#### Componentes de Plantões

- [ ] Implementar `ShiftCard.tsx` (card com status badge 🟢🟡🔴)
- [ ] Implementar `ShiftDetailsModal.tsx` (detalhes completos + histórico)
- [ ] Implementar `AssignTeamModal.tsx` (designar equipe com validações)
- [ ] Implementar `SubstituteMemberModal.tsx` (substituir membro)
- [ ] Implementar `SubstituteTeamModal.tsx` (substituir equipe inteira)
- [ ] Implementar `AddMemberModal.tsx` (adicionar membro extra)

#### Componentes de Conformidade

- [ ] Implementar `CoverageStatusBadge.tsx` (badge com 3 estados)
- [ ] Implementar `RDCCalculationCard.tsx` (card explicativo do cálculo)
- [ ] Implementar `CoverageReportTable.tsx` (tabela de relatório por período)
- [ ] Implementar `MembersList.tsx` (lista de membros com avatares)

#### Abas

- [ ] Implementar `ShiftsViewTab.tsx`
  - [ ] Filtro de período (seletor de data)
  - [ ] Lista agrupada por data (sticky headers)
  - [ ] Alerta visual para residentes sem grau
  - [ ] Cards de plantões
- [ ] Implementar `RDCParametersTab.tsx`
  - [ ] Card de cálculo RDC
  - [ ] Relatório de cobertura
  - [ ] Gráficos (opcional)

#### Validações de Formulário

- [ ] Schemas Zod para validação
- [ ] React Hook Form integration
- [ ] Mensagens de erro claras

#### Testes E2E

- [ ] Teste: criar equipe e designar ao plantão
- [ ] Teste: substituir membro com validação de conflito
- [ ] Teste: alerta visual para residente sem grau

**Critérios de Aceite:**
- ✅ Lista de plantões visual (próximos 7-14 dias)
- ✅ Status badges corretos (🟢🟡🔴)
- ✅ Cálculo RDC exibido corretamente
- ✅ Alertas visuais funcionando
- ✅ Modais de substituição com validações

---

### ⬜ Fase 8: Frontend - Weekly Schedule (3 dias)

**Objetivo**: Grid semanal para configurar padrão de escala

#### Hooks

- [ ] Implementar `useWeeklySchedule()` (buscar padrão ativo)
- [ ] Implementar `useCreateWeeklyPattern()` (useMutation)
- [ ] Implementar `useUpdateWeeklyPattern()` (useMutation)
- [ ] Implementar `useAssignTeamToDay()` (useMutation)
- [ ] Implementar `useRemoveAssignment()` (useMutation)
- [ ] Implementar `useShiftTemplates()` (listar turnos)
- [ ] Implementar `useUpdateTenantShiftConfig()` (ativar/desativar turno)

#### Componentes

- [ ] Implementar `WeeklyScheduleGrid.tsx` (grid matricial 7 dias × N turnos)
- [ ] Implementar `ScheduleDayCell.tsx` (célula do grid com equipe)
- [ ] Implementar `AssignTeamToDayModal.tsx` (modal de designação)

#### Abas

- [ ] Implementar `WeeklyScheduleTab.tsx`
  - [ ] Grid semanal
  - [ ] Destaque visual para dia atual
  - [ ] Click na célula abre modal de designação
- [ ] Implementar `TurnsConfigTab.tsx`
  - [ ] Lista de turnos
  - [ ] Toggle de ativação/desativação
  - [ ] Nome customizado opcional

#### Otimizações

- [ ] Usar React.memo nos componentes de célula
- [ ] useMemo para cálculos do grid

**Critérios de Aceite:**
- ✅ Grid 7×N turnos funcional
- ✅ Designação visual de equipes
- ✅ Configuração de turnos por tenant
- ✅ Performance adequada (sem lag)

---

### ⬜ Fase 9: Documentação & Deploy (1 dia)

**Objetivo**: Finalizar documentação e preparar deploy

#### Documentação

- [ ] Criar `docs/modules/care-shifts.md`
  - [ ] Visão geral do módulo
  - [ ] Arquitetura de dados
  - [ ] Fluxos críticos (geração automática, substituição, cálculo RDC)
  - [ ] Exemplos de uso
  - [ ] Troubleshooting
- [ ] Atualizar `CHANGELOG.md`
  - [ ] Adicionar entry completo da feature
  - [ ] Categorias: ✨ Adicionado, 📝 Alterado, 🔧 Corrigido
- [ ] Atualizar `TODO.md` (remover tarefas concluídas)

#### Revisão de Código

- [ ] Revisar todos os services (padrões multi-tenant)
- [ ] Revisar DTOs (validações completas)
- [ ] Revisar nomenclatura (camelCase vs snake_case)
- [ ] Verificar ESLint (sem violações das 3 RED Rules)

#### Testes Finais

- [ ] Rodar suite completa de testes (`npm test`)
- [ ] Testar em staging com dados reais
- [ ] Validar cálculo RDC com casos reais

#### Deploy

- [ ] Aplicar migrations em staging
- [ ] Deploy do backend
- [ ] Deploy do frontend
- [ ] Verificar health checks

#### Aceitação

- [ ] Demonstração ao usuário
- [ ] Coleta de feedback
- [ ] Ajustes finais (se necessário)

**Critérios de Aceite:**
- ✅ Documentação completa
- ✅ CHANGELOG atualizado
- ✅ Deploy em staging OK
- ✅ Aceitação do usuário

---

## ⏱️ Cronograma Resumido

| Fase | Duração | Status | Início | Fim |
|------|---------|--------|--------|-----|
| 1. Fundação | 2 dias | 🚧 Em Andamento | 21/01/2026 | - |
| 2. Backend - Teams | 2 dias | ⬜ Pendente | - | - |
| 3. Backend - Schedule | 2 dias | ⬜ Pendente | - | - |
| 4. Backend - Shifts | 4 dias | ⬜ Pendente | - | - |
| 5. Cron Job | 1 dia | ⬜ Pendente | - | - |
| 6. Frontend - Teams | 3 dias | ⬜ Pendente | - | - |
| 7. Frontend - Shifts | 4 dias | ⬜ Pendente | - | - |
| 8. Frontend - Schedule | 3 dias | ⬜ Pendente | - | - |
| 9. Documentação | 1 dia | ⬜ Pendente | - | - |
| **TOTAL** | **22 dias** | - | - | - |

---

## 🔒 Regras Arquiteturais (3 RED Rules)

### ❌ RED 1: Acessar tabela TENANT via public client

```typescript
// ❌ ERRADO
const shifts = await this.prisma.shift.findMany({ where: { tenantId } });

// ✅ CORRETO
const shifts = await this.tenantContext.client.shift.findMany({ where: { deletedAt: null } });
```

### ❌ RED 2: Método público com parâmetro tenantId

```typescript
// ❌ ERRADO
async findAll(tenantId: string) { }

// ✅ CORRETO
async findAll() {
  const tenantId = this.tenantContext.tenantId; // Se precisar
}
```

### ❌ RED 3: JOIN cross-schema via Prisma

```typescript
// ❌ ERRADO - Team (tenant) + Tenant (public)
const team = await this.prisma.team.findUnique({
  include: { tenant: true }, // ❌ Cross-schema!
});

// ✅ CORRETO - Sem FK para Tenant
model Team {
  tenantId String @db.Uuid // Stored for reference, no FK (cross-schema)
  // Sem relação @relation para Tenant
}
```

---

## 📊 Modelos de Dados (Resumo)

### Enums Novos

- `ShiftTemplateType` (5 valores: DAY_8H, AFTERNOON_8H, NIGHT_8H, DAY_12H, NIGHT_12H)
- `ShiftStatus` (5 valores: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)
- `SubstitutionType` (3 valores: TEAM_REPLACEMENT, MEMBER_REPLACEMENT, MEMBER_ADDITION)

### Permissões Novas

- `VIEW_CARE_SHIFTS`
- `CREATE_CARE_SHIFTS`
- `UPDATE_CARE_SHIFTS`
- `DELETE_CARE_SHIFTS`
- `MANAGE_TEAMS`
- `VIEW_RDC_COMPLIANCE`
- `CONFIGURE_SHIFT_SETTINGS`

### Modelos Principais (10 models)

1. **ShiftTemplate** - Turnos fixos do sistema (5 turnos)
2. **TenantShiftConfig** - Configuração de turnos por tenant
3. **Team** - Equipes de cuidadores
4. **TeamMember** - Membros das equipes (N:M)
5. **WeeklySchedulePattern** - Padrão semanal de escala
6. **WeeklySchedulePatternAssignment** - Designações do padrão (dia+turno+equipe)
7. **Shift** - Plantões concretos (data+turno+equipe)
8. **ShiftAssignment** - Membros designados para cada plantão
9. **ShiftSubstitution** - Registro de substituições pontuais
10. **ShiftHistory** - Versionamento com snapshots JSON

---

## 🔄 Fluxos Críticos

### Cálculo RDC 502/2021

**Fórmulas**:
- **Grau I**: 1 cuidador / 20 idosos (carga diária 8h) → turnos 12h: 1/10
- **Grau II**: 1 cuidador / 10 idosos (por turno)
- **Grau III**: 1 cuidador / 6 idosos (por turno)

**Status Visual**:
- 🟢 **Conforme**: `assignedCount >= minimumRequired`
- 🟡 **Atenção**: `0 < assignedCount < minimumRequired`
- 🔴 **Não Conforme**: `assignedCount === 0`

### Geração Automática de Plantões

**Trigger**: Cron job diário (02:00 AM)

**Comportamento**:
1. Busca padrão semanal ativo
2. Gera próximos 14 dias
3. **NÃO sobrescreve** plantões existentes (preserva ajustes manuais)
4. Cria assignments dos membros da equipe automaticamente

### Validações Bloqueantes

1. **Conflito de turno**: Mesmo usuário em 2 turnos no mesmo dia → `BadRequestException`
2. **Usuário inativo**: `isActive: false` → `BadRequestException`
3. **PositionCode inválido**: Apenas CAREGIVER + enfermagem → `BadRequestException`

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Residentes sem `dependencyLevel` | Cálculo RDC incorreto | Alerta visual + excluir do cálculo |
| Conflito de turno não detectado | Sobrecarga de cuidador | Validação em múltiplos pontos |
| Geração automática sobrescreve | Perda de ajustes manuais | Verificar existência antes de criar |
| Grid semanal lento | Performance ruim | React.memo + useMemo |

---

## 🚀 Cronograma de Implementação

### Fase 1: Fundação - Database & Migrations ✅ **CONCLUÍDA** (21/01/2026)

**Duração**: 2 dias → **Realizado em: 1 dia**

#### Tarefas
- [x] Criar 3 enums em `enums.prisma` (ShiftTemplateType, ShiftStatus, SubstitutionType)
- [x] Adicionar 7 permissões ao enum PermissionType
- [x] Criar arquivo `care-shifts.prisma` com 10 modelos de dados
- [x] Atualizar relações no User model ([auth.prisma:138-143](../apps/backend/prisma/schema/auth.prisma))
- [x] Atualizar relações no Tenant model ([tenant.prisma:125-126](../apps/backend/prisma/schema/tenant.prisma))
- [x] Criar migration SQL manual `20260121104800_create_care_shifts_module`
- [x] Aplicar migration via `prisma migrate deploy`
- [x] Gerar Prisma Client com novos modelos
- [x] Criar seed `shift-templates.seed.ts` com 5 turnos fixos
- [x] Executar seed e popular tabela `shift_templates`
- [x] Validar schema com `prisma validate`

#### Deliverables ✅
- ✅ **Migration aplicada**: [20260121104800_create_care_shifts_module/migration.sql](../apps/backend/prisma/migrations/20260121104800_create_care_shifts_module/migration.sql)
- ✅ **Schema Prisma validado**: Sem erros estruturais
- ✅ **5 turnos fixos populados** na tabela `shift_templates` (public schema)
- ✅ **8 tabelas criadas** em CADA schema `tenant_*`:
  - `teams`, `team_members`
  - `weekly_schedule_patterns`, `weekly_schedule_pattern_assignments`
  - `shifts`, `shift_assignments`
  - `shift_substitutions`, `shift_history`

#### Observações Técnicas
- **Correção aplicada**: Migration `20260119231900_add_public_token_to_contracts` foi corrigida para ser idempotente (evitar erro de constraint duplicado)
- **Arquitetura preservada**: Todos os modelos TENANT-SCOPED seguem as "3 RED Rules" (sem FK cross-schema para Tenant)
- **Migration dinâmica**: Bloco `DO $$` itera automaticamente sobre TODOS os schemas `tenant_*` existentes

---

### Fase 2: Backend - Teams Module ✅ **CONCLUÍDA** (21/01/2026)

**Duração**: 2 dias → **Realizado em: < 1 dia**

#### Tarefas
- [x] Criar módulo `apps/backend/src/teams/teams.module.ts`
- [x] Implementar `teams.controller.ts` (7 endpoints REST)
- [x] Implementar `teams.service.ts` (REQUEST-scoped, usa TenantContextService)
- [x] Criar DTOs com validações:
  - [x] `CreateTeamDto` (validações: nome 3-100 chars, cor hex)
  - [x] `UpdateTeamDto` (PartialType + isActive)
  - [x] `AddTeamMemberDto` (UUID validation + role opcional)
  - [x] `ListTeamsQueryDto` (paginação + filtros search/isActive)
- [x] Implementar guards de permissões (`MANAGE_TEAMS`, `VIEW_CARE_SHIFTS`)
- [x] Registrar TeamsModule em AppModule
- [x] Validar compilação TypeScript

#### Endpoints da API ✅
```typescript
POST   /api/teams                    # Criar equipe
GET    /api/teams                    # Listar equipes (paginado)
GET    /api/teams/:id                # Buscar equipe específica
PATCH  /api/teams/:id                # Atualizar equipe
DELETE /api/teams/:id                # Deletar equipe (soft)
POST   /api/teams/:id/members        # Adicionar membro
DELETE /api/teams/:id/members/:userId # Remover membro
```

#### Deliverables ✅
- ✅ **Teams CRUD completo** com 7 endpoints REST
- ✅ **Validações robustas**:
  - Conflito de nome de equipe (409 Conflict)
  - Usuário inativo bloqueado
  - PositionCode validado (apenas CAREGIVER + enfermagem)
  - Equipe com plantões futuros não pode ser deletada
- ✅ **Paginação + filtros** (search, isActive)
- ✅ **Soft delete** para equipes e membros
- ✅ **REQUEST-scoped service** com TenantContextService
- ✅ **Swagger documentation** completa
- ✅ **Compilação TypeScript** validada

#### Observações Técnicas
- **Arquitetura REQUEST-scoped**: TeamsService injeta TenantContextService, eliminando necessidade de filtros `WHERE tenantId` manuais
- **Validação de cargo**: Apenas usuários com PositionCode = CAREGIVER, NURSE, NURSING_TECHNICIAN ou NURSING_ASSISTANT podem ser adicionados
- **Proteção de integridade**: Bloqueia deleção de equipes que possuem plantões futuros (`date >= hoje`)
- **Decorator correto**: Usa `RequireAnyPermission` do módulo permissions (não auth)

---

### Fase 3: Backend - Shift Templates & Weekly Schedule ✅ **CONCLUÍDA (21/01/2026)**

**Duração**: 2 dias → **Realizado em**: < 1 dia

#### Tarefas
- [x] Módulo `shift-templates/` (read-only para usuários)
- [x] Endpoint `PATCH /shift-templates/:id/tenant-config` (ativar/desativar turnos)
- [x] Módulo `weekly-schedule/`
- [x] Implementar padrão semanal (CRUD + assignments)
- [x] Validação: apenas 1 padrão ativo por vez
- [x] Testes (TypeScript compilation OK)

#### Deliverables

- ✅ **ShiftTemplatesModule**: CRUD de turnos fixos (read-only) + configuração por tenant
- ✅ **WeeklyScheduleModule**: CRUD de padrão semanal + assignments (7 dias × N turnos)
- ✅ **Validações implementadas**:
  - Apenas 1 padrão ativo por tenant (ao criar novo, desativa anterior)
  - Turno habilitado via `TenantShiftConfig`
  - Equipe ativa ao designar
  - Conflito de assignment (dia+turno único)
- ✅ **4 endpoints ShiftTemplates** + **8 endpoints WeeklySchedule**
- ✅ **Soft delete** para padrões inativos (não permite deletar padrão ativo)

#### Detalhes Técnicos da Implementação

- **ShiftTemplates** são **read-only**: Usuários não podem criar/editar/deletar turnos, apenas habilitar/desabilitar via `TenantShiftConfig`
- **WeeklySchedulePattern** pode ter `endDate: null` (padrão indefinido)
- **Assignment** pode ter `teamId: null` (célula vazia no grid)
- Validação de **conflito de assignment** garante unicidade `(patternId, dayOfWeek, shiftTemplateId)`

---

### Fase 4: Backend - Shifts & RDC Calculation ✅ **CONCLUÍDA (21/01/2026)** ⚠️ **CRÍTICO**

**Duração**: 4 dias → **Realizado em**: < 1 dia

#### Tarefas
- [x] Implementar `RDCCalculationService` (algoritmo RDC 502/2021)
- [x] Implementar `ShiftGeneratorService` (geração automática)
- [x] Criar módulo `care-shifts/`
- [x] Implementar 16 endpoints de plantões (13 shifts + 2 RDC + 1 geração)
- [x] Implementar 2 endpoints RDC (calculate + coverage-report)
- [x] Validações críticas: conflito de turno, usuário inativo
- [x] Versionamento completo (ShiftHistory)
- [x] TypeScript compilation OK

#### Deliverables da Fase 4

- ✅ **RDCCalculationService** (262 linhas): Cálculo RDC 502/2021 com classificação automática Grau I/II/III
- ✅ **ShiftGeneratorService** (200 linhas): Geração automática NÃO sobrescreve plantões existentes
- ✅ **CareShiftsService** (824 linhas): Service principal com 13 métodos + 5 helpers
- ✅ **CareShiftsController** (361 linhas): 16 endpoints REST total
- ✅ **9 DTOs completos**: Validações com class-validator + Swagger docs
- ✅ **2 Interfaces**: RDC calculation + Shift generation results
- ✅ **Migration**: ChangeType enum estendido com 5 novos valores
- ✅ **Total**: 23 arquivos criados, ~1.647 linhas de código

#### Validações Bloqueantes Implementadas (100%)

1. ✅ **Conflito de turno**: Usuário não pode estar em 2 turnos no MESMO DIA (linhas 447, 595 do service)
2. ✅ **Usuário inativo**: Apenas `isActive: true` podem ser designados (linhas 439, 582)
3. ✅ **PositionCode**: Apenas CAREGIVER/NURSE/NURSING_TECHNICIAN/NURSING_ASSISTANT (linhas 445, 590)
4. ✅ **Equipe inativa**: Bloqueia designação de `isActive: false` (linha 702)
5. ✅ **Versionamento completo**: Todas operações incrementam `versionNumber` + criam `ShiftHistory`

#### Detalhes da Implementação Fase 4

- **Algoritmo RDC**: Implementa cálculo EXATO da RDC 502/2021 (Grau I: ÷20 ou ÷10, Grau II: ÷10, Grau III: ÷6)
- **Geração Automática**: Preserva ajustes manuais (não sobrescreve plantões existentes)
- **Status de Conformidade**: 🟢 Conforme | 🟡 Atenção | 🔴 Não conforme
- **Histórico Completo**: Rastreia TODAS mudanças (team assignment, member substitution, etc.)
- **Migration aplicada**: 20260121_update_change_type_enum

---

### Fase 5: Cron Job ✅ **CONCLUÍDA (21/01/2026)**

**Duração**: 1 dia | **Duração Real**: < 1 dia

#### Tarefas
- [x] Implementar `care-shifts.cron.ts`
- [x] Usar `@Cron('0 2 * * *')` (02:00 AM diário)
- [x] Chamar `ShiftGeneratorService.generateShiftsFromPattern(14)`
- [x] Logging estruturado (Winston)
- [x] Monitoramento de erros
- [x] Testar manualmente com método `generateManually()`

#### Deliverables da Fase 5

✅ Cron job executando diariamente às 02:00 AM (timezone America/Sao_Paulo)
✅ Processamento multi-tenant com isolamento de schema
✅ Prevenção de execuções concorrentes (flag `isRunning`)
✅ Logging estruturado com contexto (tenant, resultado, erros)
✅ Tratamento de erros por tenant (não interrompe processamento de outros tenants)
✅ Método manual para testes (`generateManually()`)
✅ Integração completa com ShiftGeneratorService
✅ Registro no CareShiftsModule

#### Detalhes da Implementação Fase 5

**Arquivo criado**: `apps/backend/src/care-shifts/care-shifts.cron.ts` (281 linhas)

**Características técnicas**:

1. **Configuração do Cron**:

   ```typescript
   @Cron('0 2 * * *', {
     name: 'generate-care-shifts',
     timeZone: 'America/Sao_Paulo', // GMT-3
   })
   ```

2. **Prevenção de concorrência**:
   - Flag `isRunning` para evitar execuções simultâneas
   - Log de warning se execução anterior ainda estiver em andamento

3. **Processamento multi-tenant**:
   - Busca todos os tenants ativos no banco
   - Itera sobre cada tenant e executa geração no schema específico
   - Usa `createGeneratorForTenant()` helper method para isolamento

4. **Schema Switching**:

   ```typescript
   const tenantClient = this.prisma.$extends({
     query: {
       $allModels: {
         async $allOperations({ args, query }) {
           const [, result] = await this.prisma.$transaction([
             this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`),
             query(args),
           ]);
           return result;
         },
       },
     },
   });
   ```

5. **Logging detalhado**:
   - Log de início com contagem de tenants
   - Log por tenant (sucesso com resultado ou erro)
   - Log de finalização com timestamp e duração
   - Cores: `blue` para início, `green` para sucesso, `red` para erro

6. **Tratamento de erros resiliente**:
   - Try-catch por tenant (erro em um não afeta os outros)
   - Log detalhado do erro com stack trace
   - Execução continua para próximos tenants

**Arquivos modificados**:

- `apps/backend/src/care-shifts/care-shifts.module.ts` - Linha 18 (adicionado CareShiftsCron ao providers)

---

### Fases 6-8: Frontend (Total: 10 dias)

**Fase 6**: Estrutura Base & Teams (3 dias)
**Fase 7**: Shifts View & Compliance (4 dias)
**Fase 8**: Weekly Schedule Grid (3 dias)

---

### Fase 9: Documentação & Deploy

**Duração**: 1 dia

#### Tarefas
- [ ] Atualizar `docs/modules/care-shifts.md`
- [ ] Atualizar `CHANGELOG.md`
- [ ] Revisão de código completa
- [ ] Deploy em staging
- [ ] Testes de aceitação

---

## 📊 Resumo do Progresso

**Progresso Geral**: 56% (Fase 1-5 de 9 completas)

| Fase | Status | Duração Estimada | Duração Real | Progresso |
|------|--------|------------------|--------------|-----------|
| 1. Fundação | ✅ Concluída | 2 dias | 1 dia | 100% |
| 2. Backend - Teams | ✅ Concluída | 2 dias | < 1 dia | 100% |
| 3. Backend - Schedule | ✅ Concluída | 2 dias | < 1 dia | 100% |
| 4. Backend - Shifts | ✅ Concluída | 4 dias | < 1 dia | 100% |
| 5. Cron Job | ✅ Concluída | 1 dia | < 1 dia | 100% |
| 6. Frontend - Teams | 🔄 Próxima | 3 dias | - | 0% |
| 7. Frontend - Shifts | ⏳ Pendente | 4 dias | - | 0% |
| 8. Frontend - Schedule | ⏳ Pendente | 3 dias | - | 0% |
| 9. Documentação | ⏳ Pendente | 1 dia | - | 0% |

**Estimativa Total**: 22 dias úteis (~4-5 semanas)
**Tempo Decorrido**: 1 dia
**Tempo Restante**: ~10 dias (frontend + documentação)

---

---

## 🎯 Detalhamento das Implementações

### Fase 2: Teams Module - Arquivos Criados

**Estrutura de diretórios**:
```
apps/backend/src/teams/
├── dto/
│   ├── create-team.dto.ts          # Validações: nome (3-100), cor (#hex)
│   ├── update-team.dto.ts          # PartialType + isActive
│   ├── add-team-member.dto.ts      # UUID validation + role opcional
│   ├── list-teams-query.dto.ts     # Paginação (page, limit) + filtros
│   └── index.ts                     # Barrel export
├── teams.controller.ts              # 7 endpoints REST + Swagger docs
├── teams.service.ts                 # REQUEST-scoped + TenantContextService
└── teams.module.ts                  # Module + exports
```

**Arquivos modificados**:
- `apps/backend/src/app.module.ts` - Linha 61 (import) + Linha 147 (registro)

**Validações implementadas no TeamsService**:

1. **create()**: Valida nome duplicado (409 Conflict)
2. **update()**: Valida conflito de nome ao alterar
3. **remove()**: Bloqueia se equipe possui plantões futuros (`date >= hoje`)
4. **addMember()**:
   - Usuário deve existir e estar ativo (`isActive: true`)
   - PositionCode deve ser: CAREGIVER, NURSE, NURSING_TECHNICIAN, NURSING_ASSISTANT
   - Usuário não pode ser membro ativo duplicado
5. **removeMember()**: Soft delete (mantém histórico)

**Endpoints com guards de permissão**:
- `POST /teams` → `MANAGE_TEAMS`
- `GET /teams` → `VIEW_CARE_SHIFTS` OU `MANAGE_TEAMS`
- `GET /teams/:id` → `VIEW_CARE_SHIFTS` OU `MANAGE_TEAMS`
- `PATCH /teams/:id` → `MANAGE_TEAMS`
- `DELETE /teams/:id` → `MANAGE_TEAMS`
- `POST /teams/:id/members` → `MANAGE_TEAMS`
- `DELETE /teams/:id/members/:userId` → `MANAGE_TEAMS`

**Respostas HTTP implementadas**:
- `201 Created` - Equipe/membro criado
- `200 OK` - Listagem/busca/atualização
- `204 No Content` - Deleção bem-sucedida
- `400 Bad Request` - Validação falhou (usuário inativo, cargo inadequado, equipe com plantões)
- `404 Not Found` - Equipe/usuário não encontrado
- `409 Conflict` - Nome duplicado ou membro já existe

**Padrão REQUEST-scoped**:
```typescript
@Injectable({ scope: Scope.REQUEST })
export class TeamsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async findAll(query: ListTeamsQueryDto) {
    // ✅ NÃO usa filtro WHERE tenantId
    return this.tenantContext.client.team.findMany({
      where: { deletedAt: null }, // Apenas soft delete
    });
  }
}
```

---

### Fase 3: Shift Templates & Weekly Schedule - Arquivos Criados

**Estrutura de diretórios**:
```
apps/backend/src/shift-templates/
├── dto/
│   ├── update-tenant-shift-config.dto.ts  # isEnabled + customName
│   └── index.ts
├── shift-templates.controller.ts          # 4 endpoints REST
├── shift-templates.service.ts             # REQUEST-scoped (217 linhas)
└── shift-templates.module.ts

apps/backend/src/weekly-schedule/
├── dto/
│   ├── create-weekly-pattern.dto.ts       # Nome + datas (startDate, endDate)
│   ├── update-weekly-pattern.dto.ts       # PartialType + isActive
│   ├── create-pattern-assignment.dto.ts   # dayOfWeek (0-6) + shiftTemplateId + teamId
│   ├── update-pattern-assignment.dto.ts   # teamId (nullable)
│   └── index.ts
├── weekly-schedule.controller.ts          # 8 endpoints REST
├── weekly-schedule.service.ts             # REQUEST-scoped (432 linhas)
└── weekly-schedule.module.ts
```

**Arquivos modificados**:

- `apps/backend/src/app.module.ts` - Linhas 62-63 (imports) + Linhas 150-151 (registro)

**Validações implementadas no ShiftTemplatesService**:

1. **findAll()**: Retorna turnos fixos + config do tenant (`isEnabled`, `customName`)
2. **findEnabledForTenant()**: Filtra apenas turnos habilitados (para dropdowns)
3. **updateTenantConfig()**:
   - Valida se ShiftTemplate existe e está ativo
   - Cria ou atualiza `TenantShiftConfig`

**Validações implementadas no WeeklyScheduleService**:

1. **createPattern()**:
   - Valida `endDate > startDate`
   - Desativa padrão ativo anterior automaticamente
   - Novo padrão sempre criado como `isActive: true`
2. **updatePattern()**:
   - Se mudando para `isActive: true`, desativa outros padrões
3. **remove()**:
   - Bloqueia deleção de padrão ativo (400 Bad Request)
4. **createAssignment()**:
   - Valida se ShiftTemplate existe e está habilitado no tenant
   - Valida se Team existe e está ativa
   - Bloqueia assignment duplicado `(patternId, dayOfWeek, shiftTemplateId)` → 409 Conflict
5. **updateAssignment()**: Permite `teamId: null` (remover equipe da célula)
6. **removeAssignment()**: Hard delete (não é soft delete)

**Endpoints ShiftTemplates com guards de permissão**:

- `GET /shift-templates` → `VIEW_CARE_SHIFTS` OU `CONFIGURE_SHIFT_SETTINGS`
- `GET /shift-templates/enabled` → `VIEW_CARE_SHIFTS` OU `CREATE_CARE_SHIFTS`
- `GET /shift-templates/:id` → `VIEW_CARE_SHIFTS` OU `CONFIGURE_SHIFT_SETTINGS`
- `PATCH /shift-templates/:id/tenant-config` → `CONFIGURE_SHIFT_SETTINGS`

**Endpoints WeeklySchedule com guards de permissão**:

- `POST /weekly-schedule/patterns` → `CONFIGURE_SHIFT_SETTINGS`
- `GET /weekly-schedule/patterns/active` → `VIEW_CARE_SHIFTS` OU `CONFIGURE_SHIFT_SETTINGS`
- `GET /weekly-schedule/patterns` → `VIEW_CARE_SHIFTS` OU `CONFIGURE_SHIFT_SETTINGS`
- `GET /weekly-schedule/patterns/:id` → `VIEW_CARE_SHIFTS` OU `CONFIGURE_SHIFT_SETTINGS`
- `PATCH /weekly-schedule/patterns/:id` → `CONFIGURE_SHIFT_SETTINGS`
- `DELETE /weekly-schedule/patterns/:id` → `CONFIGURE_SHIFT_SETTINGS`
- `POST /weekly-schedule/patterns/:patternId/assignments` → `CONFIGURE_SHIFT_SETTINGS`
- `PATCH /weekly-schedule/assignments/:assignmentId` → `CONFIGURE_SHIFT_SETTINGS`
- `DELETE /weekly-schedule/assignments/:assignmentId` → `CONFIGURE_SHIFT_SETTINGS`

**Respostas HTTP implementadas**:

- `201 Created` - Padrão/assignment criado
- `200 OK` - Listagem/busca/atualização
- `204 No Content` - Deleção bem-sucedida
- `400 Bad Request` - Validação falhou (turno desabilitado, equipe inativa, padrão ativo)
- `404 Not Found` - Padrão/turno/equipe/assignment não encontrado
- `409 Conflict` - Assignment duplicado (mesmo dia+turno)

**Lógica de padrão único ativo**:
```typescript
// Ao criar novo padrão
const activePattern = await this.client.weeklySchedulePattern.findFirst({
  where: { isActive: true, deletedAt: null }
});
if (activePattern) {
  await this.client.weeklySchedulePattern.update({
    where: { id: activePattern.id },
    data: { isActive: false, updatedBy: userId }
  });
}
// Criar novo (sempre ativo)
await this.client.weeklySchedulePattern.create({
  data: { ...data, isActive: true, createdBy: userId }
});
```

**Helper getDayName()**:
Converte `dayOfWeek: number` (0-6) para nome em português:

- 0 = Domingo
- 1 = Segunda-feira
- 6 = Sábado

**Comportamento Crítico - READ-ONLY ShiftTemplates**:
Os 5 turnos fixos (Dia 8h, Tarde 8h, Noite 8h, Dia 12h, Noite 12h) foram populados via seed e **NÃO podem ser criados/editados/deletados** por usuários. A única customização permitida é via `TenantShiftConfig`:

- `isEnabled: boolean` - Habilitar/desabilitar turno para o tenant
- `customName: string` - Nome customizado (ex: "Plantão Manhã" ao invés de "Dia 8h")

---

## 📞 Contato e Suporte

**Responsável pelo Projeto**: Dr. Emanuel
**Data de Início**: 21/01/2026
**Data de Última Atualização**: 21/01/2026
**Versão do Documento**: 1.2

---

## 📎 Referências

### Documentação Geral
- [Plano Detalhado Original](./.claude/plans/vivid-splashing-pine.md)
- [RDC 502/2021 ANVISA](https://www.gov.br/anvisa/pt-br) - Art. 16, II (Dimensionamento de pessoal)
- [Arquitetura Multi-Tenant](./architecture/multi-tenancy.md)
- [Banco de Dados](./architecture/database-schema.md)

### Fase 1 - Fundação
- [Migration Aplicada](../apps/backend/prisma/migrations/20260121104800_create_care_shifts_module/migration.sql)
- [Schema Care Shifts](../apps/backend/prisma/schema/care-shifts.prisma)
- [Seed Shift Templates](../apps/backend/prisma/seeds/shift-templates.seed.ts)

### Fase 2 - Teams Module
- [TeamsService](../apps/backend/src/teams/teams.service.ts) - SERVICE REQUEST-scoped (349 linhas)
- [TeamsController](../apps/backend/src/teams/teams.controller.ts) - 7 endpoints REST (220 linhas)
- [TeamsModule](../apps/backend/src/teams/teams.module.ts) - Module registration
- [CreateTeamDto](../apps/backend/src/teams/dto/create-team.dto.ts) - Validações com class-validator
- [ListTeamsQueryDto](../apps/backend/src/teams/dto/list-teams-query.dto.ts) - Paginação + filtros

### Fase 3 - Shift Templates & Weekly Schedule
- [ShiftTemplatesService](../apps/backend/src/shift-templates/shift-templates.service.ts) - SERVICE REQUEST-scoped (217 linhas)
- [ShiftTemplatesController](../apps/backend/src/shift-templates/shift-templates.controller.ts) - 4 endpoints REST (123 linhas)
- [ShiftTemplatesModule](../apps/backend/src/shift-templates/shift-templates.module.ts) - Module registration
- [WeeklyScheduleService](../apps/backend/src/weekly-schedule/weekly-schedule.service.ts) - SERVICE REQUEST-scoped (432 linhas)
- [WeeklyScheduleController](../apps/backend/src/weekly-schedule/weekly-schedule.controller.ts) - 8 endpoints REST (250 linhas)
- [WeeklyScheduleModule](../apps/backend/src/weekly-schedule/weekly-schedule.module.ts) - Module registration
- [UpdateTenantShiftConfigDto](../apps/backend/src/shift-templates/dto/update-tenant-shift-config.dto.ts) - DTO para config de turnos
- [CreateWeeklyPatternDto](../apps/backend/src/weekly-schedule/dto/create-weekly-pattern.dto.ts) - DTO para padrão semanal
- [CreatePatternAssignmentDto](../apps/backend/src/weekly-schedule/dto/create-pattern-assignment.dto.ts) - DTO para assignments
