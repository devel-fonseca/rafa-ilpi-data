# Módulo: Resident Schedule (Agenda do Residente)

**Versão:** 1.0.0
**Data de Criação:** 17/12/2025
**Última Atualização:** 17/12/2025
**Responsável:** Claude Sonnet 4.5 + Dr. Emanuel

---

## 📋 Visão Geral

O módulo **Resident Schedule** implementa um sistema completo de gerenciamento de agenda para residentes de ILPIs, permitindo:

1. **Configurar registros obrigatórios recorrentes** (diários, semanais, mensais) para cada residente
2. **Agendar eventos pontuais** (vacinas, consultas, exames, procedimentos) com data/hora específica
3. **Visualizar tarefas do dia** com status de conclusão em tempo real

### Conformidade Regulatória

- **RDC 502/2021 ANVISA** - Artigos sobre assistência sistemática e continuidade de cuidados
- **CFM 1.821/2007** - Prontuário eletrônico com auditoria completa

---

## 🏗️ Arquitetura

### Camada de Dados (Prisma)

#### Model: ResidentScheduleConfig

Armazena configurações de registros obrigatórios recorrentes.

```prisma
model ResidentScheduleConfig {
  id             String            @id @default(cuid())
  tenantId       String
  residentId     String
  recordType     RecordType        // HIGIENE, PESO, HUMOR, etc
  frequency      ScheduleFrequency // DAILY, WEEKLY, MONTHLY
  dayOfWeek      Int?              // 0-6 (apenas WEEKLY)
  dayOfMonth     Int?              // 1-31 (apenas MONTHLY)
  suggestedTimes Json              // ["08:00", "14:00"]
  isActive       Boolean           @default(true)
  notes          String?

  createdBy      String
  updatedBy      String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  deletedAt      DateTime?

  @@unique([tenantId, residentId, recordType, frequency, dayOfWeek, dayOfMonth])
  @@index([tenantId, isActive])
  @@index([residentId])
}
```

#### Model: ResidentScheduledEvent

Armazena agendamentos pontuais (vacinas, consultas, exames).

```prisma
model ResidentScheduledEvent {
  id                String                @id @default(cuid())
  tenantId          String
  residentId        String
  eventType         ScheduledEventType    // VACCINATION, CONSULTATION, EXAM, etc
  scheduledDate     DateTime
  scheduledTime     String
  title             String
  description       String?
  vaccineData       Json?                 // { name, dose, manufacturer, batchNumber }
  status            ScheduledEventStatus  // SCHEDULED, COMPLETED, CANCELLED, MISSED
  completedRecordId String?
  completedAt       DateTime?
  notes             String?

  createdBy         String
  updatedBy         String?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  deletedAt         DateTime?

  @@index([tenantId, scheduledDate])
  @@index([residentId])
}
```

#### Enums

```prisma
enum ScheduleFrequency {
  DAILY
  WEEKLY
  MONTHLY
}

enum ScheduledEventType {
  VACCINATION
  CONSULTATION
  EXAM
  PROCEDURE
  OTHER
}

enum ScheduledEventStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  MISSED
}
```

### Camada de Backend (NestJS)

#### Estrutura de Arquivos

```
apps/backend/src/resident-schedule/
├── dto/
│   ├── create-schedule-config.dto.ts
│   ├── update-schedule-config.dto.ts
│   ├── create-scheduled-event.dto.ts
│   ├── update-scheduled-event.dto.ts
│   └── query-schedule.dto.ts
├── resident-schedule.module.ts
├── resident-schedule.service.ts
├── resident-schedule.controller.ts
└── resident-schedule-tasks.service.ts
```

#### Endpoints

**Configurações (Registros Recorrentes):**
- `POST /resident-schedule/configs` - Criar configuração
- `GET /resident-schedule/configs/resident/:id` - Listar por residente
- `PATCH /resident-schedule/configs/:id` - Atualizar
- `DELETE /resident-schedule/configs/:id` - Deletar (soft delete)

**Agendamentos Pontuais:**
- `POST /resident-schedule/events` - Criar agendamento
- `GET /resident-schedule/events/resident/:id` - Listar por residente
- `PATCH /resident-schedule/events/:id` - Atualizar
- `DELETE /resident-schedule/events/:id` - Deletar (soft delete)

**Tarefas do Dia:**
- `GET /resident-schedule/tasks/resident/:residentId/daily?date=YYYY-MM-DD` - Tarefas de um residente
- `GET /resident-schedule/tasks/daily?date=YYYY-MM-DD` - Tarefas de todos os residentes

