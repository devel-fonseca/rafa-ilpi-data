# Módulo: Registros Diários (Daily Records)

**Status:** ✅ Refatorado e Otimizado
**Versão:** 2.1.0
**Última atualização:** 22/02/2026

---

## 📋 Visão Geral

Sistema completo de registros diários de cuidados com residentes, com suporte a **13 tipos diferentes de registro**, **versionamento completo com auditoria**, **detecção automática de intercorrências**, **integração com Eventos Sentinela** e **sincronização automática com sinais vitais**. Implementa compliance total com **RDC 502/2021 da ANVISA** para ILPIs.

### Atualização Técnica (22/02/2026)

As regras abaixo refletem a implementação atual e **prevalecem** sobre fluxos antigos descritos neste documento:

- Registros de **MONITORAMENTO anormal** não criam intercorrência automática.
  - O sistema gera alerta persistido e Admin/RT decide confirmar ou descartar intercorrência.
- O `IncidentInterceptorService` agora aplica fluxo híbrido:
  - **alerta clínico persistido** para sinais de baixa/média certeza (ex.: episódios diarreicos < 3/24h, risco de desnutrição, suspeita de lesão cutânea);
  - **alerta clínico persistido com limiar atingido** para cenários que exigem decisão de RT/Admin (ex.: diarreia >= 3 episódios/24h e risco de desidratação associado);
  - **intercorrência automática** somente para regras operacionais diretas (ex.: recusa alimentar, engasgo, alterações comportamentais críticas, suspeita de úlcera por observação).
- Alertas clínicos não-vitais são persistidos em `vital_sign_alerts` com `vitalSignId` opcional.

---

## 🎯 Funcionalidades Principais

### Features v2.0

- ✅ **13 tipos de registro** (HIGIENE, ALIMENTACAO, HIDRATACAO, MONITORAMENTO, ELIMINACAO, COMPORTAMENTO, HUMOR, SONO, PESO, INTERCORRENCIA, ATIVIDADES, VISITA, OUTROS)
- ✅ **Versionamento completo** - Histórico imutável de todas as alterações com auditoria granular
- ✅ **Detecção clínica automática** - IncidentInterceptorService analisa padrões e decide entre alerta persistido ou intercorrência automática conforme regra
- ✅ **Integração com Eventos Sentinela** - Rastreamento obrigatório de quedas com lesão e tentativas de suicídio
- ✅ **Sincronização com Sinais Vitais** - Registros de MONITORAMENTO criam/atualizam VitalSign automaticamente
- ✅ **Compliance RDC 502/2021** - Campos obrigatórios para indicadores mensais (mortalidade, doenças, úlceras, desnutrição)
- ✅ **Exportação PDF** - Relatórios diários completos
- ✅ **Dashboard Clínico** - Visão consolidada de informações clínicas do residente
- ✅ **Agendamento de Tarefas** - Sistema de tarefas recorrentes (ResidentScheduleConfig)
- ✅ **Eventos Agendados** - Vacinações, consultas, exames (ResidentScheduledEvent)
- ✅ **Soft Delete Pattern** - Recuperação de registros deletados
- ✅ **Timezone-safe** - Tratamento correto de datas considerando timezone do tenant
- ✅ **Padronização de Altura** - Input em CM, armazenamento em metros

---

## 🏗️ Arquitetura

### Backend

#### Modelos Prisma

**DailyRecord** (`apps/backend/prisma/schema/daily-records.prisma`)

```prisma
model DailyRecord {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Tipo e metadados
  type RecordType
  date DateTime   @db.Date // Data do registro (sem hora)
  time String // Hora no formato "HH:mm" (ex: "07:00", "14:30")

  // Dados estruturados (JSON) - cada tipo tem sua própria estrutura
  data Json @default("{}")

  // ─────────────────────────────────────────────────────────────
  // CAMPOS PARA INTERCORRÊNCIAS E RDC 502/2021 (opcionais)
  // ─────────────────────────────────────────────────────────────
  incidentCategory          IncidentCategory?
  incidentSubtypeClinical   IncidentSubtypeClinical?
  incidentSubtypeAssist     IncidentSubtypeAssistencial?
  incidentSubtypeAdmin      IncidentSubtypeAdministrativa?
  incidentSeverity          IncidentSeverity?
  isEventoSentinela         Boolean @default(false)
  isDoencaNotificavel       Boolean @default(false)
  rdcIndicators             Json    @default("[]") // Array de RdcIndicatorType
  notificadoVigilancia      Boolean @default(false)
  dataNotificacao           DateTime? @db.Timestamptz(3)
  protocoloNotificacao      String?   @db.VarChar(100)

  // Responsável pelo registro
  recordedBy String // Nome do profissional
  userId     String @db.Uuid // ID do usuário que fez o registro

  // Observações gerais (opcional)
  notes String? @db.Text

  // Auditoria
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  history  DailyRecordHistory[]
  sentinelEventNotifications SentinelEventNotification[]
}
```

**DailyRecordHistory** - Versionamento com Auditoria Completa

