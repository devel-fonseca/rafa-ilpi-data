# Módulo: Escala de Cuidados (Care Shifts)

**Versão:** 1.0.0
**Última atualização:** 21/01/2026
**Status:** ✅ Implementado

---

## 📋 Visão Geral

O módulo **Escala de Cuidados** (Care Shifts) gerencia turnos, equipes e plantões de cuidadores em Instituições de Longa Permanência para Idosos (ILPIs), garantindo cobertura assistencial 24 horas em conformidade com a **RDC 502/2021 (Art. 16, II)** da ANVISA.

### Funcionalidades Principais

1. **Gestão de Equipes** - Criação e gerenciamento de equipes de cuidadores
2. **Padrão Semanal Recorrente** - Configuração de escalas que se repetem semanalmente
3. **Plantões Individuais** - Visualização e ajustes de plantões específicos
4. **Cálculo Automático RDC** - Validação de conformidade com requisitos regulatórios
5. **Substituições e Ajustes** - Gestão flexível de trocas e adições de membros

### Conformidade Regulatória

O módulo implementa as exigências da **RDC 502/2021**, especificamente:

- **Art. 16, II**: Cobertura assistencial ininterrupta de 24 horas
- **Cálculo de Dimensionamento**: Proporção cuidador/residente por grau de dependência
  - **Grau I**: 1 cuidador para cada 20 residentes (carga diária, turnos 8h) ou 10 residentes (turnos 12h)
  - **Grau II**: 1 cuidador para cada 10 residentes
  - **Grau III**: 1 cuidador para cada 6 residentes

---

## 🏗️ Arquitetura

### Tipo de Escala: Híbrida

O sistema utiliza uma abordagem **híbrida**:

1. **Padrão Semanal Recorrente** (base)
   - Definido uma única vez
   - Repete-se automaticamente todas as semanas
   - Plantões gerados via cron job diário (02:00 AM)

2. **Ajustes Pontuais** (flexibilidade)
   - Substituição de membro individual
   - Substituição de equipe completa
   - Adição de membros extras
   - Não sobrescreve padrão semanal (preserva base)

### Modelos de Dados (10 models)

#### 1. **ShiftTemplate** (Public Schema - SHARED)
Turnos fixos do sistema (5 templates pré-definidos)

```prisma
model ShiftTemplate {
  id           String              @id @default(uuid())
  type         ShiftTemplateType   @unique
  name         String              // "Dia 8h", "Tarde 8h", etc.
  startTime    String              // "07:00"
  endTime      String              // "15:00"
  duration     Int                 // 8 ou 12 horas
  displayOrder Int
  isActive     Boolean
}
```

**Turnos Disponíveis:**
- Dia 8h (07:00-15:00)
- Tarde 8h (15:00-23:00)
- Noite 8h (23:00-07:00)
- Dia 12h (07:00-19:00)
- Noite 12h (19:00-07:00)

#### 2. **TenantShiftConfig** (Public Schema - SHARED)
Configuração de turnos por tenant (ativar/desativar, nome customizado)

```prisma
model TenantShiftConfig {
  id              String    @id
  tenantId        String
  shiftTemplateId String
  isEnabled       Boolean   @default(true)
  customName      String?   // Ex: "Plantão Diurno" ao invés de "Dia 8h"
}
```

#### 3. **Team** (Tenant Schema - ISOLATED)
Equipes de cuidadores

```prisma
model Team {
  id          String  @id
  tenantId    String
  name        String  // Ex: "Equipe A - Manhã"
  description String?
  isActive    Boolean @default(true)
  color       String? // Hex color para UI
}
```

#### 4. **TeamMember** (Tenant Schema - ISOLATED)
Membros das equipes (soft delete)

```prisma
model TeamMember {
  id       String @id
  teamId   String
  userId   String
  role     String? // Ex: "Líder", "Suplente"

  addedBy   String
  addedAt   DateTime
  removedBy String?
  removedAt DateTime? // Soft delete
}
```

#### 5. **WeeklySchedulePattern** (Tenant Schema - ISOLATED)
Padrão semanal recorrente (apenas 1 ativo por vez)

