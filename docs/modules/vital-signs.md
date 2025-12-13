# Módulo: Sinais Vitais

**Status:** ✅ Implementado
**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

Sistema completo de registro e monitoramento de sinais vitais dos residentes, com suporte a 5 tipos de medições, gráficos de evolução temporal, alertas automáticos para valores críticos e integração com o sistema de Registros Diários (tipo MONITORAMENTO).

## Funcionalidades Principais

- ✅ **5 tipos de sinais vitais**: Pressão Arterial, Frequência Cardíaca, Temperatura, SpO2, Glicemia
- ✅ **Registro detalhado**: Data/hora, valores medidos, observações
- ✅ **Validação de ranges**: Valores críticos, altos e normais
- ✅ **Alertas automáticos**: Notificações para valores fora do range
- ✅ **Gráficos de evolução**: Visualização temporal com Chart.js
- ✅ **Filtros avançados**: Por tipo, período, residente
- ✅ **Integração com prontuário**: Tab específica no ResidentMedicalRecord
- ✅ **Multi-tenancy**: Isolamento total por tenant

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/vital-signs/vital-signs.controller.ts](../../apps/backend/src/vital-signs/vital-signs.controller.ts)
- **Service:** [apps/backend/src/vital-signs/vital-signs.service.ts](../../apps/backend/src/vital-signs/vital-signs.service.ts)
- **Module:** [apps/backend/src/vital-signs/vital-signs.module.ts](../../apps/backend/src/vital-signs/vital-signs.module.ts)
- **DTOs:** [apps/backend/src/vital-signs/dto/](../../apps/backend/src/vital-signs/dto/)
- **Schema:** [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma)

### Frontend
- **Página principal:** [apps/frontend/src/pages/vital-signs/VitalSignsPage.tsx](../../apps/frontend/src/pages/vital-signs/VitalSignsPage.tsx)
- **Formulário:** [apps/frontend/src/pages/vital-signs/VitalSignForm.tsx](../../apps/frontend/src/pages/vital-signs/VitalSignForm.tsx)
- **Gráficos:** [apps/frontend/src/pages/vital-signs/VitalSignsChart.tsx](../../apps/frontend/src/pages/vital-signs/VitalSignsChart.tsx)
- **API:** [apps/frontend/src/api/vital-signs.api.ts](../../apps/frontend/src/api/vital-signs.api.ts)

## Modelos de Dados

### VitalSign (Sinal Vital)

```prisma
model VitalSign {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid
  residentId String   @db.Uuid
  userId     String   @db.Uuid

  // Data e Tipo
  measuredAt DateTime   @db.Timestamptz(3)
  signType   SignType

  // Valores por Tipo
  // Pressão Arterial
  systolicBP  Int?
  diastolicBP Int?

  // Frequência Cardíaca
  heartRate Int?

  // Temperatura
  temperature Float?

  // SpO2 (Saturação de Oxigênio)
  oxygenSaturation Int?

  // Glicemia
  bloodGlucose Int?

  // Observações
  notes String? @db.Text

  // Auditoria
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  resident Resident @relation(fields: [residentId], references: [id])
  user     User     @relation(fields: [userId], references: [id])

  @@index([tenantId])
  @@index([residentId])
  @@index([measuredAt])
  @@map("vital_signs")
}
```

### Enum SignType

```prisma
enum SignType {
  BLOOD_PRESSURE    // Pressão Arterial
  HEART_RATE        // Frequência Cardíaca
  TEMPERATURE       // Temperatura
  OXYGEN_SATURATION // SpO2
  BLOOD_GLUCOSE     // Glicemia

  @@map("sign_type")
}
```

## Endpoints da API

### CRUD Básico

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/api/vital-signs` | CREATE_VITAL_SIGNS | Criar sinal vital |
| GET | `/api/vital-signs` | - | Listar com filtros |
| GET | `/api/vital-signs/:id` | - | Buscar por ID |
| PATCH | `/api/vital-signs/:id` | Roles: admin/user | Atualizar |
| DELETE | `/api/vital-signs/:id` | Roles: admin | Soft delete |

### Endpoints Especializados

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/vital-signs/resident/:residentId` | Sinais vitais de um residente |
| GET | `/api/vital-signs/resident/:residentId/type/:signType` | Sinais de um tipo específico |
| GET | `/api/vital-signs/resident/:residentId/latest` | Últimos sinais (1 de cada tipo) |
| GET | `/api/vital-signs/alerts` | Valores críticos nas últimas 24h |