```prisma
model DailyRecordHistory {
  id            String @id @default(uuid()) @db.Uuid
  recordId      String @db.Uuid
  tenantId      String @db.Uuid
  versionNumber Int // Número sequencial da versão (1, 2, 3...)

  // Dados da versão anterior (snapshot completo)
  previousData Json // Snapshot completo do estado anterior

  // Dados da nova versão (para comparação)
  newData Json // Snapshot completo do novo estado

  // Campos alterados (array de nomes de campos: ["time", "data.pressao"])
  changedFields Json @default("[]")

  // Auditoria da mudança
  changeType    String // "UPDATE" ou "DELETE"
  changeReason  String   @db.Text // Motivo obrigatório da mudança
  changedBy     String   @db.Uuid // ID do usuário que fez a mudança
  changedByName String // Nome do usuário que fez a mudança
  changedAt     DateTime @default(now()) @db.Timestamptz(3)

  // IP e User Agent para auditoria adicional
  ipAddress String? @db.VarChar(45)
  userAgent String? @db.Text

  // Relações
  record DailyRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
  tenant Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

**ResidentScheduleConfig** - Tarefas Recorrentes

```prisma
model ResidentScheduleConfig {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Tipo de registro obrigatório (usa enum RecordType existente)
  recordType RecordType

  // Frequência de recorrência (DAILY, WEEKLY, MONTHLY)
  frequency ScheduleFrequency

  // Configurações específicas por frequência
  dayOfWeek  Int? // 0-6 (apenas para WEEKLY)
  dayOfMonth Int? // 1-31 (apenas para MONTHLY)

  // Horários sugeridos - array de strings "HH:mm"
  // Ex: ["08:00", "14:00"] para 2x ao dia
  suggestedTimes Json @default("[]")

  // Status
  isActive Boolean @default(true)

  // Observações
  notes String? @db.Text

  // Metadados extras (JSON)
  metadata Json? @default("{}")
}
```

**ResidentScheduledEvent** - Eventos Agendados (Vacinação, Consultas, Exames)

```prisma
model ResidentScheduledEvent {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Tipo de evento (VACCINATION, CONSULTATION, EXAM, etc)
  eventType ScheduledEventType

  // Data e hora do agendamento
  scheduledDate DateTime @db.Date
  scheduledTime String // HH:mm

  // Detalhes do evento
  title       String // Ex: "Vacina Influenza - 1ª dose"
  description String? @db.Text

  // Campos específicos para vacinas (quando eventType = VACCINATION)
  vaccineData Json? // {vaccine, dose, manufacturer, etc}

  // Status (SCHEDULED, COMPLETED, CANCELLED, MISSED)
  status ScheduledEventStatus @default(SCHEDULED)

  // Referência ao registro criado (quando status = COMPLETED)
  completedRecordId String?   @db.Uuid
  completedAt       DateTime? @db.Timestamptz(3)
}
```

**SentinelEventNotification** - Rastreamento de Eventos Sentinela

```prisma
model SentinelEventNotification {
  id             String @id @default(uuid()) @db.Uuid
  tenantId       String @db.Uuid
  dailyRecordId  String @db.Uuid
  notificationId String @db.Uuid

  eventType String @db.VarChar(100) // QUEDA_COM_LESAO, TENTATIVA_SUICIDIO

  status String @default("PENDENTE") @db.VarChar(50) // PENDENTE, ENVIADO, CONFIRMADO

  protocolo          String?   @db.VarChar(100)
  dataEnvio          DateTime? @db.Timestamptz(3)
  dataConfirmacao    DateTime? @db.Timestamptz(3)
  responsavelEnvio   String?   @db.Uuid
  emailEnviado       Boolean   @default(false)
  emailEnviadoEm     DateTime? @db.Timestamptz(3)
  emailDestinatarios Json?     @default("[]")

  observacoes String? @db.Text
  metadata    Json?   @db.JsonB
}
```

#### Enums

**RecordType** (`apps/backend/prisma/schema/enums.prisma`)

```prisma
enum RecordType {
  HIGIENE          // Banho, higiene oral, troca de fralda
  ALIMENTACAO      // Refeições (café, almoço, jantar, lanches)
  HIDRATACAO       // Ingestão de líquidos
  MONITORAMENTO    // Sinais vitais (PA, FC, Temp, SpO2, Glicemia)
  ELIMINACAO       // Urina, fezes
  COMPORTAMENTO    // Estado emocional, humor, atividades
  HUMOR            // Específico para estado emocional
  SONO             // Qualidade do sono, horários
  PESO             // Pesagem periódica, IMC
  INTERCORRENCIA   // Quedas, vômitos, eventos adversos
  ATIVIDADES       // Atividades recreativas, terapêuticas
  VISITA           // Registro de visitas familiares
  OUTROS           // Outros registros não categorizados
}
```

**IncidentCategory**

```prisma
enum IncidentCategory {
  CLINICA        // Intercorrências clínicas (saúde)
  ASSISTENCIAL   // Intercorrências assistenciais (cuidados)
  ADMINISTRATIVA // Intercorrências administrativas (gestão)
}
```

**IncidentSubtypeClinical** - 25 subtipos

```prisma
enum IncidentSubtypeClinical {
  QUEDA_COM_LESAO          // ⚠️ Evento Sentinela - notificação obrigatória
  QUEDA_SEM_LESAO
  TENTATIVA_SUICIDIO       // ⚠️ Evento Sentinela - notificação obrigatória
  DOENCA_DIARREICA_AGUDA   // 📊 Indicador RDC (incidência)
  DESIDRATACAO             // 📊 Indicador RDC (incidência)
  ULCERA_DECUBITO          // 📊 Indicador RDC (prevalência)
  DESNUTRICAO              // 📊 Indicador RDC (prevalência)
  ESCABIOSE                // 📊 Indicador RDC (incidência)
  FEBRE_HIPERTERMIA
  HIPOTERMIA
  HIPOGLICEMIA
  HIPERGLICEMIA
  CONVULSAO
  ALTERACAO_CONSCIENCIA
  DOR_TORACICA
  DISPNEIA
  VOMITO
  SANGRAMENTO
  REACAO_ALERGICA
  OBITO                    // 📊 Indicador RDC (mortalidade)
  OUTRA_CLINICA
}
```

**IncidentSeverity**

```prisma
enum IncidentSeverity {
  LEVE      // Sem impacto significativo
  MODERADA  // Requer atenção
  GRAVE     // Requer intervenção imediata
  CRITICA   // Risco de vida ou Evento Sentinela
}
```

**RdcIndicatorType** - Indicadores RDC 502/2021 (ANVISA)

```prisma
enum RdcIndicatorType {
  MORTALIDADE           // Taxa de mortalidade
  DIARREIA_AGUDA       // Taxa de incidência de doença diarreica aguda
  ESCABIOSE            // Taxa de incidência de escabiose
  DESIDRATACAO         // Taxa de incidência de desidratação
  ULCERA_DECUBITO      // Taxa de prevalência de úlcera de decúbito
  DESNUTRICAO          // Taxa de prevalência de desnutrição
}
```

---

## 🔧 Serviços Backend

### DailyRecordsService

**Localização:** [apps/backend/src/daily-records/daily-records.service.ts](../../apps/backend/src/daily-records/daily-records.service.ts)

#### Principais Métodos

```typescript
// Criar registro diário
async create(dto: CreateDailyRecordDto, tenantId: string, userId: string)

// Buscar todos os registros (com paginação e filtros)
async findAll(query: QueryDailyRecordDto, tenantId: string)

// Buscar registros de um residente em uma data específica
async findByResidentAndDate(residentId: string, date: string, tenantId: string)

// Atualizar registro (com versionamento automático)
async update(id: string, dto: UpdateDailyRecordDto, tenantId: string, userId: string, userName: string)

// Remover registro (soft delete com versionamento)
async remove(id: string, deleteDto: { deleteReason: string }, tenantId: string, userId: string, userName: string)

// Buscar histórico de versões
async getHistory(id: string, tenantId: string)

// Restaurar versão anterior
async restoreVersion(recordId: string, versionId: string, restoreReason: string, tenantId: string, userId: string, userName: string)

// Buscar último registro de cada residente (otimizado com SQL RAW)
async findLatestByResidents(tenantId: string)

// Buscar últimos N registros de um residente
async findLatestByResident(residentId: string, tenantId: string, limit: number = 3)

