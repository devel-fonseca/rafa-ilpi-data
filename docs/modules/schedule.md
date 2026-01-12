# Módulo de Agenda (Schedule)

**Versão:** 1.0.0
**Data:** 11/01/2025
**Autor:** Rafa Labs - Sistema ILPI

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Backend - Prisma Models](#backend---prisma-models)
4. [Backend - Services](#backend---services)
5. [Backend - Controllers e Endpoints](#backend---controllers-e-endpoints)
6. [Backend - DTOs](#backend---dtos)
7. [Frontend - Páginas](#frontend---páginas)
8. [Frontend - Componentes](#frontend---componentes)
9. [Frontend - Hooks React Query](#frontend---hooks-react-query)
10. [Fluxos de Dados](#fluxos-de-dados)
11. [Integrações com Outros Módulos](#integrações-com-outros-módulos)
12. [Casos de Uso Práticos](#casos-de-uso-práticos)
13. [Tratamento de Dados Especiais](#tratamento-de-dados-especiais)
14. [Troubleshooting](#troubleshooting)
15. [Roadmap](#roadmap)

---

## Visão Geral

O **Módulo de Agenda** é responsável por gerenciar todos os eventos e tarefas relacionadas aos residentes de uma ILPI (Instituição de Longa Permanência para Idosos). Ele combina três tipos principais de itens:

1. **Configurações Recorrentes** (`ResidentScheduleConfig`) - Templates para tarefas que se repetem diariamente, semanalmente ou mensalmente
2. **Eventos Agendados** (`ResidentScheduledEvent`) - Eventos únicos com data/hora específica (vacinas, consultas, exames, procedimentos)
3. **Medicamentos** - Horários de administração de medicamentos ativos

### Funcionalidades Principais

- ✅ Criação de agendas recorrentes (diárias, semanais, mensais)
- ✅ Agendamento de eventos pontuais (vacinas, consultas, exames)
- ✅ Visualização consolidada em formato diário, semanal e mensal
- ✅ Tratamento especial para alimentação (6 refeições em batch)
- ✅ Integração com registros diários (DailyRecords)
- ✅ Integração com prescrições médicas (Medications)
- ✅ Notificações automáticas para eventos agendados
- ✅ Tracking de status (pendente, concluído, perdido, cancelado)
- ✅ Filtragem por tipo de conteúdo e status
- ✅ Suporte a eventos institucionais com controle de visibilidade

---

## Arquitetura

### Conceitos Fundamentais

#### 1. **Configuração Recorrente (ResidentScheduleConfig)**
São **templates** que definem tarefas que devem ser executadas regularmente:
- **Frequência:** DAILY, WEEKLY ou MONTHLY
- **Tipo de registro:** Qualquer RecordType (HIGIENE, ALIMENTACAO, PESO, etc)
- **Horários sugeridos:** Array de strings "HH:mm"
- **Metadados:** Informações extras específicas por tipo

**Exemplo:** "Higiene pessoal às 08:00 e 20:00 todos os dias"

#### 2. **Evento Agendado (ResidentScheduledEvent)**
São **eventos únicos** com data/hora específica:
- **Tipos:** VACCINATION, CONSULTATION, EXAM, PROCEDURE, OTHER
- **Status:** SCHEDULED, COMPLETED, CANCELLED, MISSED
- **Dados específicos:** vaccineData para vacinas

**Exemplo:** "Vacina Influenza 2024 em 15/03/2024 às 10:00"

#### 3. **Agenda Consolidada (AgendaService)**
Combina em uma única visualização:
- Medicamentos agendados (de prescrições ativas)
- Eventos agendados (ResidentScheduledEvent)
- Tarefas recorrentes (geradas de ResidentScheduleConfig)

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  AgendaPage  │  │ ResidentTab  │  │  DailyView   │          │
│  │  (Hub)       │  │  (Gestão)    │  │ WeeklyView   │          │
│  └──────┬───────┘  └──────┬───────┘  │ MonthlyView  │          │
│         │                 │           └──────┬───────┘          │
│         └─────────────────┴──────────────────┘                  │
│                           │                                      │
│                  ┌────────▼────────┐                            │
│                  │ React Query     │                            │
│                  │ Hooks           │                            │
│                  └────────┬────────┘                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                    ────────┼────────
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                         BACKEND                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           ResidentScheduleController                      │  │
│  │  /configs  /events  /tasks  /agenda                       │  │
│  └────────┬────────────┬────────────┬─────────────┬──────────┘  │
│           │            │            │             │              │
│  ┌────────▼────┐  ┌───▼──────┐  ┌──▼────────┐ ┌─▼─────────┐   │
│  │  Schedule   │  │  Tasks   │  │  Agenda   │ │ Notifications│ │
│  │  Service    │  │  Service │  │  Service  │ │  Service    │  │
│  └────────┬────┘  └───┬──────┘  └──┬────────┘ └─────────────┘  │
│           │           │            │                             │
│           └───────────┴────────────┘                             │
│                       │                                          │
│  ┌────────────────────▼────────────────────────────────────┐   │
│  │                 Prisma ORM                               │   │
│  │  ResidentScheduleConfig  │  ResidentScheduledEvent      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Backend - Prisma Models

### 1. ResidentScheduleConfig

**Propósito:** Armazenar configurações de tarefas recorrentes (templates).

**Localização:** `apps/backend/prisma/schema/daily-records.prisma` (linhas 107-161)

```prisma
model ResidentScheduleConfig {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Tipo de registro obrigatório (usa enum RecordType existente)
  recordType RecordType

  // Frequência de recorrência
  frequency ScheduleFrequency  // DAILY, WEEKLY, MONTHLY

  // Configurações específicas por frequência
  dayOfWeek  Int?  // 0-6 (apenas para WEEKLY: 0=Domingo, 6=Sábado)
  dayOfMonth Int?  // 1-31 (apenas para MONTHLY)

  // Horários sugeridos - array de strings "HH:mm"
  suggestedTimes Json @default("[]")  // Ex: ["08:00", "14:00"]

  // Status
  isActive Boolean @default(true)

  // Observações
  notes String? @db.Text

  // Metadados extras (JSON) - usado para informações específicas por tipo
  // Ex: para ALIMENTACAO: { "mealType": "Café da Manhã" }
  metadata Json? @default("{}")

  // Auditoria
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  // Relações
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident      Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  createdByUser User     @relation("ScheduleConfigCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?    @relation("ScheduleConfigUpdatedBy", fields: [updatedBy], references: [id])

  // Índices para performance
  @@index([tenantId, residentId])
  @@index([residentId, isActive])
  @@index([recordType])
  @@index([deletedAt])
  @@index([residentId, recordType, isActive])
  @@index([tenantId, recordType, isActive])
  @@map("resident_schedule_configs")
}
```

**Campos importantes:**

- `recordType`: Qual tipo de registro esta config gera (HIGIENE, ALIMENTACAO, PESO, etc)
- `frequency`: Com qual frequência a tarefa se repete
- `dayOfWeek`: Usado apenas para WEEKLY (0=Domingo, 1=Segunda, ..., 6=Sábado)
- `dayOfMonth`: Usado apenas para MONTHLY (1-31)
- `suggestedTimes`: Array de horários sugeridos para execução
- `metadata`: Dados extras (ex: para ALIMENTACAO, armazena `{ "mealType": "Café da Manhã" }`)

---

### 2. ResidentScheduledEvent

**Propósito:** Armazenar eventos únicos agendados (vacinas, consultas, exames, procedimentos).

**Localização:** `apps/backend/prisma/schema/daily-records.prisma` (linhas 163-216)

```prisma
model ResidentScheduledEvent {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Tipo de evento
  eventType ScheduledEventType  // VACCINATION, CONSULTATION, EXAM, PROCEDURE, OTHER

  // Data e hora do agendamento
  scheduledDate DateTime @db.Date
  scheduledTime String // HH:mm

  // Detalhes do evento
  title       String
  description String? @db.Text

  // Campos específicos para vacinas (quando eventType = VACCINATION)
  vaccineData Json?  // {name, dose, manufacturer, batchNumber}

  // Status
  status ScheduledEventStatus @default(SCHEDULED)  // SCHEDULED, COMPLETED, CANCELLED, MISSED

  // Referência ao registro criado (quando status = COMPLETED)
  completedRecordId String?   @db.Uuid
  completedAt       DateTime? @db.Timestamptz(3)

  // Observações
  notes String? @db.Text

  // Auditoria
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  // Relações
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident      Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  createdByUser User     @relation("ScheduledEventCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?    @relation("ScheduledEventUpdatedBy", fields: [updatedBy], references: [id])

  // Índices para performance
  @@index([tenantId, scheduledDate])
  @@index([residentId, scheduledDate])
  @@index([status, scheduledDate])
  @@index([eventType])
  @@index([deletedAt])
  @@index([tenantId, status, scheduledDate])
  @@index([residentId, status, scheduledDate])
  @@index([tenantId, eventType, scheduledDate])
  @@map("resident_scheduled_events")
}
```

**Campos importantes:**

- `eventType`: Tipo de evento (VACCINATION, CONSULTATION, EXAM, PROCEDURE, OTHER)
- `scheduledDate` + `scheduledTime`: Data e hora específica do evento
- `vaccineData`: Dados específicos de vacina (nome, dose, fabricante, lote)
- `status`: Estado do evento (SCHEDULED, COMPLETED, CANCELLED, MISSED)
- `completedRecordId`: Referência ao DailyRecord criado quando evento é marcado como COMPLETED

---

### 3. Enums Relacionados

**Localização:** `apps/backend/prisma/schema/enums.prisma` (linhas 429-454)

```prisma
enum ScheduleFrequency {
  DAILY    // Todos os dias
  WEEKLY   // Semanal (requer dayOfWeek)
  MONTHLY  // Mensal (requer dayOfMonth)
  @@map("ScheduleFrequency")
}

enum ScheduledEventType {
  VACCINATION  // Vacinação
  CONSULTATION // Consulta médica
  EXAM         // Exames
  PROCEDURE    // Procedimentos
  OTHER        // Outros eventos
  @@map("ScheduledEventType")
}

enum ScheduledEventStatus {
  SCHEDULED  // Agendado
  COMPLETED  // Concluído
  CANCELLED  // Cancelado
  MISSED     // Perdido (passou da data sem ser concluído)
  @@map("ScheduledEventStatus")
}
```

---

## Backend - Services

### 1. ResidentScheduleService

**Propósito:** Gerenciar CRUD de configurações recorrentes e eventos agendados.

**Localização:** `apps/backend/src/resident-schedule/resident-schedule.service.ts` (865 linhas)

#### Operações de Configuração (ResidentScheduleConfig)

**1.1. Criar Configuração**

```typescript
async createConfig(
  dto: CreateScheduleConfigDto,
  tenantId: string,
  userId: string,
): Promise<ResidentScheduleConfig>
```

**Lógica:**
1. Valida frequência:
   - DAILY: não pode ter dayOfWeek nem dayOfMonth
   - WEEKLY: deve ter dayOfWeek (0-6), não pode ter dayOfMonth
   - MONTHLY: deve ter dayOfMonth (1-31), não pode ter dayOfWeek
2. Verifica se já existe config duplicada (mesmo residente + recordType + frequência + dia)
3. Salva nova configuração
4. Registra log de auditoria
5. Cria notificação para gestores

**Exemplo de uso:**

```typescript
// Criar config de higiene 2x ao dia
const config = await scheduleService.createConfig(
  {
    residentId: 'uuid-resident',
    recordType: RecordType.HIGIENE,
    frequency: ScheduleFrequency.DAILY,
    suggestedTimes: ['08:00', '20:00'],
    notes: 'Higiene completa manhã e noite',
  },
  'uuid-tenant',
  'uuid-user',
)
```

---

**1.2. Criar Configurações de Alimentação (Batch)**

```typescript
async createAlimentacaoConfigs(
  dto: CreateAlimentacaoConfigDto,
  tenantId: string,
  userId: string,
): Promise<ResidentScheduleConfig[]>
```

**Lógica especial:**
- Cria **6 configurações** em uma única operação (transaction)
- Cada config representa uma refeição:
  - Café da Manhã, Colação, Almoço, Lanche, Jantar, Ceia
- Todas com `recordType = ALIMENTACAO`, `frequency = DAILY`
- Cada uma com `metadata = { mealType: "nome da refeição" }`
- Verifica se já existem configs de alimentação (previne duplicatas)

**Exemplo de uso:**

```typescript
// Criar agenda completa de alimentação
const configs = await scheduleService.createAlimentacaoConfigs(
  {
    residentId: 'uuid-resident',
    mealTimes: {
      cafeDaManha: '08:00',
      colacao: '10:00',
      almoco: '12:00',
      lanche: '14:00',
      jantar: '18:00',
      ceia: '20:00',
    },
    notes: 'Agenda padrão de alimentação',
  },
  'uuid-tenant',
  'uuid-user',
)

// Retorna array com 6 configs criadas
```

---

**1.3. Atualizar Configurações de Alimentação**

```typescript
async updateAlimentacaoConfigs(
  residentId: string,
  dto: UpdateAlimentacaoConfigDto,
  tenantId: string,
  userId: string,
): Promise<ResidentScheduleConfig[]>
```

**Lógica:**
- Atualiza os horários das 6 refeições em uma única operação
- Identifica cada config pelo `metadata.mealType`
- Transaction para garantir atomicidade

---

**1.4. Deletar Configurações de Alimentação**

```typescript
async deleteAlimentacaoConfigs(
  residentId: string,
  tenantId: string,
  userId: string,
): Promise<{ count: number }>
```

**Lógica:**
- Soft delete de todas as 6 configs de alimentação
- Retorna quantidade deletada

---

**1.5. Buscar Configurações por Residente**

```typescript
async getConfigsByResident(
  residentId: string,
  tenantId: string,
): Promise<ResidentScheduleConfig[]>
```

**Retorna:** Todas as configurações ativas do residente, ordenadas por status.

---

#### Operações de Eventos Agendados (ResidentScheduledEvent)

**1.6. Criar Evento Agendado**

```typescript
async createEvent(
  dto: CreateScheduledEventDto,
  tenantId: string,
  userId: string,
): Promise<ResidentScheduledEvent>
```

**Lógica:**
1. Valida residente
2. Salva evento com status SCHEDULED
3. Para vacinas, armazena `vaccineData` (nome, dose, fabricante, lote)
4. Cria notificação automática de evento agendado
5. Log de auditoria

**Exemplo de uso:**

```typescript
// Agendar vacinação
const event = await scheduleService.createEvent(
  {
    residentId: 'uuid-resident',
    eventType: ScheduledEventType.VACCINATION,
    scheduledDate: '2024-03-15',
    scheduledTime: '10:00',
    title: 'Vacina Influenza 2024',
    description: 'Primeira dose da campanha anual',
    vaccineData: {
      name: 'Influenza (H1N1)',
      dose: '1ª dose',
      manufacturer: 'Instituto Butantan',
      batchNumber: 'LOT2024-001',
    },
    notes: 'Residente sem alergias conhecidas',
  },
  'uuid-tenant',
  'uuid-user',
)
```

---

**1.7. Atualizar Evento**

```typescript
async updateEvent(
  id: string,
  dto: UpdateScheduledEventDto,
  tenantId: string,
  userId: string,
): Promise<ResidentScheduledEvent>
```

**Lógica especial:**
- Detecta reagendamento (mudança de data/hora)
- Se reagendado, cria nova notificação com novo horário
- Pode marcar como COMPLETED e referenciar DailyRecord criado

**Exemplo de uso:**

```typescript
// Reagendar evento
const updated = await scheduleService.updateEvent(
  'uuid-event',
  {
    scheduledDate: '2024-03-20',
    scheduledTime: '14:00',
  },
  'uuid-tenant',
  'uuid-user',
)

// Marcar como concluído
const completed = await scheduleService.updateEvent(
  'uuid-event',
  {
    status: ScheduledEventStatus.COMPLETED,
    completedRecordId: 'uuid-daily-record',
  },
  'uuid-tenant',
  'uuid-user',
)
```

---

### 2. ResidentScheduleTasksService

**Propósito:** Calcular tarefas diárias combinando configurações recorrentes + eventos agendados.

**Localização:** `apps/backend/src/resident-schedule/resident-schedule-tasks.service.ts` (421 linhas)

**2.1. Tarefas Diárias por Residente**

```typescript
async getDailyTasksByResident(
  residentId: string,
  tenantId: string,
  dateStr?: string,
): Promise<DailyTask[]>
```

**Lógica:**
1. Parse da data (ou usa data atual no timezone do tenant)
2. Busca configurações ativas do residente
3. **Aplica lógica de frequência** para cada config:
   - DAILY: sempre gera tarefa
   - WEEKLY: gera se `dayOfWeek` = dia da semana da data
   - MONTHLY: gera se `dayOfMonth` = dia do mês (com fallback para último dia)
4. Busca registros já feitos (DailyRecords) neste dia
5. Marca tarefas como concluídas se existe DailyRecord correspondente
6. Busca eventos agendados para esta data
7. Combina tudo em array único de `DailyTask`

**Interface DailyTask:**

```typescript
interface DailyTask {
  type: 'RECURRING' | 'EVENT'
  residentId: string
  residentName: string

  // Para tarefas recorrentes (type = 'RECURRING')
  recordType?: RecordType
  suggestedTimes?: string[]
  configId?: string
  isCompleted?: boolean
  completedAt?: Date
  completedBy?: string
  mealType?: string  // Apenas para ALIMENTACAO

  // Para eventos agendados (type = 'EVENT')
  eventId?: string
  eventType?: ScheduledEventType
  scheduledTime?: string
  title?: string
  status?: ScheduledEventStatus
}
```

**Exemplo de uso:**

```typescript
// Buscar tarefas do residente para hoje
const tasks = await tasksService.getDailyTasksByResident(
  'uuid-resident',
  'uuid-tenant',
  // sem dateStr = usa data atual
)

// Resultado:
[
  {
    type: 'RECURRING',
    recordType: 'HIGIENE',
    suggestedTimes: ['08:00', '20:00'],
    configId: 'uuid-config',
    isCompleted: false,
    residentId: 'uuid-resident',
    residentName: 'João Silva',
  },
  {
    type: 'RECURRING',
    recordType: 'ALIMENTACAO',
    suggestedTimes: ['08:00'],
    configId: 'uuid-config-2',
    isCompleted: true,
    completedAt: '2024-01-11T08:15:00Z',
    completedBy: 'uuid-user',
    mealType: 'Café da Manhã',
    residentId: 'uuid-resident',
    residentName: 'João Silva',
  },
  {
    type: 'EVENT',
    eventType: 'VACCINATION',
    scheduledTime: '10:00',
    title: 'Vacina Influenza 2024',
    status: 'SCHEDULED',
    eventId: 'uuid-event',
    residentId: 'uuid-resident',
    residentName: 'João Silva',
  },
]
```

---

**2.2. Tarefas Diárias de Todos os Residentes**

```typescript
async getDailyTasks(
  tenantId: string,
  dateStr?: string,
): Promise<DailyTask[]>
```

**Lógica:**
- Busca residentes ativos do tenant
- Para cada residente, executa lógica do método anterior
- Combina tudo em um único array

---

**Lógica de Frequência (shouldGenerateTask):**

```typescript
private shouldGenerateTask(
  config: ResidentScheduleConfig,
  targetDate: Date,
): boolean {
  switch (config.frequency) {
    case ScheduleFrequency.DAILY:
      return true // Sempre gera

    case ScheduleFrequency.WEEKLY:
      const dayOfWeek = targetDate.getDay() // 0-6
      return dayOfWeek === config.dayOfWeek

    case ScheduleFrequency.MONTHLY:
      const dayOfMonth = targetDate.getDate() // 1-31
      const lastDayOfMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0,
      ).getDate()

      // Fallback: se config pede dia 31 em fevereiro (28 dias),
      // gera tarefa no último dia do mês
      if (config.dayOfMonth > lastDayOfMonth) {
        return dayOfMonth === lastDayOfMonth
      }

      return dayOfMonth === config.dayOfMonth

    default:
      return false
  }
}
```

---

### 3. AgendaService

**Propósito:** Consolidar medicamentos + eventos agendados + registros recorrentes em uma única view.

**Localização:** `apps/backend/src/resident-schedule/agenda.service.ts` (682 linhas)

**3.1. Buscar Itens da Agenda Consolidados**

```typescript
async getAgendaItems(
  dto: GetAgendaItemsDto,
  tenantId: string,
): Promise<AgendaItem[]>
```

**Modos de Consulta:**

1. **Single Date (Legacy):** `dto.date` fornecido → visualização diária
2. **Range Query:** `dto.startDate` + `dto.endDate` → visualizações semanal/mensal
3. **Default:** sem parâmetros → usa data atual

**Lógica:**
1. Determina intervalo de datas (startDate, endDate)
2. Busca **medicamentos** agendados no intervalo
3. Busca **eventos agendados** no intervalo
4. Busca **registros recorrentes** no intervalo
5. Combina tudo em array único de `AgendaItem`
6. Aplica filtros de conteúdo (`dto.filters`)
7. Aplica filtros de status (`dto.statusFilter`)
8. Ordena por data + horário

**Interface AgendaItem:**

```typescript
interface AgendaItem {
  id: string
  type: AgendaItemType  // MEDICATION | SCHEDULED_EVENT | RECURRING_RECORD
  category: string
  residentId: string
  residentName: string
  title: string
  description?: string
  scheduledDate: Date
  scheduledTime: string
  status: 'pending' | 'completed' | 'missed' | 'cancelled'
  completedAt?: Date
  completedBy?: string
  metadata?: Record<string, any>

  // Específicos para medicamentos
  medicationName?: string
  dosage?: string
  prescriptionId?: string

  // Específicos para eventos
  eventType?: ScheduledEventType
  vaccineData?: {
    name: string
    dose: string
    manufacturer?: string
    batchNumber?: string
  }
  eventId?: string

  // Específicos para registros recorrentes
  recordType?: RecordType
  suggestedTimes?: string[]
  configId?: string
  mealType?: string
}
```

**Filtros de Conteúdo (ContentFilterType):**

```typescript
enum ContentFilterType {
  // Medicamentos
  MEDICATIONS = 'medications',

  // Agendamentos pontuais
  VACCINATIONS = 'vaccinations',
  CONSULTATIONS = 'consultations',
  EXAMS = 'exams',
  PROCEDURES = 'procedures',
  OTHER_EVENTS = 'other_events',

  // Registros obrigatórios
  HYGIENE = 'hygiene',
  FEEDING = 'feeding',
  HYDRATION = 'hydration',
  WEIGHT = 'weight',
  MONITORING = 'monitoring',
  ELIMINATION = 'elimination',
  BEHAVIOR = 'behavior',
  SLEEP = 'sleep',
  ACTIVITIES = 'activities',
  VISITS = 'visits',
  OTHER_RECORDS = 'other_records',
}
```

**Exemplo de uso:**

```typescript
// Buscar agenda do residente para a semana
const items = await agendaService.getAgendaItems(
  {
    startDate: '2024-01-08',
    endDate: '2024-01-14',
    residentId: 'uuid-resident',
    filters: [
      ContentFilterType.MEDICATIONS,
      ContentFilterType.VACCINATIONS,
      ContentFilterType.FEEDING,
    ],
    statusFilter: 'pending',
  },
  'uuid-tenant',
)

// Resultado consolidado:
[
  {
    id: 'uuid-1',
    type: 'MEDICATION',
    category: 'Medicamento',
    residentName: 'João Silva',
    title: 'Losartana 50mg',
    scheduledDate: '2024-01-08',
    scheduledTime: '08:00',
    status: 'pending',
    medicationName: 'Losartana',
    dosage: '50mg',
    prescriptionId: 'uuid-prescription',
  },
  {
    id: 'uuid-2',
    type: 'SCHEDULED_EVENT',
    category: 'Vacinação',
    residentName: 'João Silva',
    title: 'Vacina Influenza 2024',
    scheduledDate: '2024-01-10',
    scheduledTime: '10:00',
    status: 'pending',
    eventType: 'VACCINATION',
    vaccineData: { name: 'Influenza (H1N1)', dose: '1ª dose' },
  },
  {
    id: 'uuid-3',
    type: 'RECURRING_RECORD',
    category: 'Alimentação',
    residentName: 'João Silva',
    title: 'Café da Manhã',
    scheduledDate: '2024-01-08',
    scheduledTime: '08:00',
    status: 'completed',
    completedAt: '2024-01-08T08:15:00Z',
    recordType: 'ALIMENTACAO',
    mealType: 'Café da Manhã',
  },
]
```

---

**3.2. Métodos Internos**

**getMedicationItems:**
```typescript
private async getMedicationItems(
  startDate: Date,
  endDate: Date,
  tenantId: string,
  residentId?: string,
): Promise<AgendaItem[]>
```
- Busca prescrições ativas no intervalo
- Para cada medicamento, itera cada dia com cada horário agendado
- Verifica se foi administrado (compara com MedicationAdministration)
- Status: pending/completed/missed baseado em data e administração

---

**getScheduledEventItems:**
```typescript
private async getScheduledEventItems(
  startDate: Date,
  endDate: Date,
  tenantId: string,
  residentId?: string,
  eventTypes?: ScheduledEventType[],
): Promise<AgendaItem[]>
```
- Busca eventos com status SCHEDULED mas data passada → marcados como MISSED
- Filtrável por eventType

---

**getRecurringRecordItems:**
```typescript
private async getRecurringRecordItems(
  startDate: Date,
  endDate: Date,
  tenantId: string,
  residentId?: string,
  recordTypes?: RecordType[],
): Promise<AgendaItem[]>
```
- Busca configs ativas
- Para cada dia do intervalo, calcula se deve gerar tarefa (lógica de frequência)
- Busca se já existe DailyRecord correspondente
- Status: pending/completed/missed

---

**3.3. Buscar Eventos Institucionais**

```typescript
async getInstitutionalEvents(
  startDate: Date,
  endDate: Date,
  tenantId: string,
  userRole: string,
  isRT?: boolean,
): Promise<AgendaItem[]>
```

**Lógica de visibilidade:**
- **Admin:** vê todos (ALL_USERS, RT_ONLY, ADMIN_ONLY)
- **RT (Responsável Técnico):** vê ALL_USERS e RT_ONLY
- **Outros:** vê apenas ALL_USERS

---

## Backend - Controllers e Endpoints

**Arquivo:** `apps/backend/src/resident-schedule/resident-schedule.controller.ts`

### Endpoints REST

#### Configurações (ResidentScheduleConfig)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/resident-schedule/configs` | Criar configuração recorrente | MANAGE_RESIDENT_SCHEDULE |
| GET | `/resident-schedule/configs` | Listar todas as configs do tenant | VIEW_RESIDENT_SCHEDULE |
| GET | `/resident-schedule/configs/resident/:residentId` | Configs de um residente | VIEW_RESIDENT_SCHEDULE |
| PATCH | `/resident-schedule/configs/:id` | Atualizar configuração | MANAGE_RESIDENT_SCHEDULE |
| DELETE | `/resident-schedule/configs/:id` | Deletar configuração (soft delete) | MANAGE_RESIDENT_SCHEDULE |

#### Alimentação (Batch Operations)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/resident-schedule/configs/alimentacao` | Criar 6 configs de alimentação | MANAGE_RESIDENT_SCHEDULE |
| PATCH | `/resident-schedule/configs/alimentacao/:residentId` | Atualizar horários das 6 refeições | MANAGE_RESIDENT_SCHEDULE |
| DELETE | `/resident-schedule/configs/alimentacao/:residentId` | Deletar todas as 6 configs | MANAGE_RESIDENT_SCHEDULE |

#### Eventos Agendados (ResidentScheduledEvent)

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/resident-schedule/events` | Criar evento agendado | MANAGE_RESIDENT_SCHEDULE |
| GET | `/resident-schedule/events/resident/:residentId` | Eventos de um residente | VIEW_RESIDENT_SCHEDULE |
| PATCH | `/resident-schedule/events/:id` | Atualizar evento | MANAGE_RESIDENT_SCHEDULE |
| DELETE | `/resident-schedule/events/:id` | Deletar evento (soft delete) | MANAGE_RESIDENT_SCHEDULE |

#### Tarefas Diárias

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/resident-schedule/tasks/resident/:residentId/daily?date=YYYY-MM-DD` | Tarefas de um residente | VIEW_RESIDENT_SCHEDULE |
| GET | `/resident-schedule/tasks/daily?date=YYYY-MM-DD` | Tarefas de todos os residentes | VIEW_RESIDENT_SCHEDULE |

#### Agenda Consolidada

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/resident-schedule/agenda/items` | Agenda consolidada (suporta múltiplos modos) | VIEW_RESIDENT_SCHEDULE |
| GET | `/resident-schedule/agenda/institutional-events` | Eventos institucionais | VIEW_RESIDENT_SCHEDULE |

**Exemplos de queries para agenda consolidada:**

```bash
# Single date (visualização diária)
GET /resident-schedule/agenda/items?date=2024-01-11

# Range query (visualização semanal/mensal)
GET /resident-schedule/agenda/items?startDate=2024-01-08&endDate=2024-01-14

# Com filtros de conteúdo
GET /resident-schedule/agenda/items?date=2024-01-11&filters=medications,vaccinations,feeding

# Com filtro de status
GET /resident-schedule/agenda/items?date=2024-01-11&statusFilter=pending

# Por residente
GET /resident-schedule/agenda/items?date=2024-01-11&residentId=uuid-resident
```

---

## Backend - DTOs

### CreateScheduleConfigDto

```typescript
class CreateScheduleConfigDto {
  @IsUUID()
  residentId: string

  @IsEnum(RecordType)
  recordType: RecordType

  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number  // 0-6 (apenas para WEEKLY)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number  // 1-31 (apenas para MONTHLY)

  @IsArray()
  @IsString({ each: true })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { each: true })
  suggestedTimes: string[]  // ["08:00", "14:00"]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  notes?: string
}
```

**Validações customizadas:**
- DAILY: não pode ter dayOfWeek nem dayOfMonth
- WEEKLY: deve ter dayOfWeek, não pode ter dayOfMonth
- MONTHLY: deve ter dayOfMonth, não pode ter dayOfWeek

---

### CreateAlimentacaoConfigDto

```typescript
class CreateAlimentacaoConfigDto {
  @IsUUID()
  residentId: string

  @ValidateNested()
  @Type(() => MealTimesDto)
  mealTimes: MealTimesDto

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  notes?: string
}

class MealTimesDto {
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  cafeDaManha: string  // "08:00"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  colacao: string  // "10:00"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  almoco: string  // "12:00"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  lanche: string  // "14:00"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  jantar: string  // "18:00"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  ceia: string  // "20:00"
}
```

---

### CreateScheduledEventDto

```typescript
class CreateScheduledEventDto {
  @IsUUID()
  residentId: string

  @IsEnum(ScheduledEventType)
  eventType: ScheduledEventType

  @IsDateString()
  scheduledDate: string  // "YYYY-MM-DD"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  scheduledTime: string  // "HH:mm"

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => VaccineDataDto)
  vaccineData?: VaccineDataDto

  @IsOptional()
  @IsString()
  notes?: string
}

class VaccineDataDto {
  @IsString()
  name: string  // "Influenza (H1N1)"

  @IsString()
  dose: string  // "1ª dose"

  @IsOptional()
  @IsString()
  manufacturer?: string  // "Instituto Butantan"

  @IsOptional()
  @IsString()
  batchNumber?: string  // "LOT2024-001"
}
```

---

### GetAgendaItemsDto

```typescript
class GetAgendaItemsDto {
  @IsOptional()
  @IsDateString()
  date?: string  // "YYYY-MM-DD" (modo single date)

  @IsOptional()
  @IsDateString()
  startDate?: string  // "YYYY-MM-DD" (modo range query)

  @IsOptional()
  @IsDateString()
  endDate?: string  // "YYYY-MM-DD" (modo range query)

  @IsOptional()
  @IsUUID()
  residentId?: string

  @IsOptional()
  @IsArray()
  @IsEnum(ContentFilterType, { each: true })
  filters?: ContentFilterType[]

  @IsOptional()
  @IsEnum(StatusFilterType)
  statusFilter?: StatusFilterType  // 'all' | 'pending' | 'completed' | 'missed' | 'cancelled'
}
```

---

## Frontend - Páginas

### 1. AgendaPage

**Localização:** `apps/frontend/src/pages/agenda/AgendaPage.tsx`

**Propósito:** Hub central para visualização de agenda consolidada.

**Estados principais:**

```typescript
const [selectedDate, setSelectedDate] = useState<Date>(new Date())
const [viewType, setViewType] = useState<ViewType>('daily') // daily | weekly | monthly | period
const [scope, setScope] = useState<ScopeType>('general') // general | institutional | resident | prescriptions
const [residentId, setResidentId] = useState<string | null>(null)
const [contentFilters, setContentFilters] = useState<ContentFilterType[]>([])
const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all')
```

**Persistência em localStorage:**
- Salva preferências do usuário (viewType, scope, filters)
- Restaura ao reabrir a página

**Componentes renderizados condicionalmente:**

```typescript
{scope === 'general' && viewType === 'daily' && <DailyView />}
{scope === 'general' && viewType === 'weekly' && <WeeklyView />}
{scope === 'general' && viewType === 'monthly' && <MonthlyView />}
{scope === 'institutional' && <DailyViewInstitutional />}
{scope === 'resident' && residentId && <ResidentAgendaView />}
{scope === 'prescriptions' && <PrescriptionsView />}
```

**Filtros disponíveis:**
- Conteúdo: Medicamentos, Vacinas, Consultas, Alimentação, Higiene, etc
- Status: Todos, Pendentes, Concluídos, Perdidos, Cancelados

---

### 2. ResidentScheduleTab

**Localização:** `apps/frontend/src/components/resident-schedule/ResidentScheduleTab.tsx`

**Propósito:** Gerenciamento de agenda do residente individual (dentro do perfil do residente).

**Tabs:**

1. **Configurações de Registros:** Manage ResidentScheduleConfig
   - Drag-and-drop para criar configs
   - Lista de configs existentes
   - Suporte especial para ALIMENTACAO (cria 6 configs em batch)

2. **Agendamentos Pontuais:** Manage ResidentScheduledEvent
   - Lista de eventos agendados
   - Criar/editar/deletar eventos
   - Filtro por tipo de evento

**Fluxo drag-and-drop:**

```
RecordTypeCard (draggable)
  → dropzone (DAILY | WEEKLY | MONTHLY)
    → Abre modal de configuração
      → Salva ResidentScheduleConfig
```

**Fluxo especial ALIMENTACAO:**

```
RecordTypeCard (ALIMENTACAO)
  → dropzone DAILY
    → Abre AlimentacaoConfigModal com 6 campos de horário
      → Salva 6 ResidentScheduleConfig em batch
```

---

## Frontend - Componentes

### Componentes de Visualização

**1. DailyView**
- Visualização diária por residente ou todos
- Agrupa itens por residente
- Ordenação por horário
- Cards clicáveis (abre DayDetailModal)

**2. WeeklyView**
- Visualização semanal (7 colunas)
- Cada dia mostra resumo de tarefas
- Navegação anterior/próxima semana
- Clique no dia abre DayDetailModal

**3. MonthlyView**
- Visualização mensal (calendário)
- Cada dia mostra badges com quantidade de tarefas por tipo
- Cores diferentes para status (pendente, concluído, perdido)
- Clique no dia abre DayDetailModal

**4. PrescriptionsView**
- Visualização específica de medicamentos
- Lista prescrições ativas
- Mostra horários de administração
- Status de administração (pendente/concluído/perdido)

**5. DailyViewInstitutional**
- Eventos institucionais do dia
- Filtragem por visibilidade (baseada em role)
- Cards com detalhes do evento

---

### Componentes Auxiliares

**6. AgendaFilters**
- Checkboxes para filtros de conteúdo
- Select para filtro de status
- Badges mostrando filtros ativos
- Botão "Limpar filtros"

**7. AgendaItemCard**
```typescript
interface AgendaItemCardProps {
  item: AgendaItem
  onClick?: () => void
}
```
- Card individual de item da agenda
- Badge de tipo (Medicamento, Vacina, Alimentação, etc)
- Badge de status (Pendente, Concluído, Perdido, Cancelado)
- Ícone específico por tipo
- Horário formatado
- Informações do residente

**8. DayDetailModal**
- Modal que abre ao clicar em um dia
- Lista todos os itens daquele dia
- Permite marcar tarefas como concluídas
- Permite criar novo registro diário
- Navegação entre dias (anterior/próximo)

---

## Frontend - Hooks React Query

### 1. useAgendaItems

```typescript
const {
  data: agendaItems,
  isLoading,
  error,
  refetch,
} = useAgendaItems({
  viewType: 'daily' | 'weekly' | 'monthly',
  selectedDate: Date,
  residentId?: string,
  filters?: ContentFilterType[],
  statusFilter?: StatusFilterType,
})
```

**Lógica interna:**
- Calcula startDate e endDate baseado em viewType
- Chama `GET /resident-schedule/agenda/items` com query params
- Cache key: `['agendaItems', tenantId, startDate, endDate, residentId, filters, statusFilter]`
- Invalidação automática quando DailyRecord ou MedicationAdministration muda

**Exemplo de uso:**

```typescript
function DailyView() {
  const { data: items, isLoading } = useAgendaItems({
    viewType: 'daily',
    selectedDate: new Date(),
    filters: [ContentFilterType.MEDICATIONS, ContentFilterType.FEEDING],
    statusFilter: 'pending',
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      {items?.map(item => (
        <AgendaItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

---

### 2. useResidentSchedule

```typescript
const {
  // Queries
  configs,
  events,
  isLoadingConfigs,
  isLoadingEvents,

  // Mutations para configs
  createConfig,
  updateConfig,
  deleteConfig,
  createAlimentacaoConfigs,
  updateAlimentacaoConfigs,
  deleteAlimentacaoConfigs,

  // Mutations para events
  createEvent,
  updateEvent,
  deleteEvent,
} = useResidentSchedule(residentId)
```

**Operações disponíveis:**

**Configs:**
```typescript
// Criar config individual
await createConfig.mutateAsync({
  recordType: RecordType.HIGIENE,
  frequency: ScheduleFrequency.DAILY,
  suggestedTimes: ['08:00', '20:00'],
})

// Criar 6 configs de alimentação
await createAlimentacaoConfigs.mutateAsync({
  mealTimes: {
    cafeDaManha: '08:00',
    colacao: '10:00',
    almoco: '12:00',
    lanche: '14:00',
    jantar: '18:00',
    ceia: '20:00',
  },
})

// Atualizar config
await updateConfig.mutateAsync({
  id: 'uuid-config',
  data: { suggestedTimes: ['09:00', '21:00'] },
})

// Deletar config
await deleteConfig.mutateAsync('uuid-config')
```

**Events:**
```typescript
// Criar evento
await createEvent.mutateAsync({
  eventType: ScheduledEventType.VACCINATION,
  scheduledDate: '2024-03-15',
  scheduledTime: '10:00',
  title: 'Vacina Influenza 2024',
  vaccineData: {
    name: 'Influenza (H1N1)',
    dose: '1ª dose',
  },
})

// Atualizar evento
await updateEvent.mutateAsync({
  id: 'uuid-event',
  data: { scheduledTime: '14:00' },
})

// Marcar como concluído
await updateEvent.mutateAsync({
  id: 'uuid-event',
  data: {
    status: ScheduledEventStatus.COMPLETED,
    completedRecordId: 'uuid-daily-record',
  },
})

// Deletar evento
await deleteEvent.mutateAsync('uuid-event')
```

**Invalidação automática:**
- Após qualquer mutation, invalida queries:
  - `['residentScheduleConfigs', residentId]`
  - `['residentScheduledEvents', residentId]`
  - `['agendaItems', ...]` (todas as variações)
  - `['dailyTasks', ...]` (todas as variações)

---

### 3. useInstitutionalEvents

```typescript
const {
  data: events,
  isLoading,
} = useInstitutionalEvents({
  date: Date,
})
```

**Lógica:**
- Busca eventos institucionais para a data
- Filtra por visibilidade baseada em role do usuário
- Cache key: `['institutionalEvents', tenantId, dateStr]`

---

## Fluxos de Dados

### Fluxo 1: Criar Agenda Recorrente

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - ResidentScheduleTab                              │
│                                                              │
│ 1. Usuário arrasta RecordTypeCard para dropzone DAILY       │
│ 2. Abre CreateScheduleConfigModal                           │
│ 3. Preenche formulário:                                     │
│    - recordType: HIGIENE                                    │
│    - frequency: DAILY                                       │
│    - suggestedTimes: ["08:00", "20:00"]                     │
│ 4. Clica em "Salvar"                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - useResidentSchedule.createConfig              │
│                                                              │
│ 5. Valida formulário com Zod                                │
│ 6. Chama POST /resident-schedule/configs                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND - ResidentScheduleController                        │
│                                                              │
│ 7. Valida permissão MANAGE_RESIDENT_SCHEDULE                │
│ 8. Valida DTO com class-validator                           │
│ 9. Chama ResidentScheduleService.createConfig()             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND - ResidentScheduleService                           │
│                                                              │
│ 10. Valida frequência:                                      │
│     - DAILY não pode ter dayOfWeek/dayOfMonth               │
│ 11. Verifica duplicatas:                                    │
│     - WHERE residentId + recordType + frequency + day       │
│ 12. Salva em ResidentScheduleConfig                         │
│ 13. Log de auditoria                                        │
│ 14. Cria notificação para gestores                          │
│ 15. Retorna config criada                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - Invalidação e Refetch                         │
│                                                              │
│ 16. Invalida queries:                                       │
│     - ['residentScheduleConfigs', residentId]               │
│     - ['agendaItems', ...]                                  │
│     - ['dailyTasks', ...]                                   │
│ 17. Toast de sucesso                                        │
│ 18. Fecha modal                                             │
│ 19. Lista de configs é atualizada automaticamente           │
└─────────────────────────────────────────────────────────────┘
```

---

### Fluxo 2: Gerar Tarefas Diárias (Cálculo de Agenda)

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - AgendaPage / DailyView                           │
│                                                              │
│ 1. Usuário seleciona data: 11/01/2024                       │
│ 2. Seleciona viewType: 'daily'                              │
│ 3. Aplica filtros: [MEDICATIONS, FEEDING]                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - useAgendaItems                                │
│                                                              │
│ 4. Calcula startDate = 11/01/2024 00:00:00                  │
│ 5. Calcula endDate = 11/01/2024 23:59:59                    │
│ 6. Chama GET /resident-schedule/agenda/items                │
│    ?date=2024-01-11&filters=medications,feeding             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND - AgendaService.getAgendaItems()                    │
│                                                              │
│ 7. Determina modo: Single Date                              │
│ 8. startDate = 2024-01-11 00:00:00                          │
│ 9. endDate = 2024-01-11 23:59:59                            │
│                                                              │
│ 10. PARALELO - Busca 3 fontes:                              │
│     ┌────────────────────────────────┐                      │
│     │ A. getMedicationItems()        │                      │
│     │ - Prescrições ativas           │                      │
│     │ - Horários agendados           │                      │
│     │ - Verifica administração       │                      │
│     │ - Status: pending/completed    │                      │
│     └────────────────────────────────┘                      │
│     ┌────────────────────────────────┐                      │
│     │ B. getScheduledEventItems()    │                      │
│     │ - Eventos com scheduledDate    │                      │
│     │ - Status: SCHEDULED/COMPLETED  │                      │
│     │ - Se data passada: MISSED      │                      │
│     └────────────────────────────────┘                      │
│     ┌────────────────────────────────┐                      │
│     │ C. getRecurringRecordItems()   │                      │
│     │ - Configs ativas               │                      │
│     │ - Aplica lógica de frequência: │                      │
│     │   * DAILY: sempre gera         │                      │
│     │   * WEEKLY: se dayOfWeek match │                      │
│     │   * MONTHLY: se dayOfMonth mtch│                      │
│     │ - Busca DailyRecords           │                      │
│     │ - Status: pending/completed    │                      │
│     └────────────────────────────────┘                      │
│                                                              │
│ 11. Combina arrays em agendaItems[]                         │
│ 12. Aplica filtros de conteúdo (MEDICATIONS, FEEDING)       │
│ 13. Aplica filtros de status (se houver)                    │
│ 14. Ordena por scheduledTime                                │
│ 15. Retorna AgendaItem[]                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - DailyView                                        │
│                                                              │
│ 16. Recebe agendaItems:                                     │
│     [                                                        │
│       {                                                      │
│         type: 'MEDICATION',                                 │
│         medicationName: 'Losartana 50mg',                   │
│         scheduledTime: '08:00',                             │
│         status: 'pending',                                  │
│       },                                                     │
│       {                                                      │
│         type: 'RECURRING_RECORD',                           │
│         recordType: 'ALIMENTACAO',                          │
│         mealType: 'Café da Manhã',                          │
│         scheduledTime: '08:00',                             │
│         status: 'completed',                                │
│         completedAt: '2024-01-11T08:15:00Z',                │
│       },                                                     │
│     ]                                                        │
│ 17. Renderiza AgendaItemCard para cada item                 │
│ 18. Agrupa por residente                                    │
│ 19. Ordena por horário                                      │
└─────────────────────────────────────────────────────────────┘
```

---

### Fluxo 3: Marcar Evento como Concluído

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - AgendaItemCard                                   │
│                                                              │
│ 1. Usuário clica em evento pendente:                        │
│    - "Vacina Influenza 2024" (SCHEDULED)                    │
│ 2. Abre DayDetailModal                                      │
│ 3. Clica em "Marcar como Concluído"                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - useResidentSchedule.updateEvent               │
│                                                              │
│ 4. Chama PATCH /resident-schedule/events/:id                │
│    Body: {                                                   │
│      status: 'COMPLETED',                                   │
│      completedRecordId: null, // ou UUID de DailyRecord     │
│    }                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND - ResidentScheduleService.updateEvent()             │
│                                                              │
│ 5. Busca evento existente                                   │
│ 6. Valida tenant ownership                                  │
│ 7. Atualiza campos:                                         │
│    - status = 'COMPLETED'                                   │
│    - completedAt = now()                                    │
│    - completedRecordId (se fornecido)                       │
│ 8. Salva em ResidentScheduledEvent                          │
│ 9. Log de auditoria                                         │
│ 10. Retorna evento atualizado                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - Invalidação                                   │
│                                                              │
│ 11. Invalida queries:                                       │
│     - ['residentScheduledEvents', residentId]               │
│     - ['agendaItems', ...]                                  │
│ 12. Toast de sucesso: "Evento marcado como concluído"       │
│ 13. Fecha modal                                             │
│ 14. Agenda é atualizada (status muda para COMPLETED)        │
└─────────────────────────────────────────────────────────────┘
```

---

### Fluxo 4: Criar Agendamento Pontual (Vacina)

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - ResidentScheduleTab                              │
│                                                              │
│ 1. Usuário clica em "Novo Agendamento"                      │
│ 2. Abre CreateScheduledEventModal                           │
│ 3. Preenche formulário:                                     │
│    - eventType: VACCINATION                                 │
│    - scheduledDate: 15/03/2024                              │
│    - scheduledTime: 10:00                                   │
│    - title: "Vacina Influenza 2024"                         │
│    - vaccineData:                                           │
│      * name: "Influenza (H1N1)"                             │
│      * dose: "1ª dose"                                      │
│      * manufacturer: "Instituto Butantan"                   │
│      * batchNumber: "LOT2024-001"                           │
│ 4. Clica em "Salvar"                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - useResidentSchedule.createEvent               │
│                                                              │
│ 5. Valida formulário com Zod                                │
│ 6. Chama POST /resident-schedule/events                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND - ResidentScheduleService.createEvent()             │
│                                                              │
│ 7. Valida residente existe e pertence ao tenant             │
│ 8. Cria ResidentScheduledEvent:                             │
│    - status = SCHEDULED                                     │
│    - vaccineData = { name, dose, manufacturer, batchNumber }│
│ 9. Salva no banco                                           │
│ 10. Cria notificação automática:                            │
│     - category: SCHEDULED_EVENT                             │
│     - type: SCHEDULED_EVENT_DUE                             │
│     - scheduledFor: 15/03/2024 10:00                        │
│ 11. Log de auditoria                                        │
│ 12. Retorna evento criado                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ REACT QUERY - Invalidação                                   │
│                                                              │
│ 13. Invalida queries:                                       │
│     - ['residentScheduledEvents', residentId]               │
│     - ['agendaItems', ...]                                  │
│ 14. Toast de sucesso: "Evento agendado com sucesso"         │
│ 15. Fecha modal                                             │
│ 16. Lista de eventos é atualizada                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Integrações com Outros Módulos

### 1. Integração com DailyRecords

**Mapeamento de Tipos:**
- `ResidentScheduleConfig.recordType` → `DailyRecord.type`
- Quando tarefa recorrente é marcada como concluída, cria-se um `DailyRecord`

**Fluxo:**
```
ResidentScheduleConfig (template)
  → Gera DailyTask (tarefa do dia)
    → Usuário registra execução
      → Cria DailyRecord
        → DailyTask.isCompleted = true
```

**Metadados especiais:**
- Para `ALIMENTACAO`, `metadata.mealType` é armazenado em `DailyRecord.data`

**Exemplo:**
```typescript
// Config
{
  recordType: 'ALIMENTACAO',
  metadata: { mealType: 'Café da Manhã' },
  suggestedTimes: ['08:00'],
}

// DailyRecord criado
{
  type: 'ALIMENTACAO',
  date: '2024-01-11',
  time: '08:15',
  data: {
    mealType: 'Café da Manhã',
    ingeriu: 'Bem (>75%)',
    observacoes: 'Aceitou bem',
  },
}
```

---

### 2. Integração com Notifications

**Eventos que Criam Notificações:**

1. **Nova Config Criada:**
   - Categoria: `DAILY_RECORD`
   - Tipo: `SCHEDULE_CONFIG_CREATED`
   - Destinatários: Gestores

2. **Evento Agendado:**
   - Categoria: `SCHEDULED_EVENT`
   - Tipo: `SCHEDULED_EVENT_DUE`
   - scheduledFor: data/hora do evento
   - Destinatários: Enfermeiros e gestores

3. **Reagendamento:**
   - Categoria: `SCHEDULED_EVENT`
   - Tipo: `SCHEDULED_EVENT_RESCHEDULED`
   - Destinatários: Mesmos do evento original

4. **Tarefa Perdida (MISSED):**
   - Categoria: `DAILY_RECORD`
   - Tipo: `TASK_MISSED`
   - Enviado quando tarefa recorrente não foi feita

---

### 3. Integração com Medications

**Consolidação na Agenda:**
- `AgendaService.getMedicationItems()` busca prescrições ativas
- Para cada medicamento, itera cada dia do intervalo
- Para cada horário agendado (`schedule.times`), cria um `AgendaItem`

**Verificação de Administração:**
```typescript
// Para cada horário de medicamento agendado
const wasAdministered = await this.prisma.medicationAdministration.findFirst({
  where: {
    prescriptionId: prescription.id,
    administeredDate: targetDate,
    administeredTime: scheduledTime,
    status: 'ADMINISTERED',
  },
})

const status = wasAdministered
  ? 'completed'
  : isPastTime
  ? 'missed'
  : 'pending'
```

**Exemplo de AgendaItem de medicamento:**
```typescript
{
  id: 'uuid-prescription-1-08:00',
  type: 'MEDICATION',
  category: 'Medicamento',
  residentName: 'João Silva',
  title: 'Losartana 50mg',
  scheduledDate: '2024-01-11',
  scheduledTime: '08:00',
  status: 'completed',
  completedAt: '2024-01-11T08:05:00Z',
  completedBy: 'uuid-user',
  medicationName: 'Losartana',
  dosage: '50mg',
  prescriptionId: 'uuid-prescription-1',
}
```

---

### 4. Integração com Vaccinations

**Campo Específico `vaccineData`:**
- Quando `eventType = VACCINATION`, armazena dados estruturados:
  - `name`: Nome da vacina
  - `dose`: Qual dose (1ª, 2ª, reforço)
  - `manufacturer`: Fabricante
  - `batchNumber`: Número do lote

**Fluxo:**
```
Evento VACCINATION agendado
  → Aparece na agenda como item de tipo SCHEDULED_EVENT
    → Quando concluído, pode criar DailyRecord de tipo OUTROS
      → Ou simplesmente marca evento como COMPLETED
```

---

### 5. Integração com Conformidade (RDC 502/2021)

**Cálculo de Cobertura:**
- Usa `ResidentScheduleService.getAllActiveConfigs()` para obter configurações obrigatórias
- Compara com `DailyRecords` efetivamente criados
- Calcula % de cobertura de registros obrigatórios

**Indicadores:**
- **Taxa de Cumprimento de Higiene:** Compara configs de HIGIENE vs registros feitos
- **Taxa de Cumprimento de Alimentação:** 6 refeições esperadas vs registradas
- **Taxa de Monitoramento:** Configs de MONITORAMENTO vs registros de sinais vitais

**Dashboard de Conformidade:**
- Exibe métricas de cobertura por tipo de registro
- Alerta quando cobertura < 80%
- Lista residentes com tarefas pendentes

---

## Casos de Uso Práticos

### Caso de Uso 1: Criar Agenda de Alimentação para Residente

**Contexto:** Enfermeiro deseja configurar horários de refeições para novo residente.

**Passos:**

1. Acessa perfil do residente
2. Abre aba "Agenda"
3. Arrasta card "ALIMENTACAO" para zona "DAILY"
4. Abre modal com 6 campos de horário:
   ```
   Café da Manhã: 08:00
   Colação:       10:00
   Almoço:        12:00
   Lanche:        14:00
   Jantar:        18:00
   Ceia:          20:00
   ```
5. Clica em "Salvar"

**Resultado:**
- 6 `ResidentScheduleConfig` criadas
- Cada uma com `recordType = ALIMENTACAO`, `frequency = DAILY`
- Metadados: `{ mealType: "Café da Manhã" }`, etc
- A partir do dia seguinte, aparecem 6 tarefas diárias de alimentação na agenda

**Código TypeScript:**

```typescript
// Frontend - AlimentacaoConfigModal.tsx
const { createAlimentacaoConfigs } = useResidentSchedule(residentId)

const handleSubmit = async (data: AlimentacaoFormData) => {
  await createAlimentacaoConfigs.mutateAsync({
    residentId,
    mealTimes: {
      cafeDaManha: data.cafeDaManha,
      colacao: data.colacao,
      almoco: data.almoco,
      lanche: data.lanche,
      jantar: data.jantar,
      ceia: data.ceia,
    },
    notes: data.notes,
  })

  toast.success('Agenda de alimentação criada com sucesso!')
  onClose()
}
```

---

### Caso de Uso 2: Visualizar Tarefas Diárias de Todos os Residentes

**Contexto:** Enfermeiro inicia plantão e deseja ver todas as tarefas pendentes do dia.

**Passos:**

1. Acessa `/agenda`
2. Seleciona:
   - Scope: "Geral"
   - View: "Diário"
   - Data: Hoje
3. Aplica filtros:
   - Conteúdo: Medicamentos, Alimentação, Higiene
   - Status: Pendentes
4. Visualiza lista agrupada por residente

**Resultado:**
- Lista consolidada de tarefas pendentes
- Ordenadas por horário
- Cores diferentes por tipo (azul = medicamento, verde = alimentação, amarelo = higiene)
- Clique em item abre modal com detalhes

**Código TypeScript:**

```typescript
// Frontend - DailyView.tsx
const { data: items, isLoading } = useAgendaItems({
  viewType: 'daily',
  selectedDate: new Date(),
  filters: [
    ContentFilterType.MEDICATIONS,
    ContentFilterType.FEEDING,
    ContentFilterType.HYGIENE,
  ],
  statusFilter: 'pending',
})

// Agrupar por residente
const itemsByResident = groupBy(items, 'residentId')

return (
  <div>
    {Object.entries(itemsByResident).map(([residentId, residentItems]) => (
      <ResidentSection key={residentId}>
        <ResidentName>{residentItems[0].residentName}</ResidentName>
        {residentItems.map(item => (
          <AgendaItemCard
            key={item.id}
            item={item}
            onClick={() => openDetailModal(item)}
          />
        ))}
      </ResidentSection>
    ))}
  </div>
)
```

---

### Caso de Uso 3: Registrar Conclusão de Tarefa Recorrente

**Contexto:** Cuidador registra que fez higiene do residente.

**Passos:**

1. Na agenda, clica em item "Higiene Pessoal - 08:00" (pendente)
2. Abre `DayDetailModal`
3. Clica em "Registrar Execução"
4. Preenche modal de DailyRecord:
   ```
   Tipo: HIGIENE
   Horário: 08:15 (executado)
   Local: Banho completo
   Observações: Residente colaborativo
   ```
5. Salva

**Resultado:**
- Cria `DailyRecord` de tipo HIGIENE
- `DailyTask.isCompleted = true`
- Card na agenda muda de amarelo (pendente) para verde (concluído)
- Badge mostra "Concluído às 08:15 por Maria Silva"

**Código TypeScript:**

```typescript
// Frontend - DayDetailModal.tsx
const { createDailyRecord } = useDailyRecords()
const { refetch: refetchAgenda } = useAgendaItems(...)

const handleCompleteTask = async (task: DailyTask) => {
  // Abre modal de registro
  const recordData = await openDailyRecordModal({
    residentId: task.residentId,
    type: task.recordType,
    date: selectedDate,
    suggestedTime: task.suggestedTimes[0],
  })

  // Cria DailyRecord
  await createDailyRecord.mutateAsync(recordData)

  // Agenda é atualizada automaticamente (invalidação React Query)
  toast.success('Tarefa registrada com sucesso!')
}
```

---

### Caso de Uso 4: Agendar Consulta Médica

**Contexto:** Responsável técnico agenda consulta com geriatra para residente.

**Passos:**

1. Acessa perfil do residente
2. Abre aba "Agenda"
3. Vai para tab "Agendamentos Pontuais"
4. Clica em "Novo Agendamento"
5. Preenche formulário:
   ```
   Tipo: Consulta
   Data: 20/03/2024
   Horário: 14:00
   Título: Consulta com Dr. João (Geriatra)
   Descrição: Reavaliação semestral
   Observações: Levar exames de sangue recentes
   ```
6. Salva

**Resultado:**
- `ResidentScheduledEvent` criado com status SCHEDULED
- Notificação automática criada para enfermeiros e RT
- Aparece na agenda do residente no dia 20/03/2024 às 14:00
- Badge azul "Consulta"

**Código TypeScript:**

```typescript
// Frontend - CreateScheduledEventModal.tsx
const { createEvent } = useResidentSchedule(residentId)

const handleSubmit = async (data: ScheduledEventFormData) => {
  await createEvent.mutateAsync({
    residentId,
    eventType: ScheduledEventType.CONSULTATION,
    scheduledDate: formatISO(data.date, { representation: 'date' }),
    scheduledTime: data.time,
    title: data.title,
    description: data.description,
    notes: data.notes,
  })

  toast.success('Consulta agendada com sucesso!')
  onClose()
}
```

---

### Caso de Uso 5: Agendar Vacinação com Dados Completos

**Contexto:** Enfermeiro agenda vacinação de campanha anual.

**Passos:**

1. Acessa perfil do residente
2. Abre aba "Agenda" → "Agendamentos Pontuais"
3. Clica em "Novo Agendamento"
4. Seleciona tipo "Vacinação"
5. Preenche formulário completo:
   ```
   Data: 15/03/2024
   Horário: 10:00
   Título: Vacina Influenza 2024
   Descrição: Campanha anual de vacinação

   DADOS DA VACINA:
   - Nome: Influenza (H1N1)
   - Dose: 1ª dose
   - Fabricante: Instituto Butantan
   - Lote: LOT2024-001

   Observações: Residente sem alergias conhecidas
   ```
6. Salva

**Resultado:**
- `ResidentScheduledEvent` criado com `vaccineData` estruturado
- Notificação para enfermeiros 24h antes
- No dia, aparece na agenda com badge roxo "Vacinação"
- Ao clicar, mostra todos os dados da vacina

**Código TypeScript:**

```typescript
// Frontend - CreateVaccinationEventModal.tsx
const { createEvent } = useResidentSchedule(residentId)

const handleSubmit = async (data: VaccinationFormData) => {
  await createEvent.mutateAsync({
    residentId,
    eventType: ScheduledEventType.VACCINATION,
    scheduledDate: formatISO(data.date, { representation: 'date' }),
    scheduledTime: data.time,
    title: data.title,
    description: data.description,
    vaccineData: {
      name: data.vaccineName,
      dose: data.dose,
      manufacturer: data.manufacturer,
      batchNumber: data.batchNumber,
    },
    notes: data.notes,
  })

  toast.success('Vacinação agendada com sucesso!')
  onClose()
}

// Quando evento é concluído, vaccineData é preservado
const completedEvent = {
  ...event,
  status: 'COMPLETED',
  completedAt: new Date(),
  vaccineData: {
    name: 'Influenza (H1N1)',
    dose: '1ª dose',
    manufacturer: 'Instituto Butantan',
    batchNumber: 'LOT2024-001',
  },
}
```

---

### Caso de Uso 6: Visualizar Agenda Semanal

**Contexto:** Coordenador deseja ver todas as tarefas da semana para planejar escalas.

**Passos:**

1. Acessa `/agenda`
2. Seleciona:
   - Scope: "Geral"
   - View: "Semanal"
   - Semana: 08/01 a 14/01/2024
3. Visualiza grid com 7 colunas (dias da semana)
4. Cada dia mostra resumo:
   ```
   Segunda (08/01)
   - 45 tarefas pendentes
   - 12 medicamentos
   - 30 registros obrigatórios
   - 3 eventos agendados
   ```

**Resultado:**
- Visão macro da carga de trabalho da semana
- Identificação de dias críticos (muitas tarefas)
- Clique em dia abre modal com lista completa

**Código TypeScript:**

```typescript
// Frontend - WeeklyView.tsx
const { data: items } = useAgendaItems({
  viewType: 'weekly',
  selectedDate: startOfWeek(new Date()),
})

// Agrupar por dia
const itemsByDay = groupByDay(items)

return (
  <WeekGrid>
    {eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
      const dayItems = itemsByDay[formatISO(day, { representation: 'date' })] || []
      const pendingCount = dayItems.filter(i => i.status === 'pending').length

      return (
        <DayColumn key={day.toString()} onClick={() => openDayModal(day)}>
          <DayHeader>{format(day, 'EEE dd/MM', { locale: ptBR })}</DayHeader>
          <TaskSummary>
            {pendingCount} tarefas pendentes
          </TaskSummary>
          <CategoryBadges>
            <Badge color="blue">
              {countByType(dayItems, 'MEDICATION')} medicamentos
            </Badge>
            <Badge color="green">
              {countByType(dayItems, 'RECURRING_RECORD')} registros
            </Badge>
            <Badge color="purple">
              {countByType(dayItems, 'SCHEDULED_EVENT')} eventos
            </Badge>
          </CategoryBadges>
        </DayColumn>
      )
    })}
  </WeekGrid>
)
```

---

### Caso de Uso 7: Reagendar Evento

**Contexto:** Consulta agendada precisa ser remarcada.

**Passos:**

1. Na agenda, clica em "Consulta com Dr. João - 20/03 14:00"
2. Abre modal de detalhes do evento
3. Clica em "Editar"
4. Altera:
   ```
   Data: 25/03/2024 (nova data)
   Horário: 16:00 (novo horário)
   ```
5. Salva

**Resultado:**
- `ResidentScheduledEvent.scheduledDate` atualizado para 25/03
- `ResidentScheduledEvent.scheduledTime` atualizado para 16:00
- Nova notificação criada: "Consulta reagendada para 25/03 às 16:00"
- Evento some da agenda do dia 20/03 e aparece no dia 25/03

**Código TypeScript:**

```typescript
// Frontend - EditScheduledEventModal.tsx
const { updateEvent } = useResidentSchedule(residentId)

const handleSubmit = async (data: EditEventFormData) => {
  const oldDate = event.scheduledDate
  const oldTime = event.scheduledTime

  await updateEvent.mutateAsync({
    id: event.id,
    data: {
      scheduledDate: formatISO(data.date, { representation: 'date' }),
      scheduledTime: data.time,
      title: data.title,
      description: data.description,
    },
  })

  // Backend detecta mudança de data/hora e cria notificação automática
  toast.success('Evento reagendado com sucesso!')
  onClose()
}
```

---

## Tratamento de Dados Especiais

### 1. Alimentação (6 Configs em Batch)

**Problema:** Criar 6 configurações individuais seria tedioso.

**Solução:** DTO especializado `CreateAlimentacaoConfigDto` com 6 campos de horário.

**Estrutura de Dados:**

```typescript
// Input (DTO)
{
  residentId: 'uuid-resident',
  mealTimes: {
    cafeDaManha: '08:00',
    colacao: '10:00',
    almoco: '12:00',
    lanche: '14:00',
    jantar: '18:00',
    ceia: '20:00',
  },
}

// Output (6 ResidentScheduleConfig)
[
  {
    recordType: 'ALIMENTACAO',
    frequency: 'DAILY',
    suggestedTimes: ['08:00'],
    metadata: { mealType: 'Café da Manhã' },
  },
  {
    recordType: 'ALIMENTACAO',
    frequency: 'DAILY',
    suggestedTimes: ['10:00'],
    metadata: { mealType: 'Colação' },
  },
  // ... mais 4
]
```

**Lógica de Transaction:**

```typescript
// Backend - ResidentScheduleService
async createAlimentacaoConfigs(dto, tenantId, userId) {
  return this.prisma.$transaction(async tx => {
    const configs = []

    for (const [mealType, time] of Object.entries(MEAL_TYPES)) {
      const config = await tx.residentScheduleConfig.create({
        data: {
          tenantId,
          residentId: dto.residentId,
          recordType: RecordType.ALIMENTACAO,
          frequency: ScheduleFrequency.DAILY,
          suggestedTimes: [dto.mealTimes[mealType]],
          metadata: { mealType: MEAL_LABELS[mealType] },
          createdBy: userId,
        },
      })
      configs.push(config)
    }

    return configs
  })
}

const MEAL_TYPES = {
  cafeDaManha: 'Café da Manhã',
  colacao: 'Colação',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
}
```

---

### 2. Lógica de Frequência com Fallback

**Problema:** Config pede dia 31, mas mês tem apenas 28 dias (fevereiro).

**Solução:** Se `config.dayOfMonth > último dia do mês`, gera tarefa no último dia.

**Código:**

```typescript
private shouldGenerateTask(config: ResidentScheduleConfig, targetDate: Date): boolean {
  if (config.frequency === ScheduleFrequency.MONTHLY) {
    const dayOfMonth = targetDate.getDate()
    const lastDayOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    ).getDate()

    // Fallback: se config pede dia 31 em fevereiro (28 dias),
    // gera tarefa no último dia do mês
    if (config.dayOfMonth > lastDayOfMonth) {
      return dayOfMonth === lastDayOfMonth
    }

    return dayOfMonth === config.dayOfMonth
  }

  // ... outras frequências
}
```

**Exemplo:**
```
Config: dayOfMonth = 31 (aferição mensal de peso no dia 31)

Fevereiro 2024 (29 dias):
  → shouldGenerateTask(config, 29/02/2024) = true
  → Gera tarefa no dia 29 (último dia)

Março 2024 (31 dias):
  → shouldGenerateTask(config, 31/03/2024) = true
  → Gera tarefa no dia 31
```

---

### 3. Timezone Handling

**Problema:** Data atual varia conforme timezone do tenant.

**Solução:** Usar `tenant.timezone` para calcular data atual.

**Código:**

```typescript
// Util helper
import { utcToZonedTime } from 'date-fns-tz'

export function getCurrentDateInTz(timezone: string): Date {
  return utcToZonedTime(new Date(), timezone)
}

// Uso em ResidentScheduleTasksService
async getDailyTasksByResident(residentId, tenantId, dateStr?) {
  const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
  const targetDate = dateStr
    ? parseISO(dateStr)
    : getCurrentDateInTz(tenant.timezone)

  // ... resto da lógica
}
```

**Por quê?**
- Tenant em São Paulo (UTC-3): 23:00 = ainda dia 11/01
- Tenant em Manaus (UTC-4): 23:00 = ainda dia 11/01
- Servidor em UTC: 02:00 = já é dia 12/01

---

### 4. Status Automático de Eventos (MISSED)

**Problema:** Eventos com data passada mas status SCHEDULED devem ser marcados como MISSED.

**Solução:** Lógica em `getScheduledEventItems()` detecta automaticamente.

**Código:**

```typescript
private async getScheduledEventItems(startDate, endDate, tenantId, residentId?) {
  const events = await this.prisma.residentScheduledEvent.findMany({
    where: {
      tenantId,
      residentId,
      scheduledDate: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
  })

  const now = new Date()

  return events.map(event => {
    let status = event.status

    // Se status = SCHEDULED mas data/hora já passou, marca como MISSED
    if (
      status === ScheduledEventStatus.SCHEDULED &&
      new Date(`${event.scheduledDate}T${event.scheduledTime}`) < now
    ) {
      status = ScheduledEventStatus.MISSED
    }

    return {
      ...event,
      status, // Status ajustado
      type: 'SCHEDULED_EVENT',
      category: this.getEventCategory(event.eventType),
    }
  })
}
```

---

### 5. Validação de Duplicatas

**Problema:** Prevenir criação de configs duplicadas (mesmo residente + recordType + frequência + dia).

**Solução:** Verificação antes de salvar.

**Código:**

```typescript
async createConfig(dto, tenantId, userId) {
  // Verificar duplicata
  const existing = await this.prisma.residentScheduleConfig.findFirst({
    where: {
      tenantId,
      residentId: dto.residentId,
      recordType: dto.recordType,
      frequency: dto.frequency,
      ...(dto.dayOfWeek !== undefined && { dayOfWeek: dto.dayOfWeek }),
      ...(dto.dayOfMonth !== undefined && { dayOfMonth: dto.dayOfMonth }),
      deletedAt: null,
    },
  })

  if (existing) {
    throw new ConflictException(
      `Já existe uma configuração de ${dto.recordType} com esta frequência para este residente`,
    )
  }

  // ... continua criação
}
```

---

## Troubleshooting

### Problema 1: Tarefas recorrentes não aparecem na agenda

**Sintomas:**
- Config foi criada com sucesso
- Mas não aparece na agenda do dia

**Causas possíveis:**

1. **Config desativada:**
   ```sql
   SELECT * FROM resident_schedule_configs
   WHERE id = 'uuid-config'
   AND is_active = false  -- ⚠️ Config inativa
   ```
   **Solução:** Ativar config via `updateConfig({ isActive: true })`

2. **Frequência não aplica neste dia:**
   ```typescript
   // Config: WEEKLY, dayOfWeek = 1 (Segunda)
   // Data consultada: Terça (dayOfWeek = 2)
   // ❌ Não gera tarefa
   ```
   **Solução:** Verificar se frequência está correta

3. **Soft deleted:**
   ```sql
   SELECT * FROM resident_schedule_configs
   WHERE id = 'uuid-config'
   AND deleted_at IS NOT NULL  -- ⚠️ Config deletada
   ```
   **Solução:** Recriar config

---

### Problema 2: Evento agendado aparece como MISSED mesmo estando no futuro

**Sintomas:**
- Evento com data futura
- Mas status aparece como MISSED

**Causa:**
- Timezone incorreto no servidor ou frontend

**Debug:**
```typescript
// Verificar timezone do tenant
const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
console.log('Tenant timezone:', tenant.timezone)

// Verificar data/hora calculada
const eventDateTime = new Date(`${event.scheduledDate}T${event.scheduledTime}`)
const now = new Date()
console.log('Event:', eventDateTime)
console.log('Now:', now)
console.log('Is past?', eventDateTime < now)
```

**Solução:**
- Garantir que `tenant.timezone` está correto
- Usar `utcToZonedTime` para comparações de data

---

### Problema 3: Tarefa marcada como concluída mas aparece como pendente

**Sintomas:**
- DailyRecord foi criado
- Mas tarefa ainda aparece pendente na agenda

**Causa:**
- Mismatch de data ou tipo entre config e DailyRecord

**Debug:**
```typescript
// Verificar DailyRecord criado
const record = await prisma.dailyRecord.findFirst({
  where: {
    residentId: 'uuid-resident',
    type: 'HIGIENE',
    date: new Date('2024-01-11'),
  },
})
console.log('Record:', record)

// Verificar lógica de matching em getDailyTasksByResident
// Condição: record.type === config.recordType && record.date === targetDate
```

**Solução:**
- Garantir que `DailyRecord.type` = `ResidentScheduleConfig.recordType`
- Garantir que `DailyRecord.date` corresponde ao dia consultado

---

### Problema 4: Alimentação cria apenas 1 config em vez de 6

**Sintomas:**
- Chamou `createAlimentacaoConfigs()`
- Mas apenas 1 config foi criada

**Causa:**
- Erro em transaction não foi capturado
- Verificação de duplicata bloqueou criação

**Debug:**
```typescript
// Verificar logs de erro
// Verificar se já existem configs de alimentação
const existing = await prisma.residentScheduleConfig.findMany({
  where: {
    residentId: 'uuid-resident',
    recordType: 'ALIMENTACAO',
    deletedAt: null,
  },
})
console.log('Existing alimentacao configs:', existing.length)
```

**Solução:**
- Se já existem configs, deletar primeiro: `deleteAlimentacaoConfigs()`
- Ou usar `updateAlimentacaoConfigs()` para atualizar horários

---

### Problema 5: Agenda consolidada muito lenta (timeout)

**Sintomas:**
- Requisição para `/agenda/items` demora > 10s
- Timeout em produção

**Causas:**
- Muitos residentes ativos (> 100)
- Intervalo de datas muito grande (> 30 dias)
- Falta de índices no banco

**Soluções:**

1. **Limitar intervalo de datas:**
   ```typescript
   // Frontend - limitar range query a max 31 dias
   if (differenceInDays(endDate, startDate) > 31) {
     toast.error('Selecione um período de no máximo 31 dias')
     return
   }
   ```

2. **Adicionar paginação:**
   ```typescript
   // Backend - AgendaService
   async getAgendaItems(dto, tenantId) {
     const { page = 1, limit = 50 } = dto
     const skip = (page - 1) * limit

     // ... buscar items

     return {
       items: items.slice(skip, skip + limit),
       total: items.length,
       page,
       limit,
     }
   }
   ```

3. **Verificar índices:**
   ```sql
   -- Confirmar índices existem
   \d resident_schedule_configs
   -- Deve ter: [tenantId, residentId], [residentId, isActive]

   \d resident_scheduled_events
   -- Deve ter: [tenantId, scheduledDate], [residentId, scheduledDate]
   ```

---

## Roadmap

### Versão 1.1 (Próxima)

- [ ] **Recorrência Personalizada:** Permitir configs como "a cada 2 dias", "quinzenal"
- [ ] **Templates de Agenda:** Criar templates pré-configurados (ex: "Agenda Padrão ILPI")
- [ ] **Exportação PDF:** Exportar agenda semanal/mensal em PDF
- [ ] **Notificações Push:** Enviar push notification para app mobile quando tarefa está próxima

### Versão 1.2

- [ ] **Agenda de Equipe:** Visualizar agenda de profissionais (escalas, plantões)
- [ ] **Check-in/Check-out:** Registrar execução de tarefa via QR Code
- [ ] **Dashboard Analítico:** Métricas de cumprimento de agenda por residente/setor
- [ ] **Integração com Google Calendar:** Sincronizar eventos agendados

### Versão 2.0

- [ ] **Agenda Inteligente:** Sugestão automática de horários com base em histórico
- [ ] **Priorização de Tarefas:** Sistema de prioridade (urgente, alta, média, baixa)
- [ ] **Reagendamento em Massa:** Alterar horários de múltiplas configs de uma vez
- [ ] **Workflow de Aprovação:** Eventos críticos requerem aprovação de RT antes de criar

### Melhorias Técnicas

- [ ] **Cache Redis:** Cachear cálculo de tarefas diárias (invalidar ao criar DailyRecord)
- [ ] **Índice Composto:** `[tenantId, residentId, scheduledDate]` para queries de agenda
- [ ] **Job Scheduler:** Cron job para marcar eventos como MISSED automaticamente
- [ ] **Audit Trail Completo:** Rastrear todas as mudanças em configs e events (versionamento)

---

## Contribuindo

### Adicionando Novo Tipo de Evento

**Passo 1:** Adicionar enum em `enums.prisma`
```prisma
enum ScheduledEventType {
  VACCINATION
  CONSULTATION
  EXAM
  PROCEDURE
  THERAPY  // ✨ Novo tipo
  OTHER
}
```

**Passo 2:** Atualizar mapeamento de categoria em `AgendaService`
```typescript
private getEventCategory(eventType: ScheduledEventType): string {
  const map = {
    VACCINATION: 'Vacinação',
    CONSULTATION: 'Consulta',
    EXAM: 'Exame',
    PROCEDURE: 'Procedimento',
    THERAPY: 'Terapia',  // ✨ Novo mapeamento
    OTHER: 'Outro',
  }
  return map[eventType] || 'Evento'
}
```

**Passo 3:** Adicionar ao `ContentFilterType` em DTOs
```typescript
enum ContentFilterType {
  // ...
  THERAPIES = 'therapies',  // ✨ Novo filtro
}
```

**Passo 4:** Atualizar frontend - `AgendaFilters.tsx`
```typescript
const filterOptions = [
  // ...
  { value: 'therapies', label: 'Terapias', icon: HeartPulse },  // ✨
]
```

---

### Adicionando Novo RecordType Recorrente

**Passo 1:** Já existe em `RecordType` enum? Se não, adicionar em `enums.prisma`
```prisma
enum RecordType {
  // ... existentes
  MEDICACAO  // ✨ Novo tipo (se ainda não existe)
}
```

**Passo 2:** Permitir criação de config deste tipo em frontend
```typescript
// ResidentScheduleTab.tsx
const availableRecordTypes = [
  { value: RecordType.HIGIENE, label: 'Higiene', icon: Bath },
  // ...
  { value: RecordType.MEDICACAO, label: 'Medicação', icon: Pill },  // ✨
]
```

**Passo 3:** Adicionar ao `ContentFilterType`
```typescript
enum ContentFilterType {
  // ...
  MEDICATION_RECORDS = 'medication_records',  // ✨
}
```

---

**Fim da Documentação - Módulo de Agenda v1.0.0**