```prisma
model WeeklySchedulePattern {
  id          String    @id
  tenantId    String
  name        String    // "Padrão Semanal Padrão"
  description String?
  isActive    Boolean   @default(true)
  startDate   DateTime  @db.Date
  endDate     DateTime? @db.Date
}
```

#### 6. **WeeklySchedulePatternAssignment** (Tenant Schema - ISOLATED)
Designação de equipes no padrão semanal (matriz 7×N)

```prisma
model WeeklySchedulePatternAssignment {
  id              String @id
  patternId       String
  dayOfWeek       Int    // 0=Domingo, 1=Segunda, ..., 6=Sábado
  shiftTemplateId String
  teamId          String?

  @@unique([patternId, dayOfWeek, shiftTemplateId])
}
```

#### 7. **Shift** (Tenant Schema - ISOLATED)
Plantões individuais (gerados automaticamente ou manuais)

```prisma
model Shift {
  id              String      @id
  tenantId        String
  date            DateTime    @db.Date
  shiftTemplateId String
  teamId          String?
  status          ShiftStatus @default(SCHEDULED)
  isFromPattern   Boolean     @default(false)
  patternId       String?
  notes           String?
  versionNumber   Int         @default(1)

  @@unique([tenantId, date, shiftTemplateId, deletedAt])
}
```

**Estados do Plantão:**
- `SCHEDULED`: Agendado (do padrão semanal)
- `CONFIRMED`: Confirmado (com equipe designada)
- `IN_PROGRESS`: Em andamento
- `COMPLETED`: Concluído
- `CANCELLED`: Cancelado

#### 8. **ShiftAssignment** (Tenant Schema - ISOLATED)
Membros designados ao plantão (soft delete)

```prisma
model ShiftAssignment {
  id         String  @id
  shiftId    String
  userId     String
  isFromTeam Boolean @default(true) // true = da equipe, false = adição manual

  assignedBy String
  assignedAt DateTime
  removedBy  String?
  removedAt  DateTime? // Soft delete

  @@unique([shiftId, userId, removedAt])
}
```

#### 9. **ShiftSubstitution** (Tenant Schema - ISOLATED)
Registro de substituições

```prisma
model ShiftSubstitution {
  id             String           @id
  shiftId        String
  type           SubstitutionType
  reason         String
  originalTeamId String?
  newTeamId      String?
  originalUserId String?
  newUserId      String?

  substitutedBy String
  substitutedAt DateTime
}
```

**Tipos de Substituição:**
- `TEAM_REPLACEMENT`: Substituição de equipe inteira
- `MEMBER_REPLACEMENT`: Substituição de membro individual
- `MEMBER_ADDITION`: Adição de membro extra

#### 10. **ShiftHistory** (Tenant Schema - ISOLATED)
Histórico de versões (auditoria completa)

```prisma
model ShiftHistory {
  id            String     @id
  shiftId       String
  versionNumber Int
  changeType    ChangeType
  changeReason  String
  previousData  Json?
  newData       Json
  changedFields String[]

  changedBy String
  changedAt DateTime
}
```

---

## 🔄 Fluxos Principais

### 1. Geração Automática de Plantões (Cron Job)

**Trigger:** Diariamente às 02:00 AM
**Arquivo:** `apps/backend/src/care-shifts/care-shifts.cron.ts`

**Algoritmo:**
```typescript
async generateShiftsFromPattern(daysAhead: number = 14) {
  // 1. Buscar padrão semanal ativo
  const pattern = await findActiveWeeklyPattern();

  // 2. Iterar sobre próximos 14 dias
  for (let i = 0; i < daysAhead; i++) {
    const targetDate = addDays(today, i);
    const dayOfWeek = targetDate.getDay(); // 0-6

    // 3. Buscar assignments do padrão para este dia
    const dayAssignments = pattern.assignments.filter(
      a => a.dayOfWeek === dayOfWeek
    );

    // 4. Para cada assignment (turno):
    for (const assignment of dayAssignments) {
      // Verificar se já existe plantão
      const existing = await findShift({ date, shiftTemplateId });
      if (existing) continue; // ✅ NÃO SOBRESCREVE AJUSTES MANUAIS

      // Criar plantão
      await createShift({
        date,
        shiftTemplateId: assignment.shiftTemplateId,
        teamId: assignment.teamId,
        isFromPattern: true,
      });

      // Se tem equipe, criar assignments dos membros
      if (assignment.teamId) {
        const members = await getTeamMembers(assignment.teamId);
        for (const member of members) {
          await createShiftAssignment({
            shiftId,
            userId: member.userId,
            isFromTeam: true,
          });
        }
      }
    }
  }
}
```