// Buscar último sinal vital de um residente
async findLastVitalSign(residentId: string, tenantId: string)

// Buscar sinais vitais consolidados (último valor de cada parâmetro)
async findConsolidatedVitalSigns(residentId: string, tenantId: string)
```

#### Funcionalidades Automáticas no Create

1. **Validação de Residente** - Verifica se o residente existe e pertence ao tenant
2. **Validação de Formato de Hora** - Garante formato HH:mm
3. **Timezone-safe Date Handling** - Usa `parseISO` com meio-dia (`T12:00:00`) para evitar shifts de timezone
4. **Detecção Automática de Intercorrências** - Chama `IncidentInterceptorService.analyzeAndCreateIncidents()`
5. **Emissão de Evento Assíncrono** - `eventEmitter.emit('daily-record.created')` para processamento pelo `SentinelEventsService`
6. **Sincronização com Sinais Vitais** - Se tipo = MONITORAMENTO, cria/atualiza `VitalSign` automaticamente

#### Funcionalidades Automáticas no Update

1. **Versionamento** - Calcula próximo número de versão e cria snapshot completo do estado anterior
2. **Identificação de Campos Alterados** - Compara valores antigos vs novos
3. **Transação Prisma** - Garante consistência entre update do registro e criação do histórico
4. **Sincronização com Sinais Vitais** - Atualiza `VitalSign` se tipo = MONITORAMENTO e houve mudança nos dados vitais

#### Funcionalidades Automáticas no Delete

1. **Soft Delete** - Define `deletedAt` ao invés de deletar fisicamente
2. **Versionamento** - Cria registro no histórico com `changeType: 'DELETE'`
3. **Sincronização com Sinais Vitais** - Deleta `VitalSign` correspondente se tipo = MONITORAMENTO

---

### IncidentInterceptorService

**Localização:** [apps/backend/src/daily-records/incident-interceptor.service.ts](../../apps/backend/src/daily-records/incident-interceptor.service.ts)

**Propósito:** Detectar automaticamente intercorrências com base em padrões específicos nos registros diários, implementando as regras da RDC 502/2021 da ANVISA.

#### Fluxo de Detecção Automática

```
DailyRecordsService.create()
  └─> IncidentInterceptorService.analyzeAndCreateIncidents()
       ├─> checkEliminacao() - Detecta episódios diarreicos e risco de desidratação
       │    └─> createAutoClinicalAlert() - Cria alerta persistido (sem intercorrência automática)
       ├─> checkAlimentacao() - Detecta recusa alimentar, desnutrição, vômito
       ├─> checkComportamento() - Detecta agitação, agressividade
       └─> checkHigiene() - Detecta úlceras de decúbito
            └─> createAutoIncident() - Cria intercorrência automática quando a regra exige ação imediata
```

#### Regras de Detecção

**1. ELIMINACAO → Episódio diarreico em monitoramento**

- **Critério:** Consistência = "diarréica" OU "líquida"
- **Ação:** Cria alerta persistido `DIARRHEA_EPISODE_MONITORING` com deduplicação diária
- **Decisão clínica:** Admin/RT confirma ou descarta intercorrência a partir do alerta
- **Indicador RDC:** candidato a `DIARREIA_AGUDA` (confirmação posterior)

**2. ELIMINACAO → Limiar atingido (>= 3 episódios/24h)**

- **Critério:** ≥ 3 evacuações diarreicas no mesmo dia
- **Ação:** Cria dois alertas persistidos:
  - Suspeita de DDA (`DIARRHEA_EPISODE_MONITORING`, severidade WARNING)
  - Risco de desidratação associado (`DIARRHEA_EPISODE_MONITORING`, severidade CRITICAL, `clinicalContext: DEHYDRATION_RISK`)
- **Decisão clínica:** Admin/RT confirma ou descarta intercorrência
- **Indicadores RDC:** candidatos a `DIARREIA_AGUDA` e/ou `DESIDRATACAO` conforme confirmação

**3. ALIMENTACAO → Recusa Alimentar**

- **Critério:** `ingeriu = "Recusou"` OU `ingeriu = "<25%"`
- **Ação:** Cria intercorrência `RECUSA_ALIMENTACAO` (severidade: MODERADA ou LEVE)
- **Indicador RDC:** Nenhum (mas pode levar a desnutrição)

**4. ALIMENTACAO → Desnutrição (Indicador RDC)**

- **Critério:** ≥ 2 recusas alimentares no mesmo dia
- **Ação:** Cria intercorrência `DESNUTRICAO` (severidade: GRAVE)
- **Indicador RDC:** `DESNUTRICAO`

**5. ALIMENTACAO → Intercorrências durante refeição**

- **Critério:** `intercorrencia != "Nenhuma"` (Engasgo, Vômito, Náusea)
- **Ação:** Cria intercorrência correspondente
- **Severidade:** Engasgo = GRAVE, Vômito = MODERADA, Náusea = LEVE

**6. COMPORTAMENTO → Alterações Emocionais**

- **Critério:** `estadoEmocional = "Ansioso" | "Irritado" | "Eufórico"`
- **Ação:** Cria intercorrência `AGITACAO_PSICOMOTORA` ou `AGRESSIVIDADE`
- **Severidade:** Ansioso = LEVE, Irritado = MODERADA, Eufórico = MODERADA

**7. HIGIENE → Úlcera de Decúbito (Indicador RDC)**

- **Critério:** Observações contêm palavras-chave ("lesão", "úlcera", "ferida", "escara", "decúbito", "vermelhidão", "bolha")
- **Ação:** Cria intercorrência `ULCERA_DECUBITO` (severidade: GRAVE)
- **Indicador RDC:** `ULCERA_DECUBITO`

#### Prevenção de Duplicatas

- Verifica se já existe intercorrência idêntica (mesmo residente, mesma data, mesma categoria e subtipo) antes de criar
- Evita múltiplas intercorrências para o mesmo evento

---

## 🎨 Frontend

### Estrutura de Arquivos

```
apps/frontend/src/pages/daily-records/
├── index.tsx                        # Exportação centralizada
├── ResidentSelectionPage.tsx       # Página de seleção de residente
├── ResidentRecordsPage.tsx         # Página principal de registros do dia
├── components/
│   ├── DailyRecordActions.tsx      # Ações (editar, deletar, histórico)
│   ├── DailyRecordsOverviewStats.tsx # Cards de estatísticas
│   └── DailyRecordsStatsCards.tsx  # Mini-cards resumidos
└── modals/
    ├── HigieneModal.tsx
    ├── AlimentacaoModal.tsx
    ├── HidratacaoModal.tsx
    ├── MonitoramentoModal.tsx
    ├── EliminacaoModal.tsx
    ├── ComportamentoModal.tsx
    ├── HumorModal.tsx
    ├── SonoModal.tsx
    ├── PesoModal.tsx
    ├── IntercorrenciaModal.tsx
    ├── AtividadesModal.tsx
    ├── VisitaModal.tsx
    ├── OutrosModal.tsx
    ├── EditDailyRecordModal.tsx     # Modal de edição genérico
    └── DeleteDailyRecordModal.tsx   # Modal de exclusão