## Regras de Negócio

### Validação de Valores por Tipo

**BLOOD_PRESSURE (Pressão Arterial):**
- ✅ Obrigatório: `systolicBP`, `diastolicBP`
- ✅ Range normal: 90-120 / 60-80 mmHg
- ✅ Alerta alto: >140/90 mmHg
- ✅ Alerta crítico: >180/120 mmHg ou <90/60 mmHg

**HEART_RATE (Frequência Cardíaca):**
- ✅ Obrigatório: `heartRate`
- ✅ Range normal: 60-100 bpm
- ✅ Alerta alto: >100 bpm (taquicardia)
- ✅ Alerta crítico: >120 bpm ou <50 bpm (bradicardia)

**TEMPERATURE (Temperatura):**
- ✅ Obrigatório: `temperature`
- ✅ Range normal: 35.5-37.5°C
- ✅ Alerta alto: >37.5°C (febre baixa)
- ✅ Alerta crítico: >38.5°C (febre alta) ou <35°C (hipotermia)

**OXYGEN_SATURATION (SpO2):**
- ✅ Obrigatório: `oxygenSaturation`
- ✅ Range normal: ≥95%
- ✅ Alerta alto: 90-94%
- ✅ Alerta crítico: <90% (hipoxemia)

**BLOOD_GLUCOSE (Glicemia):**
- ✅ Obrigatório: `bloodGlucose`
- ✅ Range normal: 70-100 mg/dL (jejum)
- ✅ Alerta alto: >140 mg/dL (hiperglicemia)
- ✅ Alerta crítico: >200 mg/dL ou <70 mg/dL (hipoglicemia)

### Alertas Automáticos

Quando um sinal vital é registrado com valor crítico ou alto:

1. **Sistema cria notificação automática** (via NotificationsService)
2. **Tipo de notificação:** `VITAL_SIGN_ALERT`
3. **Severidade:**
   - `CRITICAL`: valores críticos
   - `WARNING`: valores altos
4. **Destinatários:** Usuários com permissão de visualizar sinais vitais do residente

### Integração com Registros Diários

Sinais vitais podem ser registrados via:

1. **Módulo dedicado:** `/vital-signs` (formulário específico)
2. **Registro Diário tipo MONITORAMENTO:** Campo `vitalSigns` JSON contém medições

**Exemplo de JSON no DailyRecord:**
```json
{
  "vitalSigns": {
    "bloodPressure": "120/80",
    "heartRate": 75,
    "temperature": 36.5,
    "oxygenSaturation": 98
  }
}
```

## Frontend - Componentes

### VitalSignsPage (Página Principal)

**Seções:**
- **Filtros:** Residente, tipo de sinal, período (7/15/30/90 dias)
- **Cards de resumo:** Últimas medições (1 de cada tipo)
- **Tabela de histórico:** Todos os registros com paginação
- **Botão "Novo Registro":** Abre modal de formulário

### VitalSignForm (Formulário)

**Campos dinâmicos por tipo:**
- Seleção de residente (busca)
- Seleção de tipo de sinal vital
- Data/hora da medição (default: agora)
- Campos específicos aparecem conforme tipo selecionado
- Campo de observações (opcional)

**Validações:**
- ✅ Campos obrigatórios por tipo
- ✅ Ranges de valores (min/max)
- ✅ Alertas visuais para valores críticos/altos
- ✅ Confirmação ao salvar valores críticos

### VitalSignsChart (Gráficos)

**Funcionalidades:**
- ✅ Gráfico de linha (Chart.js)
- ✅ Seleção de tipo de sinal
- ✅ Seleção de período (7/15/30/90 dias)
- ✅ Marcação de zonas (normal/alto/crítico)
- ✅ Tooltip com detalhes ao passar mouse
- ✅ Legendas e cores diferenciadas

### Tab no Prontuário