**Comportamento Crítico:** 🚨
- **NÃO sobrescreve** plantões existentes (preserva substituições e ajustes manuais)
- **Gera** próximos 14 dias de plantões
- **Executa** para **todos os tenants ativos**

### 2. Cálculo RDC 502/2021

**Arquivo:** `apps/backend/src/care-shifts/services/rdc-calculation.service.ts`

**Algoritmo:**
```typescript
async calculateMinimumCaregiversRDC(date: string, shiftTemplateId?: string) {
  // 1. Buscar residentes ativos
  const residents = await findMany({
    where: { status: 'Ativo', deletedAt: null }
  });

  // 2. Classificar por grau de dependência
  const grauI = residents.filter(r => r.dependencyLevel?.includes('Grau I')).length;
  const grauII = residents.filter(r => r.dependencyLevel?.includes('Grau II')).length;
  const grauIII = residents.filter(r => r.dependencyLevel?.includes('Grau III')).length;
  const withoutLevel = residents.filter(r => !r.dependencyLevel).length;

  // 3. Calcular mínimo por turno
  const calculations = shiftTemplates.map(shift => {
    let minimumRequired = 0;

    if (shift.duration === 8) {
      // Turnos de 8h
      minimumRequired = Math.ceil(grauI / 20) +   // Grau I: carga diária (÷20)
                        Math.ceil(grauII / 10) +  // Grau II: por turno (÷10)
                        Math.ceil(grauIII / 6);   // Grau III: por turno (÷6)
    } else {
      // Turnos de 12h
      minimumRequired = Math.ceil(grauI / 10) +   // Grau I: por turno (÷10)
                        Math.ceil(grauII / 10) +  // Grau II: por turno (÷10)
                        Math.ceil(grauIII / 6);   // Grau III: por turno (÷6)
    }

    return {
      shiftTemplate: shift,
      minimumRequired,
      residents: { grauI, grauII, grauIII, withoutLevel }
    };
  });

  // 4. Gerar warnings se necessário
  const warnings = [];
  if (withoutLevel > 0) {
    warnings.push(
      `${withoutLevel} residente(s) sem grau de dependência. ` +
      `NÃO foram incluídos no cálculo RDC.`
    );
  }

  return { date, calculations, warnings };
}
```

**Regras Críticas:**
- ✅ Residentes **SEM grau de dependência** são **EXCLUÍDOS** do cálculo
- ⚠️ Sistema exibe **ALERTA VISUAL** quando há residentes sem grau
- 🟢 Status "Conforme": `assignedCount >= minimumRequired`
- 🟡 Status "Atenção": `0 < assignedCount < minimumRequired`
- 🔴 Status "Não Conforme": `assignedCount === 0`

### 3. Substituição de Membro Individual

**Arquivo:** `apps/backend/src/care-shifts/care-shifts.service.ts`