```

### Componentes Principais

#### ResidentRecordsPage

**Rota:** `/dashboard/daily-records/:residentId?date=YYYY-MM-DD`

**Funcionalidades:**
- Seleção de data via query string
- Busca de registros do residente na data selecionada
- 13 botões de ações rápidas (um para cada tipo de registro)
- Lista de registros do dia (timeline)
- Exportação para PDF
- Informações clínicas do residente (alergias, condições crônicas, restrições alimentares)
- Painel de tarefas pendentes (DailyTasksPanel)

**Hooks Utilizados:**
```tsx
const { data: resident } = useQuery(['resident', residentId])
const { data: records } = useQuery(['daily-records', residentId, selectedDate])
const { data: allergies } = useAllergiesByResident(residentId)
const { data: conditions } = useConditionsByResident(residentId)
const { data: dietaryRestrictions } = useDietaryRestrictionsByResident(residentId)

const createMutation = useMutation({
  mutationFn: (data) => api.post('/daily-records', data),
  onSuccess: () => {
    invalidateAfterDailyRecordMutation(queryClient, residentId, selectedDate)
    toast.success('Registro adicionado com sucesso!')
  }
})
```

#### DailyTasksPanel

**Localização:** [apps/frontend/src/components/daily-records/DailyTasksPanel.tsx](../../apps/frontend/src/components/daily-records/DailyTasksPanel.tsx)

**Propósito:** Exibir tarefas pendentes do dia (baseado em ResidentScheduleConfig) e eventos agendados (ResidentScheduledEvent).

**Funcionalidades:**
- Lista de tarefas recorrentes configuradas para o residente
- Lista de eventos agendados para o dia (vacinação, consulta, exame)
- Indicadores visuais de status (PENDENTE, CONCLUÍDO, ATRASADO)
- Botão de ação rápida para registrar a tarefa/evento

#### Modais de Registro

Cada tipo de registro possui um modal específico com campos customizados:

**HigieneModal:**
- Tipo de higiene (Banho Completo, Banho Leito, Higiene Oral, Troca Fralda, Higiene Íntima)
- Observações

**AlimentacaoModal:**
- Refeição (Café da Manhã, Lanche da Manhã, Almoço, Lanche da Tarde, Jantar, Ceia)
- Quanto ingeriu (100%, 75%, 50%, 25%, <25%, Recusou)
- Intercorrência (Nenhuma, Vômito, Engasgo, Náusea, Recusa)
- Observações

**HidratacaoModal:**
- Tipo de líquido (Água, Suco, Chá, Café, Leite, Refrigerante, Sopa, Outro)
- Quantidade (ml)
- Observações

**MonitoramentoModal:**
- Pressão Arterial (120/80 format)
- Temperatura (°C)
- Frequência Cardíaca (bpm)
- Saturação O2 (%)
- Glicemia (mg/dL)
- Observações

**IntercorrenciaModal:**
- Categoria (CLINICA, ASSISTENCIAL, ADMINISTRATIVA)
- Subtipo (dropdown dinâmico baseado na categoria)
- Severidade (LEVE, MODERADA, GRAVE, CRITICA)
- Descrição detalhada
- Ação tomada
- Checkbox: É Evento Sentinela?
- Checkbox: É Doença Notificável?
- Indicadores RDC selecionáveis

---

## 📊 Fluxo de Dados

### Criação de Registro Diário

```
1. Usuário abre modal de registro (ex: AlimentacaoModal)
2. Preenche formulário (refeição, ingestão, intercorrência)
3. Clica em "Salvar"
4. Frontend valida dados com Zod schema
5. Frontend envia POST /api/daily-records
   ├─ tipo: "ALIMENTACAO"
   ├─ data: "2026-01-11"
   ├─ hora: "12:00"
   └─ dados: { refeicao: "Almoço", ingeriu: "Recusou", intercorrencia: "Náusea" }

6. Backend DailyRecordsService.create():
   ├─ Valida residente
   ├─ Cria registro no banco (DailyRecord)
   ├─ Chama IncidentInterceptorService.analyzeAndCreateIncidents()
   │   └─ Detecta padrão: Recusa alimentar → Cria intercorrência automática
   ├─ Emite evento 'daily-record.created'
   │   └─ SentinelEventsService escuta evento
   │       └─ Se isEventoSentinela=true, cria SentinelEventNotification
   └─ Se tipo=MONITORAMENTO, cria/atualiza VitalSign

7. Frontend recebe resposta (201 Created)
8. React Query invalida caches:
   ├─ ['daily-records', residentId, date]
   ├─ ['residents', residentId]
   └─ ['dashboard-stats']

9. UI atualiza automaticamente mostrando novo registro
```

### Detecção de Evento Sentinela (Exemplo: Queda com Lesão)

```
1. Cuidador registra Intercorrência tipo QUEDA_COM_LESAO
2. DailyRecordsService.create() salva registro com:
   ├─ type: INTERCORRENCIA
   ├─ incidentCategory: CLINICA
   ├─ incidentSubtypeClinical: QUEDA_COM_LESAO
   ├─ incidentSeverity: GRAVE
   └─ isEventoSentinela: true ✅

3. EventEmitter dispara 'daily-record.created'
4. SentinelEventsService (listener @OnEvent) processa:
   ├─ Detecta isEventoSentinela = true
   ├─ Cria Notification (severidade: CRITICAL)
   │   └─ Título: "🚨 Evento Sentinela: Queda com Lesão"
   ├─ Cria SentinelEventNotification (status: PENDENTE)
   └─ Badge vermelho aparece em /dashboard/conformidade

5. Gestor é notificado:
   ├─ Contador no NotificationsDropdown
   ├─ Badge "X eventos atrasados >24h" em ConformidadePage
   └─ Email automático (futuro)

6. Gestor acessa /dashboard/conformidade/eventos-sentinela
7. Preenche dados obrigatórios:
   ├─ Descrição detalhada do evento
   ├─ Ações tomadas
   ├─ Notificou autoridades? (checkbox)
   ├─ Data de notificação
   └─ Plano de ação preventiva