### Camada de Frontend (React)

#### Estrutura de Componentes

```
apps/frontend/src/components/resident-schedule/
├── ResidentScheduleTab.tsx           # Container principal (2 sub-tabs)
├── ScheduleConfigList.tsx            # Lista de configurações
├── ScheduledEventsList.tsx           # Lista de agendamentos
├── CreateScheduleConfigModal.tsx     # Form de nova configuração
├── CreateScheduledEventModal.tsx     # Form de novo agendamento
├── EditScheduleConfigModal.tsx       # Form de edição de configuração
└── EditScheduledEventModal.tsx       # Form de edição de agendamento

apps/frontend/src/components/daily-records/
└── DailyTasksPanel.tsx               # Painel de tarefas do dia
```

#### Hook Principal

```typescript
// apps/frontend/src/hooks/useResidentSchedule.ts

// Queries
useDailyTasksByResident(residentId, date, enabled)
useScheduleConfigsByResident(residentId, enabled)
useScheduledEventsByResident(residentId, enabled)

// Mutations (Configs)
useCreateScheduleConfig()
useUpdateScheduleConfig()
useDeleteScheduleConfig()

// Mutations (Events)
useCreateScheduledEvent()
useUpdateScheduledEvent()
useDeleteScheduledEvent()
```

---

## 🔐 Sistema de Permissões

### Permissões

| Permissão                     | Descrição                                      | Cargos                  |
|-------------------------------|------------------------------------------------|-------------------------|
| `VIEW_RESIDENT_SCHEDULE`      | Visualizar agenda e tarefas                    | Todos                   |
| `MANAGE_RESIDENT_SCHEDULE`    | Criar, editar e deletar configurações/eventos | RT, Admin               |

### Controle de Acesso

**Backend:**
- Todos os endpoints exigem autenticação JWT
- Endpoints de leitura exigem `VIEW_RESIDENT_SCHEDULE`
- Endpoints de escrita (POST/PATCH/DELETE) exigem `MANAGE_RESIDENT_SCHEDULE`
- Guards de permissão retornam `403 Forbidden` se não autorizado

**Frontend:**
- Botões de ação (Adicionar, Editar, Deletar) aparecem apenas com `MANAGE_RESIDENT_SCHEDULE`
- Visualização liberada para todos com `VIEW_RESIDENT_SCHEDULE`
- Hook `usePermissions()` controla renderização condicional

---

## 🧮 Lógica de Geração de Tarefas

### Método: getDailyTasksByResident()

**Localização:** `resident-schedule-tasks.service.ts`

**Fluxo:**

1. **Parse da data alvo:**
   ```typescript
   const targetDate = dateStr
     ? parseISO(`${dateStr}T12:00:00.000`)
     : startOfDay(new Date());
   ```

2. **Buscar configurações ativas do residente:**
   ```typescript
   const configs = await prisma.residentScheduleConfig.findMany({
     where: { tenantId, residentId, isActive: true, deletedAt: null }
   });
   ```

3. **Filtrar configurações que devem gerar tarefa na data:**
   ```typescript
   const filteredConfigs = configs.filter(config =>
     this.shouldGenerateTask(config, targetDate)
   );
   ```

4. **Buscar registros já existentes no dia:**
   ```typescript
   const existingRecords = await prisma.dailyRecord.findMany({
     where: { tenantId, residentId, date: targetDate, deletedAt: null },
     select: { type: true, createdAt: true, user: { select: { name: true } } }
   });
   ```

5. **Mapear tarefas com status de conclusão:**
   ```typescript
   const recurringTasks = filteredConfigs.map(config => {
     const recordData = existingRecordTypesMap.get(config.recordType);
     return {
       type: 'RECURRING',
       recordType: config.recordType,
       isCompleted: !!recordData,
       completedAt: recordData?.createdAt,
       completedBy: recordData?.createdBy,
       // ... outros campos
     };
   });
   ```

6. **Buscar eventos agendados para a data:**
   ```typescript
   const events = await prisma.residentScheduledEvent.findMany({
     where: { tenantId, residentId, scheduledDate: targetDate, deletedAt: null }
   });
   ```

7. **Retornar array unificado:**
   ```typescript
   return [...recurringTasks, ...eventTasks];
   ```

### Método: shouldGenerateTask()

**Lógica de validação por frequência:**