**Validações (ordem de execução):**
```typescript
async substituteMember(shiftId, { originalUserId, newUserId, reason }) {
  // ✅ 1. Validar que original está no plantão
  const shift = await findShiftWithMembers(shiftId);
  const originalMember = shift.members.find(m => m.userId === originalUserId);
  if (!originalMember) {
    throw BadRequest("Usuário original não está no plantão");
  }

  // ✅ 2. Buscar novo usuário
  const newUser = await findUser(newUserId);
  if (!newUser) throw NotFound("Novo usuário não encontrado");

  // 🚫 BLOQUEANTE: Usuário inativo
  if (!newUser.isActive) {
    throw BadRequest(`${newUser.name} está inativo e não pode ser designado`);
  }

  // 🚫 BLOQUEANTE: PositionCode inadequado
  const allowedPositions = [
    'CAREGIVER',
    'NURSE',
    'NURSING_TECHNICIAN',
    'NURSING_ASSISTANT'
  ];
  if (!allowedPositions.includes(newUser.profile.positionCode)) {
    throw BadRequest(`${newUser.name} não tem cargo adequado para escalas`);
  }

  // 🚫 BLOQUEANTE: Conflito de turno no mesmo dia
  const conflict = await findShift({
    date: shift.date,
    members: { some: { userId: newUserId } }
  });
  if (conflict) {
    throw BadRequest(
      `${newUser.name} já está no turno ${conflict.shiftTemplate.name}`
    );
  }

  // ✅ Executar substituição (transação)
  await transaction(async (tx) => {
    // Remover original (soft delete)
    await tx.shiftAssignment.update({
      where: { id: originalMember.id },
      data: { removedBy: userId, removedAt: now() }
    });

    // Adicionar novo
    await tx.shiftAssignment.create({
      data: { shiftId, userId: newUserId, isFromTeam: false }
    });

    // Registrar substituição
    await tx.shiftSubstitution.create({
      data: {
        shiftId,
        type: 'MEMBER_REPLACEMENT',
        reason,
        originalUserId,
        newUserId
      }
    });

    // Incrementar versão + criar histórico
    await tx.shift.update({
      where: { id: shiftId },
      data: { versionNumber: { increment: 1 } }
    });
    await tx.shiftHistory.create({ /* ... */ });
  });
}
```

**Validações Bloqueantes:**
- ❌ Usuário inativo
- ❌ Cargo inadequado (apenas CAREGIVER + profissionais de enfermagem)
- ❌ Conflito de turno (mesmo dia)

**Alertas Não-Bloqueantes:**
- ⚠️ Equipe abaixo do mínimo RDC
- ⚠️ Residentes sem grau de dependência

---

## 📡 API Endpoints

### Teams (`/api/care-shifts/teams`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/teams` | Criar equipe | `MANAGE_TEAMS` |
| GET | `/teams` | Listar equipes (paginado) | `VIEW_CARE_SHIFTS` |
| GET | `/teams/:id` | Buscar equipe específica | `VIEW_CARE_SHIFTS` |
| PATCH | `/teams/:id` | Atualizar equipe | `MANAGE_TEAMS` |
| DELETE | `/teams/:id` | Deletar equipe (soft) | `MANAGE_TEAMS` |
| POST | `/teams/:id/members` | Adicionar membro | `MANAGE_TEAMS` |
| DELETE | `/teams/:id/members/:userId` | Remover membro | `MANAGE_TEAMS` |

### Weekly Schedule (`/api/care-shifts/schedule`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/schedule/weekly-pattern` | Obter padrão ativo | `VIEW_CARE_SHIFTS` |
| POST | `/schedule/weekly-pattern` | Criar padrão (desativa anterior) | `UPDATE_CARE_SHIFTS` |
| PATCH | `/schedule/weekly-pattern/:id` | Atualizar padrão | `UPDATE_CARE_SHIFTS` |
| POST | `/schedule/weekly-pattern/:id/assignments` | Designar equipe ao dia+turno | `UPDATE_CARE_SHIFTS` |
| DELETE | `/schedule/weekly-pattern/:id/assignments/:assignmentId` | Remover designação | `UPDATE_CARE_SHIFTS` |

### Shifts (`/api/care-shifts/shifts`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/shifts?startDate=...&endDate=...` | Listar plantões (período) | `VIEW_CARE_SHIFTS` |
| GET | `/shifts/:id` | Buscar plantão com membros | `VIEW_CARE_SHIFTS` |
| POST | `/shifts` | Criar plantão manual (ajuste) | `CREATE_CARE_SHIFTS` |
| PATCH | `/shifts/:id` | Atualizar notas/status | `UPDATE_CARE_SHIFTS` |
| DELETE | `/shifts/:id` | Deletar plantão (soft) | `DELETE_CARE_SHIFTS` |
| POST | `/shifts/:id/assign-team` | Designar equipe | `UPDATE_CARE_SHIFTS` |
| POST | `/shifts/:id/substitute-team` | Substituir equipe inteira | `UPDATE_CARE_SHIFTS` |
| POST | `/shifts/:id/substitute-member` | Substituir membro individual | `UPDATE_CARE_SHIFTS` |
| POST | `/shifts/:id/add-member` | Adicionar membro extra | `UPDATE_CARE_SHIFTS` |
| DELETE | `/shifts/:id/members/:userId` | Remover membro | `UPDATE_CARE_SHIFTS` |
| GET | `/shifts/:id/history` | Histórico de versões | `VIEW_CARE_SHIFTS` |