8. Atualiza status para NOTIFICADO ou CONCLUIDO
9. Sistema registra timestamp e remove badge de alerta
```

### Sincronização com Sinais Vitais

```
1. Cuidador cria registro tipo MONITORAMENTO:
   ├─ data: "2026-01-11"
   ├─ hora: "08:00"
   └─ dados: {
       pressaoArterial: "120/80",
       temperatura: "36.5",
       frequenciaCardiaca: "72",
       saturacaoO2: "98",
       glicemia: "110"
     }

2. DailyRecordsService.create() detecta tipo = MONITORAMENTO
3. Extrai dados vitais do JSON:
   ├─ systolicBloodPressure: 120
   ├─ diastolicBloodPressure: 80
   ├─ temperature: 36.5
   ├─ heartRate: 72
   ├─ oxygenSaturation: 98
   └─ bloodGlucose: 110

4. Constrói timestamp timezone-safe:
   ├─ Busca timezone do tenant (ex: "America/Sao_Paulo")
   └─ Converte "2026-01-11" + "08:00" para UTC correto

5. Chama VitalSignsService.create():
   ├─ Cria registro em VitalSign
   ├─ VitalSignDetectionService detecta anomalias
   │   └─ Se glicemia > 140: cria alerta HIPERGLICEMIA
   └─ Retorna VitalSign criado

6. Frontend pode exibir:
   ├─ Gráficos de tendência de sinais vitais
   ├─ Alertas de valores anormais
   └─ Histórico clínico consolidado
```

---

## 🔍 Versionamento e Auditoria

### Como Funciona

Toda **alteração** ou **deleção** de um registro diário gera uma **versão no histórico** (`DailyRecordHistory`).

#### Campos Registrados

- `versionNumber` - Número sequencial (1, 2, 3, ...)
- `previousData` - Snapshot completo do estado **antes** da mudança
- `newData` - Snapshot completo do estado **depois** da mudança
- `changedFields` - Array de nomes de campos alterados (ex: `["time", "data.ingeriu"]`)
- `changeType` - "UPDATE" ou "DELETE"
- `changeReason` - Motivo obrigatório da mudança (texto livre)
- `changedBy` - ID do usuário que fez a mudança
- `changedByName` - Nome do usuário (desnormalizado para performance)
- `changedAt` - Timestamp da mudança
- `ipAddress` - IP do usuário (opcional, para auditoria avançada)
- `userAgent` - User Agent do navegador (opcional)

#### Exemplo de Histórico

```json
{
  "recordId": "abc-123",
  "versionNumber": 2,
  "previousData": {
    "type": "ALIMENTACAO",
    "date": "2026-01-11T12:00:00Z",
    "time": "12:00",
    "data": {
      "refeicao": "Almoço",
      "ingeriu": "75%",
      "intercorrencia": "Nenhuma"
    },
    "updatedAt": "2026-01-11T12:05:00Z"
  },
  "newData": {
    "time": "12:30",
    "data": {
      "ingeriu": "50%"
    }
  },
  "changedFields": ["time", "data.ingeriu"],
  "changeType": "UPDATE",
  "changeReason": "Correção do horário e quantidade ingerida após revisão com enfermeira",
  "changedBy": "user-456",
  "changedByName": "Maria Silva",
  "changedAt": "2026-01-11T14:30:00Z"
}
```

### Restauração de Versão

É possível **restaurar** um registro para uma versão anterior:

```typescript
await dailyRecordsService.restoreVersion(
  recordId,
  versionId, // ID da versão do histórico que será restaurada
  'Restauração solicitada pela coordenação após análise',
  tenantId,
  userId,
  userName
)
```

**O que acontece:**
1. Busca registro atual
2. Busca versão do histórico selecionada
3. Cria novo registro no histórico indicando a restauração
4. Atualiza o registro com os dados da versão restaurada
5. Motivo da restauração é prefixado com `[RESTAURAÇÃO vN]`

---

## 🎯 Casos de Uso

### 1. Registrar Banho de Residente

```typescript
POST /api/daily-records

{
  "residentId": "resident-123",
  "type": "HIGIENE",
  "date": "2026-01-11",
  "time": "08:00",
  "recordedBy": "João Cuidador",
  "data": {
    "tipoHigiene": "Banho Completo",
    "observacoes": "Residente colaborativo"
  }
}
```

### 2. Registrar Alimentação com Recusa Automática de Intercorrência

```typescript
POST /api/daily-records

{
  "residentId": "resident-123",
  "type": "ALIMENTACAO",
  "date": "2026-01-11",
  "time": "12:00",
  "recordedBy": "Maria Cuidadora",
  "data": {
    "refeicao": "Almoço",
    "ingeriu": "Recusou", // ⚠️ Trigger de detecção automática
    "intercorrencia": "Náusea"
  }
}

// Backend automaticamente:
// 1. Cria o registro de ALIMENTACAO
// 2. Detecta "Recusou" → Cria intercorrência RECUSA_ALIMENTACAO
// 3. Detecta "Náusea" → Cria intercorrência adicional
```

### 3. Registrar Queda com Lesão (Evento Sentinela)

```typescript
POST /api/daily-records

{
  "residentId": "resident-123",
  "type": "INTERCORRENCIA",
  "date": "2026-01-11",
  "time": "14:30",
  "recordedBy": "Pedro Enfermeiro",
  "incidentCategory": "CLINICA",
  "incidentSubtypeClinical": "QUEDA_COM_LESAO",
  "incidentSeverity": "GRAVE",
  "isEventoSentinela": true, // ⚠️ Evento Sentinela
  "rdcIndicators": ["MORTALIDADE"], // Se evoluir para óbito
  "data": {
    "descricao": "Residente caiu no banheiro e bateu a cabeça",
    "acaoTomada": "Avaliação médica imediata, raio-x craniano solicitado, familiares comunicados",
    "local": "Banheiro do quarto 201",
    "testemunhas": "Cuidadora Ana estava próximo"
  },
  "notes": "Residente estava sozinho no banheiro. Barras de apoio instaladas, mas não utilizadas."
}

// Backend automaticamente:
// 1. Cria o registro de INTERCORRENCIA
// 2. Emite evento 'daily-record.created'
// 3. SentinelEventsService cria:
//    - Notification (CRITICAL)
//    - SentinelEventNotification (status: PENDENTE)
// 4. Badge vermelho aparece em /dashboard/conformidade
// 5. Email enviado para gestores (futuro)
```

### 4. Registrar Sinais Vitais com Detecção de Anomalia

```typescript
POST /api/daily-records

{
  "residentId": "resident-123",
  "type": "MONITORAMENTO",
  "date": "2026-01-11",
  "time": "08:00",
  "recordedBy": "Ana Técnica",
  "data": {
    "pressaoArterial": "180/110", // ⚠️ Hipertensão grave
    "temperatura": "36.5",
    "frequenciaCardiaca": "95",
    "saturacaoO2": "96",
    "glicemia": "120"
  }
}