**ResidentMedicalRecord - Tab "Sinais Vitais":**
- ✅ Cards com últimas medições
- ✅ Gráficos de evolução (últimos 30 dias)
- ✅ Histórico completo com filtros
- ✅ Botão para novo registro

## Tratamento de Timezone

Uso de `date-fns` para manipulação segura de datas:

**Backend:**
```typescript
parseISO()        // Conversão de ISO string
startOfDay()      // Início do dia
endOfDay()        // Fim do dia
subDays()         // Subtração de dias
```

**Frontend:**
```typescript
format(date, 'dd/MM/yyyy HH:mm')  // Formatação BR
getCurrentDate()                   // Data atual local
```

## Integrações

### Com Módulo de Residentes
- ✅ Relação `Resident.vitalSigns` (1:N)
- ✅ Tab "Sinais Vitais" no prontuário
- ✅ Seleção de residente no formulário

### Com Módulo de Notificações
- ✅ Alertas automáticos para valores críticos
- ✅ Tipo `VITAL_SIGN_ALERT`
- ✅ Severidade dinâmica (CRITICAL/WARNING)

### Com Módulo de Registros Diários
- ✅ Tipo `MONITORAMENTO` pode conter sinais vitais
- ✅ Campo JSON `vitalSigns` no DailyRecord
- ✅ Opção de registro via formulário dedicado OU via registro diário

### Com Módulo de Usuários
- ✅ Auditoria: `userId` de quem registrou
- ✅ Relação `User.vitalSigns` para histórico

## Referências