### Compliance (`/api/care-shifts/compliance`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/compliance/rdc-calculation?date=...` | Calcular mínimo RDC por turno | `VIEW_RDC_COMPLIANCE` |
| GET | `/compliance/coverage-report?startDate=...&endDate=...` | Relatório de cobertura do período | `VIEW_RDC_COMPLIANCE` |

### Shift Templates (`/api/care-shifts/shift-templates`)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/shift-templates` | Listar turnos fixos | `VIEW_CARE_SHIFTS` |
| PATCH | `/shift-templates/:id/tenant-config` | Ativar/desativar turno | `CONFIGURE_SHIFT_SETTINGS` |

---

## 🎨 Componentes Frontend

### Estrutura de Páginas

```
/dashboard/escala-cuidados
├── [Tab] Equipes              # TeamsViewTab.tsx
├── [Tab] Plantões             # ShiftsViewTab.tsx
├── [Tab] Padrão Semanal       # WeeklyScheduleTab.tsx
├── [Tab] Configurar Turnos    # TurnsConfigTab.tsx
└── [Tab] Conformidade RDC     # RDCParametersTab.tsx (disabled)
```

### CareShiftsPage (Página Principal)

**Arquivo:** `apps/frontend/src/pages/care-shifts/CareShiftsPage.tsx`

```tsx
export default function CareShiftsPage() {
  const [activeTab, setActiveTab] = useState('teams');

  return (
    <Page>
      <PageHeader
        title="Escala de Cuidados"
        subtitle="Gestão de turnos, equipes e plantões de cuidadores..."
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="teams">Equipes</TabsTrigger>
          <TabsTrigger value="shifts">Plantões</TabsTrigger>
          <TabsTrigger value="schedule">Padrão Semanal</TabsTrigger>
          <TabsTrigger value="turns-config">Configurar Turnos</TabsTrigger>
          <TabsTrigger value="compliance" disabled>Conformidade RDC</TabsTrigger>
        </TabsList>
        {/* ... conteúdo das abas ... */}
      </Tabs>
    </Page>
  );
}
```

### ShiftsViewTab (Lista de Plantões)

**Arquivo:** `apps/frontend/src/pages/care-shifts/ShiftsViewTab.tsx`

**Features:**
- Lista plantões agrupados por data
- Filtro de período (próximos 7-14 dias)
- Alerta visual para residentes sem grau de dependência
- Cards com status de conformidade (🟢🟡🔴)

**Componentes Filhos:**
- `ShiftCard` - Card individual de plantão
- `CoverageStatusBadge` - Badge de status (🟢🟡🔴)
- `RDCCalculationCard` - Card explicativo do cálculo RDC

### ShiftCard (Card de Plantão)

**Arquivo:** `apps/frontend/src/components/care-shifts/shifts/ShiftCard.tsx`

**Layout Visual:**
```
┌──────────────────────────────────────┐
│ [Turno Nome]              [🟢 Badge] │
│ 07:00 - 15:00                        │
│ [Equipe A Manhã]                     │
│ 👥 3/2  |  15 residentes             │
│ [Avatar][Avatar][Avatar] +1          │
│ [Ver Detalhes] [⚡️ Ação Rápida]     │
└──────────────────────────────────────┘
```

**Estados:**
- 🟢 `compliant`: `assignedCount >= minimumRequired`
- 🟡 `attention`: `assignedCount < minimumRequired` (mas > 0)
- 🔴 `non_compliant`: `assignedCount === 0`

### WeeklyScheduleGrid (Grid Matricial)