// Backend automaticamente:
// 1. Cria o registro de MONITORAMENTO
// 2. Extrai dados vitais
// 3. Chama VitalSignsService.create()
//    └─> VitalSignDetectionService detecta PA > 180/110
//        └─> Cria Notification (CRITICAL): "Pressão arterial crítica"
// 4. Registro salvo em VitalSign
// 5. Frontend exibe alerta vermelho no dashboard
```

### 5. Editar Registro com Versionamento

```typescript
PATCH /api/daily-records/{recordId}

{
  "time": "12:30", // Correção de horário
  "data": {
    "ingeriu": "50%" // Correção de quantidade
  },
  "editReason": "Correção do horário e quantidade após revisão com enfermeira"
}

// Backend automaticamente:
// 1. Calcula próximo número de versão (ex: 3)
// 2. Cria snapshot do estado anterior
// 3. Identifica campos alterados: ["time", "data.ingeriu"]
// 4. Cria registro em DailyRecordHistory
// 5. Atualiza DailyRecord
// 6. Se tipo=MONITORAMENTO, atualiza VitalSign correspondente
```

### 6. Deletar Registro com Soft Delete

```typescript
DELETE /api/daily-records/{recordId}

{
  "deleteReason": "Registro duplicado criado por engano"
}

// Backend automaticamente:
// 1. Calcula próximo número de versão
// 2. Cria snapshot do estado final
// 3. Cria registro em DailyRecordHistory (changeType: DELETE)
// 4. Define deletedAt = now()
// 5. Se tipo=MONITORAMENTO, deleta VitalSign correspondente
// 6. Registro não aparece mais nas queries (where: deletedAt=null)
```

### 7. Buscar Histórico de um Registro

```typescript
GET /api/daily-records/{recordId}/history

// Response:
{
  "recordId": "abc-123",
  "recordType": "ALIMENTACAO",
  "totalVersions": 3,
  "history": [
    {
      "id": "hist-3",
      "versionNumber": 3,
      "changeType": "UPDATE",
      "changeReason": "Correção após revisão",
      "changedBy": "user-456",
      "changedByName": "Maria Silva",
      "changedAt": "2026-01-11T14:30:00Z",
      "changedFields": ["time", "data.ingeriu"],
      "previousData": { ... },
      "newData": { ... }
    },
    // ... versões anteriores
  ]
}
```

---

## 🚨 Compliance RDC 502/2021

### Indicadores Mensais Obrigatórios

A RDC 502/2021 da ANVISA exige que ILPIs calculem e reportem mensalmente **6 indicadores**:

1. **Taxa de Mortalidade** (`MORTALIDADE`)
   - Fórmula: (Nº de óbitos no mês / Média de residentes) × 100
   - Trigger: Registro com `incidentSubtypeClinical = OBITO`

2. **Taxa de Incidência de Doença Diarréica Aguda** (`DIARREIA_AGUDA`)
   - Fórmula: (Nº de casos novos / Média de residentes) × 100
   - Trigger: Alerta clínico de diarreia confirmado por Admin/RT (ou inclusão manual no fluxo de revisão)

3. **Taxa de Incidência de Escabiose** (`ESCABIOSE`)
   - Fórmula: (Nº de casos novos / Média de residentes) × 100
   - Trigger: Registro manual de intercorrência

4. **Taxa de Incidência de Desidratação** (`DESIDRATACAO`)
   - Fórmula: (Nº de casos novos / Média de residentes) × 100
   - Trigger: Alerta clínico de risco de desidratação confirmado por Admin/RT (ou inclusão manual no fluxo de revisão)

5. **Taxa de Prevalência de Úlcera de Decúbito** (`ULCERA_DECUBITO`)
   - Fórmula: (Nº de residentes com úlcera / Total de residentes) × 100
   - Trigger: Detectado automaticamente em `checkHigiene()` (keywords nas observações)

6. **Taxa de Prevalência de Desnutrição** (`DESNUTRICAO`)
   - Fórmula: (Nº de residentes desnutridos / Total de residentes) × 100
   - Trigger: Detectado automaticamente em `checkAlimentacao()` (≥2 recusas no dia)

### Cálculo Automático

O sistema possui um modelo `IncidentMonthlyIndicator` que consolida automaticamente os indicadores:

```prisma
model IncidentMonthlyIndicator {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid

  year  Int // 2026
  month Int // 1 (Janeiro)

  indicatorType RdcIndicatorType // Ex: DIARREIA_AGUDA

  numerator   Int   // Casos identificados (ex: 3)
  denominator Int   // Total de residentes (ex: 50)
  rate        Float // Taxa calculada (3/50 * 100 = 6%)

  incidentIds Json @default("[]") // Array de UUIDs dos registros
  metadata    Json? @db.JsonB

  calculatedAt DateTime @default(now())
  calculatedBy String?  @db.Uuid
}
```

### Dashboard de Conformidade

**Rota:** `/dashboard/conformidade/indicadores-mensais`

**Funcionalidades:**
- Visualização dos 6 indicadores mensais
- Comparação mês a mês (gráficos de tendência)
- Drill-down nos casos individuais
- Exportação de relatórios para ANVISA
- Alertas de indicadores acima do limite aceitável

---

## 📈 Performance e Otimizações

### Queries Otimizadas

#### findLatestByResidents() - SQL RAW com DISTINCT ON

```sql
SELECT DISTINCT ON (dr."residentId")
  dr."residentId",
  dr.type,
  dr.date,
  dr.time,
  dr."createdAt"
FROM daily_records dr
WHERE dr."tenantId" = $1::uuid
  AND dr."deletedAt" IS NULL
ORDER BY dr."residentId", dr.date DESC, dr.time DESC, dr."createdAt" DESC
```

**Vantagem:** Mais eficiente que `GROUP BY` + subquery. Retorna último registro de cada residente em **uma única query**.

#### findConsolidatedVitalSigns() - Queries Paralelas

```typescript
const [
  lastBloodPressure,
  lastBloodGlucose,
  lastTemperature,
  lastOxygenSaturation,
  lastHeartRate,
] = await Promise.all([
  // 5 queries paralelas, cada uma busca apenas o último valor do parâmetro
  prisma.vitalSign.findFirst({ where: { systolicBloodPressure: { not: null } }, orderBy: { timestamp: 'desc' } }),
  // ...
])
```

**Vantagem:** Busca consolidada de sinais vitais sem carregar todos os registros. Queries paralelas reduzem latência.

### Índices Prisma

```prisma
@@index([tenantId, residentId, date(sort: Desc)])
@@index([tenantId, date(sort: Desc)])
@@index([residentId, date(sort: Desc), time])
@@index([deletedAt])
@@index([tenantId, type, date(sort: Desc)]) // Registros por tipo (ex: ALIMENTACAO do dia)
@@index([residentId, type, date(sort: Desc)]) // Registros do residente por tipo
@@index([tenantId, date, deletedAt]) // Registros ativos do dia
```

**Cobertura:**
- Paginação de registros por tenant e data ✅
- Filtro por residente e data (uso mais comum) ✅
- Filtro por tipo de registro ✅
- Soft delete (deletedAt=null) ✅

---

## 🔒 Segurança e Validação

### Validações Backend (class-validator)

```typescript
// CreateDailyRecordDto
@IsEnum(RecordType)
type: RecordType