```typescript
private shouldGenerateTask(
  config: { frequency, dayOfWeek, dayOfMonth },
  targetDate: Date
): boolean {
  const dayOfWeek = targetDate.getDay(); // 0-6
  const dayOfMonth = targetDate.getDate(); // 1-31

  switch (config.frequency) {
    case ScheduleFrequency.DAILY:
      return true;

    case ScheduleFrequency.WEEKLY:
      return config.dayOfWeek === dayOfWeek;

    case ScheduleFrequency.MONTHLY:
      // Edge case: dia 31 em fevereiro não deve gerar tarefa
      const daysInMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0
      ).getDate();

      // Se config pede dia que não existe no mês, não gera
      if (config.dayOfMonth! > daysInMonth) {
        return false;
      }

      return config.dayOfMonth === dayOfMonth;

    default:
      return false;
  }
}
```

**Edge Cases Tratados:**
- Dia 30/31 em fevereiro → não gera tarefa
- Dia 31 em meses de 30 dias (abril, junho, setembro, novembro) → não gera tarefa

---

## 🎨 Interface do Usuário

### 1. Aba "Agenda do Residente" (Prontuário Médico)

**Localização:** [ResidentMedicalRecord.tsx:394](../../apps/frontend/src/pages/residents/ResidentMedicalRecord.tsx#L394)

**Estrutura:**
- 2 sub-tabs: "Registros Obrigatórios" e "Agendamentos Pontuais"
- Controle de permissões: botões de ação aparecem apenas para RT/Admin
- Empty states informativos para listas vazias

**Registros Obrigatórios:**
- Lista com badges de tipo de registro (PESO, HUMOR, etc)
- Frequência formatada: "Diariamente", "Toda segunda-feira", "Todo dia 15"
- Horários sugeridos: "08:00, 14:00"
- Botões: Editar, Deletar (com confirmação)

**Agendamentos Pontuais:**
- Lista ordenada por data
- Filtro de status (Todos, Agendados, Concluídos, Cancelados, Perdidos)
- Badges coloridos por status e tipo de evento
- Exibição especial de dados de vacina (nome, dose, fabricante, lote)
- Botões: Marcar como Concluído, Editar, Deletar

### 2. Painel "Tarefas do Dia" (DailyRecordsPage)

**Localização:** [DailyTasksPanel.tsx](../../apps/frontend/src/components/daily-records/DailyTasksPanel.tsx)

**Funcionalidade:**
- Busca tarefas do residente selecionado via `useDailyTasksByResident(residentId, date)`
- Query reativa: atualiza ao trocar residente ou data
- Botão de refresh manual
- Agrupamento em 2 seções visuais:
  - **Registros Obrigatórios** (ícone Repeat, cor azul)
  - **Agendamentos** (ícone Calendar, cor verde)

**Status de Conclusão:**
- Tarefas pendentes aparecem primeiro, concluídas depois (ordenação automática)
- Tarefas concluídas exibem:
  - Ícone de check verde
  - Opacidade reduzida (60%)
  - Background colorido (`bg-accent/20`)
  - Texto "Registrado por {nome do cuidador}"
- Botão "Registrar" oculto para tarefas concluídas

**Estados Tratados:**
- Sem residente selecionado
- Loading (skeleton/spinner)
- Sem tarefas (com dica para configurar)

---

## 📊 Validações e Regras de Negócio

### Backend

#### 1. Unicidade de Configuração

**Constraint único:** `[tenantId, residentId, recordType, frequency, dayOfWeek, dayOfMonth]`

**Validação:**
- Não permitir duplicatas
- Retornar erro `409 Conflict` se houver tentativa de duplicação

#### 2. Validação de Frequência

| Frequência | dayOfWeek | dayOfMonth | Validação                     |
|------------|-----------|------------|-------------------------------|
| DAILY      | null      | null       | Sempre válido                 |
| WEEKLY     | 0-6       | null       | dayOfWeek obrigatório         |
| MONTHLY    | null      | 1-31       | dayOfMonth obrigatório (1-31) |

**Implementação:**
```typescript
@IsOptional()
@IsInt()
@Min(0)
@Max(6)
@ValidateIf(o => o.frequency === ScheduleFrequency.WEEKLY)
dayOfWeek?: number;

@IsOptional()
@IsInt()
@Min(1)
@Max(31)
@ValidateIf(o => o.frequency === ScheduleFrequency.MONTHLY)
dayOfMonth?: number;
```

#### 3. Horários Sugeridos

**Validação:**
- Array não-vazio
- Cada item no formato `HH:mm`
- Regex: `/^([01]\d|2[0-3]):[0-5]\d$/`

```typescript
@IsArray()
@ArrayMinSize(1)
@IsString({ each: true })
@Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true })
suggestedTimes: string[];
```

### Frontend

#### 1. Forms com Validação Zod

**CreateScheduleConfigModal:**
```typescript
const schema = z.object({
  recordType: z.enum([...]),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  suggestedTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
                   .min(1, "Adicione pelo menos um horário"),
}).refine(data => {
  if (data.frequency === 'WEEKLY') return data.dayOfWeek !== undefined;
  if (data.frequency === 'MONTHLY') return data.dayOfMonth !== undefined;
  return true;
}, { message: "Campo obrigatório para esta frequência" });
```

**CreateScheduledEventModal:**
```typescript
const schema = z.object({
  eventType: z.enum([...]),
  scheduledDate: z.date(),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  title: z.string().min(3),
  description: z.string().optional(),
  notes: z.string().optional(),
});
```

**IMPORTANTE:** Dados de vacina (nome, dose, fabricante, lote) **NÃO** são coletados no momento do agendamento. Eles devem ser registrados posteriormente através do módulo de Vacinação existente quando a vacina for efetivamente aplicada.

#### 2. Conditional Rendering

- Campo "Dia da Semana" aparece apenas se `frequency === 'WEEKLY'`
- Campo "Dia do Mês" aparece apenas se `frequency === 'MONTHLY'`

---

## 🔄 Fluxos de Uso

### Fluxo 1: Configurar Registro Obrigatório

1. RT acessa prontuário do residente → aba "Agenda do Residente"
2. Clica em "Adicionar Configuração"
3. Preenche form:
   - Tipo de registro: PESO
   - Frequência: DAILY
   - Horários sugeridos: 08:00
   - Observações: "Usar balança digital"
4. Salva → configuração criada
5. A partir do dia seguinte, tarefa aparece em "Tarefas do Dia"

### Fluxo 2: Agendar Vacinação

1. RT acessa prontuário → aba "Agenda do Residente" → sub-tab "Agendamentos"
2. Clica em "Adicionar Agendamento"
3. Preenche form:
   - Tipo de evento: Vacinação
   - Data: 20/12/2025
   - Horário: 10:00
   - Título: Vacina contra gripe
   - Descrição (opcional): "Campanha anual de vacinação"
4. Salva → agendamento criado com status SCHEDULED
5. No dia 20/12, aparece em "Tarefas do Dia"
6. **Após aplicar a vacina:** Registrar no módulo de Vacinação com dados completos (nome, dose, fabricante, lote, comprovante)

### Fluxo 3: Registrar Tarefa Diária

1. Cuidador acessa DailyRecordsPage
2. Seleciona residente na lista
3. Visualiza "Tarefas do Dia" na coluna direita
4. Vê tarefa "PESO" como pendente (sem check)
5. Clica em "Registrar" → abre modal de registro de peso
6. Preenche peso (66.5 kg) e salva
7. Tarefa automaticamente:
   - Ganha check verde
   - Move para o final da lista
   - Mostra "Registrado por João Silva"
   - Botão "Registrar" desaparece

---

## 🧪 Testes

### Backend

**Casos de teste implementados:**
- ✅ Criar configuração DAILY
- ✅ Criar configuração WEEKLY (validar dayOfWeek obrigatório)
- ✅ Criar configuração MONTHLY (validar dayOfMonth obrigatório)
- ✅ Prevenir configuração duplicada (409 Conflict)
- ✅ Gerar tarefas DAILY (sempre retorna)
- ✅ Gerar tarefas WEEKLY (apenas no dia da semana correto)
- ✅ Gerar tarefas MONTHLY (apenas no dia do mês correto)
- ✅ Edge case: dia 31 em fevereiro não gera tarefa
- ✅ Criar agendamento com dados de vacina
- ✅ Listar tarefas do dia com status de conclusão
- ✅ Soft delete de configurações e agendamentos

### Frontend

**Casos de teste manuais:**
- ✅ Formulário valida campos obrigatórios
- ✅ Conditional rendering funciona (dia da semana/mês, vacina)
- ✅ Permissões bloqueiam botões de ação para não-RT
- ✅ Query reativa atualiza ao trocar residente/data
- ✅ Tarefas concluídas exibem status correto
- ✅ Ordenação de tarefas (pendentes primeiro)

---

## 🚀 Performance

### Otimizações Implementadas

#### Backend

1. **Índices no banco de dados:**
   ```prisma
   @@index([tenantId, isActive])
   @@index([residentId])
   @@index([tenantId, scheduledDate])
   ```

2. **Query otimizada:**
   - Busca apenas configurações ativas (`isActive: true`)
   - Filtra eventos apenas da data específica
   - Usa `select` para buscar apenas campos necessários

3. **Soft delete:**
   - Filtro `deletedAt: null` em todas as queries
   - Mantém histórico sem afetar performance

#### Frontend

1. **React Query - Cache inteligente:**
   ```typescript
   staleTime: 1 * 60 * 1000, // 1 minuto
   refetchOnMount: 'always',
   refetchOnWindowFocus: true,
   ```

2. **Query reativa:**
   - Depende de `[residentId, date]`
   - Atualiza apenas quando necessário
   - Evita re-renders desnecessários

3. **Invalidação de cache:**
   ```typescript
   onSuccess: (data) => {
     queryClient.invalidateQueries({ queryKey: ['daily-tasks', data.residentId] });
   }
   ```

---

## 📝 Migrações e Scripts

### Script: add-schedule-permissions.ts

**Localização:** `apps/backend/scripts/add-schedule-permissions.ts`

**Propósito:** Adicionar permissão `VIEW_RESIDENT_SCHEDULE` a usuários existentes (criados antes da implementação do módulo).

**Uso:**
```bash
cd apps/backend
npx tsx scripts/add-schedule-permissions.ts
```

**Lógica:**
1. Busca todos os UserProfiles
2. Filtra os que NÃO têm `VIEW_RESIDENT_SCHEDULE`
3. Cria registro em `UserPermission` com `isGranted: true`
4. Usa `grantedBy: userId` (auto-concessão via script)

**Resultado esperado:**
```
✅ Encontrados X usuários sem VIEW_RESIDENT_SCHEDULE:
   - João Silva (joao@example.com) - CUIDADOR
   ...

📝 Adicionando VIEW_RESIDENT_SCHEDULE...
   ✓ João Silva - permissão adicionada
   ...

🎉 Todos os usuários foram atualizados com sucesso!
```

### Migration: 20251217055514_add_resident_schedule_system

**Criada em:** 17/12/2025

**Conteúdo:**
- Criação de tabelas `ResidentScheduleConfig` e `ResidentScheduledEvent`
- Criação de enums `ScheduleFrequency`, `ScheduledEventType`, `ScheduledEventStatus`
- Adição de permissões `VIEW_RESIDENT_SCHEDULE` e `MANAGE_RESIDENT_SCHEDULE`
- Criação de índices para performance

---

## 🔮 Melhorias Futuras

### Curto Prazo

- [ ] Notificações push quando tarefa não é registrada até horário sugerido
- [ ] Integração com sistema de lembretes (email/SMS)
- [ ] Relatório de aderência a registros obrigatórios
- [ ] Dashboard com estatísticas de conclusão de tarefas

### Médio Prazo

- [ ] Suporte a tarefas condicionais (se glicemia > 180, registrar insulina)
- [ ] Templates de configuração por perfil de residente (ex: "Diabético", "Hipertenso")
- [ ] Integração com eSUS para exportar agendamentos de vacina
- [ ] Assinatura digital de conclusão de tarefas críticas

### Longo Prazo

- [ ] IA para sugerir horários ideais baseado em padrões históricos
- [ ] Alertas preditivos de não-conformidade
- [ ] Integração com dispositivos IoT (balanças, medidores)

---

## 📚 Referências

### Documentação Interna

- [CHANGELOG.md](../../CHANGELOG.md) - Histórico de implementação
- [Plano de Implementação](../../.claude/plans/peaceful-sniffing-globe.md)
- [Documentação de Permissões](./permissions.md)
- [Guia de Desenvolvimento Frontend](../../FRONTEND_VERSIONING_IMPLEMENTATION.md)

### Regulamentações

- [RDC 502/2021 ANVISA](https://www.in.gov.br/en/web/dou/-/resolucao-rdc-n-502-de-27-de-maio-de-2021-323536036)
- [CFM 1.821/2007](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)
- [LGPD Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

### Tecnologias

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Query (TanStack Query)](https://tanstack.com/query/latest)
- [Zod Validation](https://zod.dev/)
- [date-fns](https://date-fns.org/)

---

**Última atualização:** 17/12/2025
**Versão do documento:** 1.0.0