**Arquivo:** `apps/frontend/src/components/care-shifts/weekly-schedule/WeeklyScheduleGrid.tsx`

**Layout Visual:**
```
         Dom      Seg      Ter      Qua      Qui      Sex      Sáb
Dia 8h   [Eq A]  [Eq A]  [Eq A]  [Eq A]  [Eq A]  [Eq B]  [Eq B]
Tarde 8h [Eq C]  [Eq C]  [Eq C]  [Eq C]  [Eq C]  [Eq D]  [Eq D]
Noite 8h [Eq E]  [Eq E]  [Eq E]  [Eq E]  [Eq E]  [Eq F]  [Eq F]
```

**Features:**
- Grid 7 dias × N turnos
- Clique na célula abre modal de designação
- Destaque visual para dia atual
- Badge com cor da equipe + número de membros

### RDCCalculationCard (Card Explicativo)

**Arquivo:** `apps/frontend/src/components/care-shifts/compliance/RDCCalculationCard.tsx`

**Layout Visual:**
```
┌──────────────────────────────────────────────────┐
│ Cálculo RDC 502/2021 - Dia 8h                   │
│ ─────────────────────────────────────────────    │
│ Residentes:                                      │
│   Grau I: 10 residentes → 10/20 = 1 cuidador   │
│   Grau II: 15 residentes → 15/10 = 2 cuidadores│
│   Grau III: 6 residentes → 6/6 = 1 cuidador    │
│ ─────────────────────────────────────────────    │
│ Mínimo Exigido: 4 cuidadores                    │
│                                                  │
│ ⚠️ 3 residentes sem grau de dependência         │
└──────────────────────────────────────────────────┘
```

---

## 🔐 Permissões

### Enums Adicionados

```typescript
enum PermissionType {
  // ... permissões existentes ...

  // Care Shifts (Escala de Cuidados)
  VIEW_CARE_SHIFTS,           // Visualizar plantões e escalas
  CREATE_CARE_SHIFTS,         // Criar plantões manuais
  UPDATE_CARE_SHIFTS,         // Editar plantões e padrão semanal
  DELETE_CARE_SHIFTS,         // Deletar plantões
  MANAGE_TEAMS,               // Gerenciar equipes
  VIEW_RDC_COMPLIANCE,        // Ver conformidade RDC
  CONFIGURE_SHIFT_SETTINGS,   // Configurar turnos do tenant
}
```

### Matriz de Permissões por Papel

| Ação | ADMIN | NURSE | CAREGIVER | VISIT |
|------|-------|-------|-----------|-------|
| Ver plantões | ✅ | ✅ | ✅ | ❌ |
| Criar plantões | ✅ | ✅ | ❌ | ❌ |
| Editar plantões | ✅ | ✅ | ❌ | ❌ |
| Deletar plantões | ✅ | ❌ | ❌ | ❌ |
| Gerenciar equipes | ✅ | ✅ | ❌ | ❌ |
| Ver conformidade RDC | ✅ | ✅ | ✅ | ❌ |
| Configurar turnos | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Testando o Módulo

### 1. Popular Dados Iniciais

```bash
# Limpar banco e aplicar migrations
npm run prisma:migrate:dev

# Popular shift templates (5 turnos fixos)
npm run prisma:seed
```

### 2. Registrar Tenant e Criar Usuário

```bash
# Via frontend ou API
POST /api/auth/register-tenant
{
  "name": "ILPI Exemplo",
  "email": "admin@ilpi.com.br",
  "password": "senha123",
  "cnpj": "00.000.000/0001-00"
}
```

### 3. Criar Equipe

```bash
POST /api/care-shifts/teams
{
  "name": "Equipe A - Manhã",
  "description": "Equipe do turno da manhã",
  "color": "#3b82f6",
  "memberIds": ["user-id-1", "user-id-2"]
}
```

### 4. Configurar Padrão Semanal

```bash
# Criar padrão
POST /api/care-shifts/schedule/weekly-pattern
{
  "name": "Padrão Semanal Padrão",
  "startDate": "2026-01-21"
}

# Designar equipe a Segunda-feira + Dia 8h
POST /api/care-shifts/schedule/weekly-pattern/{patternId}/assignments
{
  "dayOfWeek": 1,
  "shiftTemplateId": "shift-template-id",
  "teamId": "team-id"
}
```