@Matches(/^\d{4}-\d{2}-\d{2}$/)
date: string // YYYY-MM-DD

@Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
time: string // HH:mm

@IsObject()
data: Record<string, any>

@IsString()
@MinLength(2)
recordedBy: string

@IsOptional()
@IsEnum(IncidentCategory)
incidentCategory?: IncidentCategory
```

### Validações Frontend (Zod)

```typescript
const higieneSchema = z.object({
  tipoHigiene: z.enum(['Banho Completo', 'Banho Leito', 'Higiene Oral', 'Troca Fralda', 'Higiene Íntima']),
  observacoes: z.string().optional(),
})

const alimentacaoSchema = z.object({
  refeicao: z.enum(['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia']),
  ingeriu: z.enum(['100%', '75%', '50%', '25%', '<25%', 'Recusou']),
  intercorrencia: z.enum(['Nenhuma', 'Vômito', 'Engasgo', 'Náusea', 'Recusa']),
  observacoes: z.string().optional(),
})
```

### Permissões Necessárias

```typescript
// Visualizar registros
PermissionType.VIEW_DAILY_RECORDS

// Criar registros
PermissionType.CREATE_DAILY_RECORDS

// Editar registros
PermissionType.UPDATE_DAILY_RECORDS

// Deletar registros
PermissionType.DELETE_DAILY_RECORDS

// Acesso ao dashboard de conformidade
PermissionType.VIEW_COMPLIANCE_DASHBOARD

// Gerenciar eventos sentinela
PermissionType.VIEW_SENTINEL_EVENTS
```

---

## 🐛 Troubleshooting

### Problema 1: Data do Registro Aparece Errada (Shift de Timezone)

**Sintoma:** Registro criado para "2026-01-11" aparece como "2026-01-10"

**Causa:** PostgreSQL armazena `date` como `DATE` (sem timezone), mas `parseISO()` sem especificar hora pode causar shifts.

**Solução:** Sempre usar `parseISO()` com meio-dia (`T12:00:00.000`):

```typescript
// ✅ CORRETO
date: parseISO(`${dto.date}T12:00:00.000`) // "2026-01-11T12:00:00.000"

// ❌ ERRADO
date: parseISO(dto.date) // "2026-01-11T00:00:00.000" pode virar "2026-01-10"
```

### Problema 2: Intercorrência Não Foi Criada Automaticamente

**Causa:** Padrão não corresponde exatamente às regras do `IncidentInterceptorService`

**Debug:**
1. Verificar logs do backend: `Analisando registro {type} para detecção de intercorrências`
2. Verificar se o tipo de registro tem regras implementadas (apenas ELIMINACAO, ALIMENTACAO, COMPORTAMENTO, HIGIENE)
3. Verificar se os valores do campo `data` correspondem aos triggers:
   - ELIMINACAO: `data.tipo = "Fezes"` E `data.consistencia` contém "diarr|líquida"
   - ALIMENTACAO: `data.ingeriu = "Recusou"` OU `"<25%"`
   - COMPORTAMENTO: `data.estadoEmocional = "Ansioso|Irritado|Eufórico"`
   - HIGIENE: `data.observacoes` contém keywords ("lesão", "úlcera", "ferida")

### Problema 3: Evento Sentinela Não Gerou Notificação

**Causa:** Campo `isEventoSentinela` não foi marcado como `true`

**Solução:** Ao criar intercorrência do tipo `QUEDA_COM_LESAO` ou `TENTATIVA_SUICIDIO`, sempre definir:

```typescript
{
  "type": "INTERCORRENCIA",
  "incidentSubtypeClinical": "QUEDA_COM_LESAO",
  "isEventoSentinela": true // ⚠️ OBRIGATÓRIO
}
```

### Problema 4: Histórico Não Mostra Campos Alterados

**Causa:** `changedFields` está vazio porque a comparação de JSON falhou

**Solução:** O cálculo de `changedFields` usa `JSON.stringify()` para comparar valores. Se o campo não mudou, não aparecerá na lista. Verificar se o update realmente modificou algum valor.

### Problema 5: VitalSign Não Foi Criado Automaticamente

**Causa:** Tipo de registro não é `MONITORAMENTO` OU campos do `data` não correspondem aos esperados

**Solução:** Verificar estrutura do `data`:

```typescript
// ✅ CORRETO
{
  "type": "MONITORAMENTO",
  "data": {
    "pressaoArterial": "120/80", // Formato exato
    "temperatura": "36.5",       // String ou número
    "frequenciaCardiaca": "72",
    "saturacaoO2": "98",
    "glicemia": "110"
  }
}