- [CHANGELOG - 2025-10-15](../../CHANGELOG.md#2025-10-15---módulo-de-sinais-vitais)
- [Módulo de Residentes](residents.md) - Integração com prontuário
- [Módulo de Registros Diários](daily-records.md) - Integração com MONITORAMENTO
- [Módulo de Notificações](notifications.md) - Alertas automáticos

## Versionamento e Auditoria (RDC 502/2021 + LGPD)

**Status:** ✅ Backend 100% implementado | ⏸️ UI standalone em standby

### Visão Geral

O módulo VitalSigns possui **sistema completo de versionamento e auditoria** implementado no backend, garantindo conformidade com RDC 502/2021 (ANVISA) e LGPD.

### Arquitetura de Sincronização

#### Sincronização Unidirecional: DailyRecord → VitalSign

VitalSigns criados através de **DailyRecords do tipo MONITORAMENTO** são sincronizados automaticamente:

```
┌──────────────────────────────────────────────┐
│      DailyRecord (MONITORAMENTO)             │
│  - Atividade de rotina da ILPI               │
│  - Registro do que a equipe fez              │
│  - Versionamento próprio (já implementado)   │
└──────────────────────────────────────────────┘
                    │
                    │ CREATE / UPDATE / DELETE
                    ↓
┌──────────────────────────────────────────────┐
│        VitalSign (Agregação Clínica)         │
│  - Dados clínicos puros                      │
│  - Múltiplas fontes possíveis no futuro     │
│  - Versionamento independente                │
└──────────────────────────────────────────────┘
```

**Importante**:
- ✅ DailyRecords **criam/atualizam/deletam** VitalSigns automaticamente
- ❌ VitalSigns **NÃO** atualizam DailyRecords (sincronização unidirecional)
- 🎯 Cada VitalSign de MONITORAMENTO espelha um DailyRecord específico

#### Implementação da Sincronização

**CREATE** - [daily-records.service.ts:88-94](../../apps/backend/src/daily-records/daily-records.service.ts#L88-94):
```typescript
if (dto.type === 'MONITORAMENTO' && dto.data) {
  await vitalSignsService.createVitalSign({
    tenantId, residentId, userId, timestamp,
    systolicBloodPressure: extractFromData(dto.data.pressaoArterial),
    temperature: extractFromData(dto.data.temperatura),
    heartRate: extractFromData(dto.data.frequenciaCardiaca),
    oxygenSaturation: extractFromData(dto.data.saturacaoO2),
    bloodGlucose: extractFromData(dto.data.glicemia),
  });
}
```

**UPDATE** - [daily-records.service.ts:426-452](../../apps/backend/src/daily-records/daily-records.service.ts#L426-452):
```typescript
if (result.type === 'MONITORAMENTO' && (dto.data || dto.date || dto.time)) {
  await vitalSignsService.updateVitalSignByTimestamp(
    tenantId, result.residentId, timestamp, vitalSignData
  );
}
```

**DELETE** - [daily-records.service.ts:532-554](../../apps/backend/src/daily-records/daily-records.service.ts#L532-554):
```typescript
if (existing.type === 'MONITORAMENTO') {
  await vitalSignsService.deleteVitalSignByTimestamp(
    tenantId, existing.residentId, timestamp
  );
}
```

### Modelo de Versionamento

#### VitalSign (Atualizado com Versionamento)

```prisma
model VitalSign {
  id                     String    @id @default(uuid())
  tenantId               String    @db.Uuid
  residentId             String    @db.Uuid
  userId                 String    @db.Uuid
  timestamp              DateTime  @db.Timestamptz(3)

  // Sinais Vitais (todos opcionais)
  systolicBloodPressure  Float?
  diastolicBloodPressure Float?
  temperature            Float?
  heartRate              Int?
  oxygenSaturation       Float?
  bloodGlucose           Float?

  // Versionamento (RDC 502/2021 + LGPD)
  versionNumber          Int       @default(1)
  createdBy              String    @db.Uuid
  updatedBy              String?   @db.Uuid

  // Auditoria
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  deletedAt              DateTime?

  // Relações
  tenant                 Tenant
  resident               Resident
  user                   User
  history                VitalSignHistory[]
}
```

#### VitalSignHistory (Histórico de Auditoria)

```prisma
model VitalSignHistory {
  id            String     @id @default(uuid())
  tenantId      String     @db.Uuid
  vitalSignId   String     @db.Uuid
  versionNumber Int
  changeType    ChangeType // CREATE, UPDATE, DELETE
  changeReason  String     @db.Text      // Obrigatório (min 10 chars)
  previousData  Json?                    // Snapshot anterior
  newData       Json?                    // Snapshot novo
  changedFields String[]                 // Campos alterados
  changedAt     DateTime
  changedBy     String     @db.Uuid

  vitalSign     VitalSign
  tenant        Tenant
  user          User

  @@index([vitalSignId, versionNumber])
  @@index([tenantId, changedAt])
}
```

### API de Versionamento

#### Endpoints Disponíveis

**Atualização com Versionamento:**
```http
PATCH /vital-signs/:id
{
  "systolicBloodPressure": 140,
  "diastolicBloodPressure": 90,
  "temperature": 37.2,
  "changeReason": "Correção após dupla checagem - valor anterior registrado incorretamente"
}
```
- ✅ Incrementa `versionNumber`
- ✅ Cria entrada em `VitalSignHistory`
- ✅ Registra `previousData`, `newData`, `changedFields`

**Soft Delete com Auditoria:**
```http
DELETE /vital-signs/:id
{
  "deleteReason": "Registro duplicado identificado após revisão da equipe de enfermagem"
}
```
- ✅ Marca `deletedAt = NOW()`
- ✅ Cria histórico com `changeType: DELETE`
- ✅ Preserva dados para auditoria

**Consulta de Histórico:**
```http
GET /vital-signs/:id/history
```
Retorna histórico completo de alterações.

**Consulta de Versão Específica:**
```http
GET /vital-signs/:id/history/:versionNumber
```
Retorna detalhes de uma versão específica (previousData, newData, changedFields).

### Frontend API Client

**Arquivo**: [apps/frontend/src/api/vital-signs.api.ts](../../apps/frontend/src/api/vital-signs.api.ts)

**Funções Disponíveis:**
```typescript
// CRUD com Versionamento
updateVitalSign(id: string, data: UpdateVitalSignVersionedDto): Promise<VitalSign>
deleteVitalSign(id: string, deleteReason: string): Promise<{ message: string }>

// Histórico
getVitalSignHistory(id: string): Promise<VitalSignHistoryResponse>
getVitalSignHistoryVersion(id: string, version: number): Promise<VitalSignHistoryEntry>
```

**Tipos TypeScript:**
```typescript
interface UpdateVitalSignVersionedDto {
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
  changeReason: string  // Obrigatório (min 10 caracteres)
}

interface VitalSignHistoryEntry {
  id: string
  vitalSignId: string
  versionNumber: number
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changeReason: string
  previousData: Partial<VitalSign> | null
  newData: Partial<VitalSign>
  changedFields: string[]
  changedAt: string
  changedBy: string
}
```

### UI de Versionamento

#### Status Atual: ⏸️ **Em Standby**

**Decisão Arquitetural**: Atualmente, **todos** os VitalSigns são criados através de **DailyRecords do tipo MONITORAMENTO**. A edição/exclusão de sinais vitais acontece exclusivamente via interface de DailyRecords.

**Componentes Existentes (DailyRecords):**
- ✅ [EditDailyRecordModal](../../apps/frontend/src/pages/daily-records/modals/EditDailyRecordModal.tsx) - Edita registro de monitoramento (atualiza VitalSign automaticamente)
- ✅ [DeleteDailyRecordModal](../../apps/frontend/src/pages/daily-records/modals/DeleteDailyRecordModal.tsx) - Deleta registro (deleta VitalSign automaticamente)
- ✅ [DailyRecordActions](../../apps/frontend/src/pages/daily-records/components/DailyRecordActions.tsx) - DropdownMenu com ações
- ✅ [MonitoramentoModal](../../apps/frontend/src/pages/daily-records/modals/MonitoramentoModal.tsx) - Criação de novos registros

**Validações RDC 502/2021 nos Modais:**
- ✅ `editReason` obrigatório (mínimo 10 caracteres)
- ✅ `deleteReason` obrigatório (mínimo 10 caracteres)
- ✅ Cards de conformidade ANVISA
- ✅ Contadores de caracteres
- ✅ Feedback visual

### Roadmap Futuro: Múltiplas Fontes

#### Quando Implementar UI Standalone

A UI standalone será necessária quando implementarmos **integração de fontes externas**:

**Fontes Planejadas:**
1. **Dispositivos IoT/Wearables**
   - Relógios inteligentes
   - Oxímetros conectados
   - Termômetros digitais
   - Monitores de pressão arterial Bluetooth

2. **Importação de Sistemas Hospitalares**
   - HL7/FHIR feeds
   - Prontuários eletrônicos externos
   - Sistemas de laboratório

3. **Telemetria em Tempo Real**
   - Monitores de leito
   - Centrais de monitoramento

#### Diferenciação de Origem (Futuro)

Quando implementarmos múltiplas fontes, precisaremos adicionar:

```prisma
// Adicionar ao model VitalSign:
source         VitalSignSource @default(DAILY_RECORD)
sourceId       String?         @db.Uuid
sourceMetadata Json?

enum VitalSignSource {
  DAILY_RECORD      // Origem: Registros Diários da ILPI
  IOT_DEVICE        // Origem: Dispositivos IoT/Wearables
  HOSPITAL_IMPORT   // Origem: Importação de sistemas hospitalares
  MANUAL_ENTRY      // Origem: Entrada manual direta
}
```

#### Componentes UI Standalone (Futuros)

**A implementar quando necessário:**
```typescript
// 1. Hook de versionamento
useVitalSignVersioning(vitalSignId: string | null)

// 2. Modais de edição
EditVitalSignModal.tsx        // Editar VitalSign standalone
DeleteVitalSignModal.tsx      // Deletar VitalSign standalone
VitalSignHistoryModal.tsx     // Visualizar histórico

// 3. Componentes de ações
VitalSignActions.tsx          // DropdownMenu (Edit/Delete/History)

// 4. Páginas/Views
VitalSignsExternalPage.tsx    // Listagem de VitalSigns de fontes externas
VitalSignsTimelinePage.tsx    // Timeline agregada (todas as fontes)
```

**Regra de Negócio Crítica (Futura)**:
```typescript
// Só permitir edição standalone se source !== DAILY_RECORD
if (vitalSign.source === 'DAILY_RECORD') {
  throw new Error(
    'VitalSigns de DailyRecords só podem ser editados via DailyRecords'
  )
}
```

### Testes E2E

**Arquivo**: [apps/backend/test/e2e/vital-sign-versioning.e2e-spec.ts](../../apps/backend/test/e2e/vital-sign-versioning.e2e-spec.ts)

**Cobertura (32 testes)**:

#### 1. UPDATE (10 testes)
- ✅ Atualização com changeReason
- ✅ Incremento de versionNumber
- ✅ Criação de histórico
- ✅ Validação de changeReason (min 10 chars)
- ✅ Campos opcionais (atualiza apenas fornecidos)
- ✅ Detecção de changedFields
- ✅ Erro ao atualizar VitalSign inexistente
- ✅ Erro ao atualizar de outro tenant

#### 2. DELETE (8 testes)
- ✅ Soft delete com deleteReason
- ✅ Criação de histórico de deleção
- ✅ Validação de deleteReason (min 10 chars)
- ✅ VitalSign não retornado após delete
- ✅ Preservação de dados históricos
- ✅ Erro ao deletar VitalSign inexistente
- ✅ Erro ao deletar de outro tenant

#### 3. HISTORY (6 testes)
- ✅ Consulta de histórico completo
- ✅ Consulta de versão específica
- ✅ Ordenação por versionNumber DESC
- ✅ Estrutura de previousData/newData
- ✅ changedFields precisos
- ✅ Metadados de auditoria

#### 4. ATOMICITY (3 testes)
- ✅ Transações atômicas (VitalSign + History)
- ✅ Rollback em caso de erro
- ✅ Consistência de versionNumber

#### 5. COMPLIANCE (5 testes)
- ✅ RDC 502/2021 - Versionamento obrigatório
- ✅ LGPD - Rastreabilidade completa
- ✅ LGPD - Proteção de dados sensíveis
- ✅ changeReason/deleteReason obrigatórios
- ✅ Integridade referencial

**Executar Testes:**
```bash
cd apps/backend
npm run test:e2e -- vital-sign-versioning
```

### Conformidade Regulatória

#### RDC 502/2021 (ANVISA) - Art. 39
✅ **Versionamento de Prontuários Eletrônicos**
- Histórico completo de alterações
- Identificação do profissional responsável
- Data e hora de cada modificação
- Motivo documentado para cada alteração

#### LGPD (Lei Geral de Proteção de Dados)

✅ **Art. 5º, II** - Dados sensíveis de saúde
- Controle de acesso baseado em permissões
- Soft delete para preservar histórico
- Auditoria de todos os acessos/modificações

✅ **Art. 46** - Medidas técnicas de segurança
- Criptografia em trânsito (HTTPS)
- Autenticação obrigatória (JWT)
- Multi-tenancy com isolamento

✅ **Art. 48** - Rastreabilidade
- Registro de quem modificou (changedBy)
- Registro de quando modificou (changedAt)
- Registro do motivo (changeReason/deleteReason)
- Snapshots (previousData/newData)

### Mapeamento DailyRecord.data ↔ VitalSign

**Transformação de Dados:**

```typescript
// DailyRecord.data (formato ILPI) → VitalSign (estruturado)
{
  "pressaoArterial": "120/80",     → systolicBloodPressure: 120
                                     diastolicBloodPressure: 80

  "temperatura": "36.5",           → temperature: 36.5

  "frequenciaCardiaca": "72",      → heartRate: 72

  "saturacaoO2": "98",             → oxygenSaturation: 98

  "glicemia": "95"                 → bloodGlucose: 95
}
```

**Implementação**: [daily-records.service.ts:115-148](../../apps/backend/src/daily-records/daily-records.service.ts#L115-148)

### Status Summary

| Componente | Status | Notas |
|------------|--------|-------|
| **Backend API** | ✅ 100% | Versionamento completo implementado |
| **Backend Service** | ✅ 100% | Transações atômicas, histórico |
| **Backend Tests** | ✅ 100% | 32 testes E2E passando |
| **Frontend API Client** | ✅ 100% | TypeScript types e funções |
| **Frontend UI** | ⏸️ Standby | Aguardando fontes externas |
| **Documentação** | ✅ 100% | Este documento |

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Última atualização (Versionamento):** 13/01/2025