### 5. Aguardar Geração Automática

Os plantões serão gerados automaticamente às **02:00 AM** para os próximos 14 dias.

**OU** executar manualmente:
```bash
# Via NestJS CLI
npx ts-node scripts/generate-shifts-manual.ts
```

---

## 🐛 Troubleshooting

### Problema: Plantões não sendo gerados

**Sintomas:**
- Cron job não executa
- Padrão semanal configurado mas sem plantões

**Solução:**
```bash
# 1. Verificar se cron job está ativo
curl http://localhost:3000/api/care-shifts/shifts/generate

# 2. Verificar logs
docker logs rafa-ilpi-backend | grep "CareShiftsCron"

# 3. Verificar se tenant tem padrão ativo
SELECT * FROM weekly_schedule_patterns WHERE is_active = true;
```

### Problema: Erro "cross-schema FK constraint"

**Sintomas:**
```
ERROR: insert or update violates foreign key constraint
```

**Solução:**
- Verificar se migration `20260121_drop_contract_user_fks` foi aplicada
- Regenerar Prisma Client: `npx prisma generate`

### Problema: Cálculo RDC incorreto

**Sintomas:**
- Número de cuidadores necessários não bate com esperado

**Solução:**
```typescript
// Verificar se residentes têm grau de dependência cadastrado
SELECT id, full_name, dependency_level
FROM residents
WHERE status = 'Ativo' AND deleted_at IS NULL;

// Se dependency_level for NULL, o residente NÃO será incluído no cálculo
// Atualizar: dependency_level = 'Grau I', 'Grau II' ou 'Grau III'
```

---

## 📊 Métricas e Monitoramento

### Logs Importantes

```bash
# Geração automática de plantões
[CareShiftsCron] ✅ Plantões gerados: 42 criados, 14 skipped
[CareShiftsCron] ⏱️  Duração: 2.34s

# Erros de validação
[CareShiftsService] ❌ Conflito de turno: João Silva já está no Dia 8h

# Cálculo RDC
[RDCCalculationService] ⚠️  3 residentes sem grau de dependência
```

### Métricas Recomendadas

- **Taxa de conformidade RDC**: `shifts_compliant / total_shifts`
- **Substituições por mês**: `COUNT(shift_substitutions)`
- **Média de membros por equipe**: `AVG(team_members.count)`
- **Plantões sem equipe**: `COUNT(shifts WHERE team_id IS NULL)`

---

## 🚀 Roadmap Futuro

### Fase 9: Documentação & Deploy (Completo ✅)
- ✅ Documentação técnica
- ✅ Deploy em staging
- ✅ Testes de aceitação

### Melhorias Futuras (Backlog)

1. **Relatórios de Conformidade**
   - Dashboard visual com gráficos
   - Exportação PDF/Excel
   - Histórico de conformidade mensal

2. **Notificações Automáticas**
   - Alerta quando plantão ficar abaixo do mínimo
   - Lembrete de plantões não confirmados
   - Notificação de substituições pendentes

3. **Gestão de Férias e Atestados**
   - Integração com calendário de férias
   - Substituição automática sugerida
   - Bloqueio de escalas para usuários afastados

4. **Análise Preditiva**
   - Sugestão de equipes baseada em histórico
   - Detecção de padrões de sobrecarga
   - Otimização automática de escalas

---

## 📚 Referências

- **RDC 502/2021 ANVISA**: [Resolução Completa](https://www.in.gov.br/en/web/dou/-/resolucao-rdc-n-502-de-27-de-maio-de-2021-322828010)
- **Prisma Multi-Tenancy**: https://www.prisma.io/docs/guides/database/multi-tenancy
- **NestJS Cron**: https://docs.nestjs.com/techniques/task-scheduling
- **Date-fns Locale PT-BR**: https://date-fns.org/v2.29.3/docs/Locale

---

**Última atualização:** 21/01/2026
**Autor:** Dr. E. (Emanuel) + Claude Code
**Versão:** 1.0.0