// ❌ ERRADO
{
  "type": "MONITORAMENTO",
  "data": {
    "PA": "120/80", // Nome do campo diferente
    "temp": "36.5"
  }
}
```

---

## 📚 Referências

### Arquivos Principais Backend

- [apps/backend/prisma/schema/daily-records.prisma](../../apps/backend/prisma/schema/daily-records.prisma) - Modelos Prisma
- [apps/backend/prisma/schema/enums.prisma](../../apps/backend/prisma/schema/enums.prisma) - Enums (RecordType, IncidentCategory, etc)
- [apps/backend/src/daily-records/daily-records.service.ts](../../apps/backend/src/daily-records/daily-records.service.ts) - Service principal
- [apps/backend/src/daily-records/daily-records.controller.ts](../../apps/backend/src/daily-records/daily-records.controller.ts) - Controller REST
- [apps/backend/src/daily-records/incident-interceptor.service.ts](../../apps/backend/src/daily-records/incident-interceptor.service.ts) - Detecção automática de intercorrências
- [apps/backend/src/daily-records/dto/create-daily-record.dto.ts](../../apps/backend/src/daily-records/dto/create-daily-record.dto.ts) - DTO de criação
- [apps/backend/src/daily-records/dto/update-daily-record.dto.ts](../../apps/backend/src/daily-records/dto/update-daily-record.dto.ts) - DTO de atualização
- `apps/backend/src/daily-records/dto/types/` - DTOs específicos por tipo

### Arquivos Principais Frontend

- [apps/frontend/src/pages/daily-records/ResidentRecordsPage.tsx](../../apps/frontend/src/pages/daily-records/ResidentRecordsPage.tsx) - Página principal
- `apps/frontend/src/pages/daily-records/modals/` - 13 modais de registro
- [apps/frontend/src/components/daily-records/DailyTasksPanel.tsx](../../apps/frontend/src/components/daily-records/DailyTasksPanel.tsx) - Painel de tarefas
- `apps/frontend/src/components/view-modals/` - Modais de visualização
- [apps/frontend/src/utils/recordTypeLabels.ts](../../apps/frontend/src/utils/recordTypeLabels.ts) - Labels dos tipos de registro

### Endpoints Backend

```
POST   /api/daily-records                           # Criar registro
GET    /api/daily-records                           # Listar com paginação e filtros
GET    /api/daily-records/:id                       # Buscar por ID
GET    /api/daily-records/resident/:residentId/date/:date # Buscar por residente e data
PATCH  /api/daily-records/:id                       # Atualizar registro
DELETE /api/daily-records/:id                       # Deletar registro (soft delete)
GET    /api/daily-records/:id/history               # Buscar histórico de versões
POST   /api/daily-records/:id/restore/:versionId    # Restaurar versão
GET    /api/daily-records/latest/residents          # Último registro de cada residente
GET    /api/daily-records/resident/:residentId/latest # Últimos N registros do residente
GET    /api/daily-records/resident/:residentId/vital-sign/last # Último sinal vital
GET    /api/daily-records/resident/:residentId/vital-signs/consolidated # Sinais vitais consolidados
GET    /api/daily-records/resident/:residentId/dates-with-records?year=2026&month=1 # Datas com registros
```

### Commits Importantes

- **2026-01-11:** Criação da documentação v2.0.0 com refactorings recentes
- **2026-01-10:** Implementação de detecção automática de Eventos Sentinela
- **2025-12-16:** Versionamento completo com auditoria (v1.1.0)
- **2025-12-06:** Implementação inicial do módulo Daily Records

### Documentação Relacionada

- [Sistema de Notificações](./notifications.md) - Integração com notificações de intercorrências
- [Módulo de Conformidade](./compliance.md) - Dashboard RDC 502/2021 e Eventos Sentinela
- CHANGELOG.md - Histórico completo de mudanças

---

## 🚀 Melhorias Futuras

### Planejadas v2.1

1. **Dashboard de Produtividade**
   - Quantos registros cada cuidador fez no dia/semana/mês
   - Tempo médio entre registros
   - Taxa de completude (% de tarefas obrigatórias realizadas)

2. **Anexos em Registros**
   - Upload de fotos (ex: úlcera de decúbito, refeição servida)
   - Armazenamento em S3/MinIO
   - Galeria de imagens no histórico

3. **Alertas Inteligentes**
   - Residente sem registro de hidratação há > 6 horas
   - Residente sem registro de eliminação há > 12 horas
   - Padrão anormal detectado (ex: 3 recusas alimentares seguidas)

4. **Integração com IA**
   - Análise de texto livre nas observações para detectar padrões
   - Sugestão automática de categoria de intercorrência
   - Predição de risco de desnutrição/desidratação

5. **Assinatura Digital**
   - Cuidador assina digitalmente o registro (compliance regulatório)
   - Registro de biometria (futuro)

6. **Modo Offline**
   - PWA com cache local
   - Sincronização automática quando internet retornar

7. **Importação de Dados Legados**
   - Parser de Excel/CSV com registros antigos
   - Migração de sistemas anteriores

---

## 👥 Contribuindo

### Adicionando Novo Tipo de Registro

1. **Backend - Enum:** Adicionar em `apps/backend/prisma/schema/enums.prisma`
   ```prisma
   enum RecordType {
     // ... existentes
     NOVO_TIPO
   }
   ```

2. **Migration:** `npx prisma migrate dev`

3. **Backend - DTO:** Criar arquivo `apps/backend/src/daily-records/dto/types/novo-tipo.dto.ts`
   ```typescript
   export class NovoTipoDataDto {
     @IsString()
     campo1: string;

     @IsOptional()
     @IsString()
     campo2?: string;
   }
   ```

4. **Frontend - Enum:** Atualizar `apps/frontend/src/utils/recordTypeLabels.ts`
   ```typescript
   export const RECORD_TYPE_LABELS = {
     // ... existentes
     NOVO_TIPO: 'Novo Tipo',
   }
   ```

5. **Frontend - Modal:** Criar `apps/frontend/src/pages/daily-records/modals/NovoTipoModal.tsx`
   ```tsx
   export function NovoTipoModal({ open, onClose, onSubmit, residentId, selectedDate }) {
     // Implementar formulário com react-hook-form + Zod
   }
   ```

6. **Frontend - Botão:** Adicionar em `ResidentRecordsPage.tsx`
   ```tsx
   <Button onClick={() => setActiveModal('NOVO_TIPO')}>
     <Icon /> Novo Tipo
   </Button>
   ```

7. **Frontend - View Modal:** Criar modal de visualização em `apps/frontend/src/components/view-modals/ViewNovoTipoModal.tsx`

### Adicionando Nova Regra de Detecção Automática

1. **Criar método privado em `IncidentInterceptorService`**
   ```typescript
   private async checkNovoTipo(
     record: DailyRecord,
     tenantId: string,
     userId: string,
   ): Promise<void> {
     const data = record.data as any;

     // Lógica de detecção
     if (/* condição */) {
       await this.createAutoIncident({
         tenantId,
         residentId: record.residentId,
         date: record.date,
         time: record.time,
         userId,
         recordedBy: record.recordedBy,
         category: IncidentCategory.CLINICA,
         subtypeClinical: IncidentSubtypeClinical.NOVO_SUBTIPO,
         severity: IncidentSeverity.MODERADA,
         description: 'Descrição da intercorrência',
         action: 'Ação recomendada',
         rdcIndicators: [RdcIndicatorType.INDICADOR],
         sourceRecordId: record.id,
       });
     }
   }
   ```

2. **Adicionar case no switch de `analyzeAndCreateIncidents()`**
   ```typescript
   switch (record.type) {
     // ... existentes
     case 'NOVO_TIPO':
       await this.checkNovoTipo(record, tenantId, userId);
       break;
   }
   ```

---

**Última revisão:** 11/01/2026 por Claude Sonnet 4.5
**Status:** ✅ Documentação completa e atualizada para v2.0.0
