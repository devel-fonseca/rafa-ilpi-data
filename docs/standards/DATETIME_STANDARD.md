# Padrão de Data/Hora - Rafa ILPI

**Data:** 2025-01-06
**Versão:** 1.0.0
**Status:** ✅ Implementado

---

## Sumário Executivo

Este documento estabelece o padrão oficial para tratamento de datas e horários em toda a aplicação Rafa ILPI, garantindo consistência timezone-safe e eliminando bugs de "dia -1".

### Regras Fundamentais

1. **Data civil** (aniversário, admissão, data de registro) → `DATE` (YYYY-MM-DD). **NUNCA converter com timezone.**
2. **Momento exato** (auditoria, logs, timestamps) → `TIMESTAMPTZ` em UTC (ISO 8601 com Z).
3. **Agendamento local** (eventos com horário específico) → `DATE` + `TIME` (HH:mm) + `tenant.timezone` (IANA).
4. **Timezone padrão:** `America/Sao_Paulo` (GMT-3)
5. **`recordDate` é imutável** - nunca reclassifica ao mudar timezone do tenant.

---

## 1. Banco de Dados (PostgreSQL + Prisma)

### 1.1. Tipos de Dados

| Tipo no Prisma | Tipo no PostgreSQL | Quando Usar | Exemplos |
|----------------|-------------------|-------------|----------|
| `DateTime @db.Date` | `DATE` | Datas civis (sem hora, sem fuso) | `birthDate`, `admissionDate`, `recordDate`, `prescriptionDate` |
| `DateTime @db.Timestamptz(3)` | `TIMESTAMPTZ(3)` | Momentos exatos (auditoria, logs) | `createdAt`, `updatedAt`, `completedAt` |
| `String @db.VarChar(5)` | `VARCHAR(5)` | Horários locais (HH:mm) | `scheduledTime`, `time` em registros diários |
| `String @db.VarChar(50)` | `VARCHAR(50)` | Timezone IANA | `tenant.timezone` |

### 1.2. Schema Prisma - Exemplos

#### Data Civil (DATE)
```prisma
model Resident {
  birthDate     DateTime  @db.Date  // Aniversário - NUNCA muda com timezone
  admissionDate DateTime  @db.Date  // Data de entrada na ILPI
  dischargeDate DateTime? @db.Date  // Data de saída
}

model DailyRecord {
  date DateTime @db.Date  // Data do registro (imutável, civil)
  time String   @db.VarChar(5)  // HH:mm (horário local, sem fuso)
}

model Prescription {
  prescriptionDate DateTime  @db.Date  // Data da prescrição (civil)
  validUntil       DateTime? @db.Date  // Válida até (civil)
}
```

#### Momento Exato (TIMESTAMPTZ)
```prisma
model Resident {
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)
}
```

#### Agendamento Local (DATE + TIME + Timezone)
```prisma
model ResidentScheduledEvent {
  scheduledDate DateTime  @db.Date         // Data do evento (civil)
  scheduledTime String    @db.VarChar(5)   // HH:mm (local)
  allDay        Boolean   @default(false)  // Se true, ignorar scheduledTime
}

model Tenant {
  timezone String @default("America/Sao_Paulo") @db.VarChar(50)  // Timezone IANA
}
```

### 1.3. Migração de TIMESTAMPTZ → DATE

**Antes:**
```prisma
birthDate DateTime @db.Timestamptz(3)  // ❌ ERRADO - causava timezone shifts
```

**Depois:**
```prisma
birthDate DateTime @db.Date  // ✅ CORRETO - data civil sem hora/fuso
```

**Migration SQL (resumo):**
```sql
-- 21 campos migrados (9 arquivos schema)
ALTER TABLE residents ALTER COLUMN birth_date TYPE DATE USING birth_date::date;
ALTER TABLE prescriptions ALTER COLUMN prescription_date TYPE DATE USING prescription_date::date;
-- ... (total: 21 campos)
```

---

## 2. Backend (NestJS + TypeScript)

### 2.1. Utilitários Centralizados (`date.helpers.ts`)

#### Importação
```typescript
import {
  parseDateOnly,
  formatDateOnly,
  parseTimestamp,
  getCurrentDateInTz,
  getDayRangeInTz,
  localToUTC,
  isValidDateOnly,
  isValidTime,
  DEFAULT_TIMEZONE,
} from './utils/date.helpers';
```

#### Funções Principais

##### `parseDateOnly(dateStr: string): string`
**Quando usar:** Validar e normalizar strings YYYY-MM-DD (campos DATE).

```typescript
// ✅ CORRETO
const date = parseDateOnly('2025-01-06');  // '2025-01-06'
const date2 = parseDateOnly('2025-01-06T12:00:00.000Z');  // '2025-01-06'

// ❌ ERRADO
const date = new Date('2025-01-06');  // Pode causar timezone shift!
```

##### `formatDateOnly(date: Date | string): string`
**Quando usar:** Converter Date JS para string YYYY-MM-DD (sem timezone shift).

```typescript
// ✅ CORRETO
const dateStr = formatDateOnly(new Date('2025-01-06T23:59:00Z'));  // '2025-01-06'

// ❌ ERRADO
const dateStr = date.toISOString().slice(0, 10);  // Pode causar timezone shift!
```

##### `getCurrentDateInTz(timezone: string): string`
**Quando usar:** Obter data ATUAL no timezone do tenant (para criar recordDate).

```typescript
// ✅ CORRETO - Data atual em São Paulo (ex: 2025-01-06)
const today = getCurrentDateInTz('America/Sao_Paulo');

await prisma.dailyRecord.create({
  data: {
    date: today,  // STRING YYYY-MM-DD (não Date JS!)
    // ...
  },
});

// ❌ ERRADO
const today = new Date().toISOString().slice(0, 10);  // Sempre UTC, ignora timezone!
```

##### `getDayRangeInTz(dateStr: string, timezone: string): { start: Date, end: Date }`
**Quando usar:** Queries BETWEEN para um dia específico em timezone local.

```typescript
// ✅ CORRETO - Buscar registros do dia 06/01/2025 em GMT-3
const { start, end } = getDayRangeInTz('2025-01-06', 'America/Sao_Paulo');
// start = 2025-01-06T03:00:00.000Z (00:00 GMT-3)
// end   = 2025-01-07T02:59:59.999Z (23:59:59.999 GMT-3)

const records = await prisma.dailyRecord.findMany({
  where: {
    date: '2025-01-06',  // DATE field - comparação direta com string
  },
});
```

##### `localToUTC(dateStr: string, timeStr: string, timezone: string): Date`
**Quando usar:** Converter data/hora local do tenant para UTC (para TIMESTAMPTZ).

```typescript
// ✅ CORRETO - Converter evento local para UTC
const utcDate = localToUTC('2025-01-06', '10:00', 'America/Sao_Paulo');
// utcDate = 2025-01-06T13:00:00.000Z (10h GMT-3 = 13h UTC)

await prisma.notification.create({
  data: {
    scheduledFor: utcDate,  // TIMESTAMPTZ field
    // ...
  },
});
```

### 2.2. Validators Customizados (`date.validators.ts`)

#### `@IsDateOnly()` - Valida YYYY-MM-DD
```typescript
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreateDailyRecordDto {
  @IsDateOnly()
  date: string;  // Deve ser YYYY-MM-DD
}
```

#### `@IsTimeString()` - Valida HH:mm
```typescript
import { IsTimeString } from '../../common/validators/date.validators';

export class CreateScheduledEventDto {
  @IsTimeString()
  scheduledTime: string;  // Deve ser HH:mm (ex: 10:00, 23:59)
}
```

### 2.3. Padrões de Código

#### Criar Registro com Data Civil
```typescript
// ✅ CORRETO
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { timezone: true },
});

const recordDate = getCurrentDateInTz(tenant.timezone || DEFAULT_TIMEZONE);

await prisma.dailyRecord.create({
  data: {
    tenantId,
    residentId,
    date: recordDate,  // STRING YYYY-MM-DD
    time: '10:30',     // STRING HH:mm
    // ...
  },
});
```

#### Buscar Registros por Data Civil
```typescript
// ✅ CORRETO - Comparação direta de strings
const records = await prisma.dailyRecord.findMany({
  where: {
    tenantId,
    date: '2025-01-06',  // STRING YYYY-MM-DD
  },
});

// ❌ ERRADO - NUNCA comparar DATE com Date JS
const today = new Date();
const records = await prisma.dailyRecord.findMany({
  where: {
    date: today,  // ❌ ERRO! Campo DATE não aceita Date JS
  },
});
```

#### Calcular Diferença de Dias (Datas Civis)
```typescript
// ✅ CORRETO
const todayStr = getCurrentDateInTz(tenant.timezone || DEFAULT_TIMEZONE);
const validUntilStr = parseDateOnly(prescription.validUntil as any);

const todayDate = new Date(todayStr + 'T00:00:00');
const validDate = new Date(validUntilStr + 'T00:00:00');
const diffTime = validDate.getTime() - todayDate.getTime();
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

// ❌ ERRADO - Comparar diretamente Date JS sem normalização
const diffDays = Math.ceil(
  (new Date(prescription.validUntil).getTime() - new Date().getTime()) / 86400000
);  // ❌ Causa timezone shift!
```

### 2.4. Antipadrões - NÃO FAZER

```typescript
// ❌ NUNCA use new Date() + setHours para obter "hoje"
const today = new Date();
today.setHours(0, 0, 0, 0);  // ❌ Sempre usa timezone do servidor, não do tenant!

// ✅ USE getCurrentDateInTz
const todayStr = getCurrentDateInTz(tenant.timezone || DEFAULT_TIMEZONE);

// ❌ NUNCA use toISOString().slice(0, 10) para DATE
const dateStr = date.toISOString().slice(0, 10);  // ❌ Pode causar shift de dia!

// ✅ USE formatDateOnly
const dateStr = formatDateOnly(date);

// ❌ NUNCA compare DATE com Date JS
where: { date: new Date() }  // ❌ ERRO! DATE é string, não Date JS

// ✅ COMPARE com string YYYY-MM-DD
where: { date: '2025-01-06' }
```

---

## 3. Frontend (React + TypeScript)

### 3.1. Utilitários (`dateHelpers.ts`)

**⚠️ IMPORTANTE:** O arquivo `timezone.ts` está **deprecated** desde 06/01/2025. Use **apenas** `dateHelpers.ts`.

#### Importação
```typescript
import {
  getCurrentDate,
  getCurrentTime,
  formatDateSafe,
  formatDateOnlySafe,
  extractDateOnly,
  normalizeUTCDate,
} from '@/utils/dateHelpers';
```

#### Funções Principais

##### `getCurrentDate(): string`
**Quando usar:** Obter data ATUAL no formato YYYY-MM-DD (frontend).

```typescript
// ✅ CORRETO
const today = getCurrentDate();  // '2025-01-06'

<input
  type="date"
  defaultValue={today}
/>
```

##### `getCurrentTime(): string`
**Quando usar:** Obter horário ATUAL no formato HH:mm (frontend).

```typescript
// ✅ CORRETO
const now = getCurrentTime();  // '10:30'

<input
  type="time"
  defaultValue={now}
/>
```

##### `extractDateOnly(dateStr: string | Date): string`
**Quando usar:** Extrair YYYY-MM-DD de string/Date sem timezone shift.

```typescript
// ✅ CORRETO - Sempre retorna a data correta
const date1 = extractDateOnly('2025-01-06');  // '2025-01-06'
const date2 = extractDateOnly('2025-01-06T23:59:00.000Z');  // '2025-01-06'
const date3 = extractDateOnly(new Date('2025-01-06T23:59:00Z'));  // '2025-01-06'

// ❌ ERRADO
const date = item.scheduledDate.split('T')[0];  // Funciona, mas não é robusto
```

##### `normalizeUTCDate(dateStr: string): Date`
**Quando usar:** Converter string DATE para Date JS sem timezone shift (para comparações).

```typescript
// ✅ CORRETO - Garante que parseISO não cause shift
const itemDate = normalizeUTCDate(item.scheduledDate);  // Date em UTC noon
const dayKey = format(itemDate, 'yyyy-MM-dd');  // Sempre correto

// ❌ ERRADO
const itemDate = parseISO(item.scheduledDate);  // Pode causar shift de dia!
```

### 3.2. Padrões de Código

#### Formulário de Criação
```typescript
// ✅ CORRETO
import { getCurrentDate, getCurrentTime } from '@/utils/dateHelpers';

export function DailyRecordForm() {
  const [date, setDate] = useState(getCurrentDate());
  const [time, setTime] = useState(getCurrentTime());

  const handleSubmit = async () => {
    await apiClient.post('/daily-records', {
      date,  // '2025-01-06' (STRING)
      time,  // '10:30' (STRING)
      // ...
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <input type="time" value={time} onChange={e => setTime(e.target.value)} />
    </form>
  );
}
```

#### Agrupamento de Eventos por Dia
```typescript
// ✅ CORRETO - Usar extractDateOnly para normalizar
import { extractDateOnly } from '@/utils/dateHelpers';

const eventsByDay = events.reduce((acc, event) => {
  const dayKey = extractDateOnly(event.scheduledDate);  // '2025-01-06'
  if (!acc[dayKey]) acc[dayKey] = [];
  acc[dayKey].push(event);
  return acc;
}, {} as Record<string, Event[]>);

// ❌ ERRADO - parseISO sem normalização
const dayKey = format(parseISO(event.scheduledDate), 'yyyy-MM-dd');  // Pode causar shift!
```

#### Exibição de Data Civil
```typescript
// ✅ CORRETO
import { formatDateOnlySafe } from '@/utils/dateHelpers';

<p>Data de Nascimento: {formatDateOnlySafe(resident.birthDate, 'dd/MM/yyyy')}</p>
// Exibe: "06/01/1950" (sempre correto)

// ❌ ERRADO
<p>Data de Nascimento: {new Date(resident.birthDate).toLocaleDateString()}</p>
// Pode exibir "05/01/1950" (timezone shift!)
```

### 3.3. Antipadrões - NÃO FAZER

```typescript
// ❌ NUNCA use timezone.ts (deprecated desde 06/01/2025)
import { getCurrentTimeLocal } from '@/utils/timezone';  // ❌ DEPRECATED!

// ✅ USE dateHelpers.ts
import { getCurrentTime } from '@/utils/dateHelpers';

// ❌ NUNCA use aritmética manual de Date
const tomorrow = new Date(date.getTime() + 86400000);  // ❌ Pode causar horário de verão!

// ✅ USE date-fns
import { addDays } from 'date-fns';
const tomorrow = addDays(date, 1);

// ❌ NUNCA use parseISO diretamente em DATE fields
const itemDate = parseISO(item.scheduledDate);  // ❌ Pode causar timezone shift!

// ✅ USE normalizeUTCDate
const itemDate = normalizeUTCDate(item.scheduledDate);
```

---

## 4. API - Contratos de Request/Response

### 4.1. Padrão de DTOs

#### Campos DATE (Data Civil)
```typescript
{
  "date": "2025-01-06",  // STRING YYYY-MM-DD (nunca Date JS)
  "birthDate": "1950-01-01",
  "admissionDate": "2023-05-15"
}
```

#### Campos TIMESTAMPTZ (Momento Exato)
```typescript
{
  "createdAt": "2025-01-06T13:30:00.000Z",  // STRING ISO 8601 com Z
  "updatedAt": "2025-01-06T14:00:00.000Z"
}
```

#### Campos TIME (Horário Local)
```typescript
{
  "time": "10:30",  // STRING HH:mm (00:00 a 23:59)
  "scheduledTime": "14:00"
}
```

### 4.2. Exemplos de Endpoints

#### POST /daily-records (Criar Registro Diário)
**Request:**
```json
{
  "residentId": "uuid",
  "date": "2025-01-06",  // ✅ STRING YYYY-MM-DD (campo DATE)
  "time": "10:30",       // ✅ STRING HH:mm (campo TIME)
  "recordType": "ALIMENTACAO",
  "content": { ... }
}
```

**Response:**
```json
{
  "id": "uuid",
  "date": "2025-01-06",           // ✅ STRING YYYY-MM-DD
  "time": "10:30",                // ✅ STRING HH:mm
  "createdAt": "2025-01-06T13:30:00.000Z",  // ✅ ISO 8601 UTC
  "updatedAt": "2025-01-06T13:30:00.000Z"
}
```

#### POST /prescriptions (Criar Prescrição)
**Request:**
```json
{
  "residentId": "uuid",
  "prescriptionDate": "2025-01-06",  // ✅ STRING YYYY-MM-DD (campo DATE)
  "validUntil": "2025-02-06",        // ✅ STRING YYYY-MM-DD (campo DATE)
  "medications": [...]
}
```

---

## 5. Configuração de Timezone do Tenant

### 5.1. Modelo de Dados

```prisma
model Tenant {
  id       String @id @default(uuid()) @db.Uuid
  name     String
  timezone String @default("America/Sao_Paulo") @db.VarChar(50)  // Timezone IANA

  @@index([timezone])
}
```

### 5.2. Regras de Negócio

1. **Timezone padrão:** `America/Sao_Paulo` (GMT-3)
2. **Configuração:** Apenas **SuperAdmin** pode alterar `tenant.timezone`
3. **Imutabilidade de `recordDate`:** Ao alterar `tenant.timezone`, os campos DATE (ex: `recordDate`, `birthDate`) **NUNCA mudam**
   - Exemplo: Registro criado em `2025-01-06` com timezone GMT-3 permanece `2025-01-06` mesmo se tenant virar GMT-5

### 5.3. Timezones Suportados (IANA)

- `America/Sao_Paulo` (GMT-3) - **Padrão**
- `America/Rio_Branco` (GMT-5)
- `America/Manaus` (GMT-4)
- `America/Fortaleza` (GMT-3)
- `America/Recife` (GMT-3)
- `America/Cuiaba` (GMT-4)
- `America/Campo_Grande` (GMT-4)

---

## 6. Checklist de Desenvolvimento

### 6.1. Ao Criar Model Novo (Backend)

- [ ] Definir campos DATE (`@db.Date`) para datas civis
- [ ] Definir campos TIMESTAMPTZ (`@db.Timestamptz(3)`) para auditoria
- [ ] Adicionar `@@index` em campos de data frequentemente consultados
- [ ] Criar validators `@IsDateOnly()` / `@IsTimeString()` em DTOs
- [ ] Testar timezone shift (criar registro às 23:55 GMT-3, verificar se aparece no dia correto)

### 6.2. Ao Criar Service Novo (Backend)

- [ ] **SEMPRE** importar de `date.helpers.ts`, **NUNCA** manipular Date JS diretamente
- [ ] Usar `getCurrentDateInTz(tenant.timezone)` para obter data atual
- [ ] Usar `parseDateOnly()` ao receber strings YYYY-MM-DD
- [ ] Usar `formatDateOnly()` ao retornar Date JS como string
- [ ] **NUNCA** usar `new Date()` + `setHours(0,0,0,0)` sem timezone explícito
- [ ] **NUNCA** usar `.toISOString().slice(0, 10)` para extrair data

### 6.3. Ao Criar Componente Novo (Frontend)

- [ ] **SEMPRE** importar de `dateHelpers.ts`, **NUNCA** de `timezone.ts` (deprecated)
- [ ] Usar `getCurrentDate()` / `getCurrentTime()` para preencher forms
- [ ] Usar `extractDateOnly()` ao agrupar eventos por dia
- [ ] Usar `normalizeUTCDate()` antes de `parseISO()` em campos DATE
- [ ] **NUNCA** usar aritmética manual de Date (usar `date-fns` em vez disso)

### 6.4. Ao Revisar PR

- [ ] Verificar se todos imports de data/hora vêm de `date.helpers.ts` (backend) ou `dateHelpers.ts` (frontend)
- [ ] Procurar por `.toISOString().slice()` → Substituir por `formatDateOnly()`
- [ ] Procurar por `new Date() + setHours(0,0,0,0)` → Substituir por `getCurrentDateInTz()`
- [ ] Procurar por `parseISO()` direto em campos DATE → Adicionar `normalizeUTCDate()`
- [ ] Verificar se DTOs têm `@IsDateOnly()` / `@IsTimeString()` onde aplicável

---

## 7. Exemplos Práticos (ERRADO vs CORRETO)

### Exemplo 1: Criar Registro Diário

#### ❌ ERRADO
```typescript
// Backend
const today = new Date();  // Usa timezone do servidor (pode não ser do tenant!)
today.setHours(0, 0, 0, 0);

await prisma.dailyRecord.create({
  data: {
    date: today,  // Date JS - causará erro! Campo DATE espera string
    // ...
  },
});
```

#### ✅ CORRETO
```typescript
// Backend
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { timezone: true },
});

const todayStr = getCurrentDateInTz(tenant.timezone || DEFAULT_TIMEZONE);

await prisma.dailyRecord.create({
  data: {
    date: todayStr,  // STRING '2025-01-06'
    time: '10:30',   // STRING HH:mm
    // ...
  },
});
```

### Exemplo 2: Buscar Registros de Hoje

#### ❌ ERRADO
```typescript
// Backend
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const records = await prisma.dailyRecord.findMany({
  where: {
    date: {
      gte: today,    // ❌ ERRO! Campo DATE não aceita Date JS
      lt: tomorrow,
    },
  },
});
```

#### ✅ CORRETO
```typescript
// Backend
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { timezone: true },
});

const todayStr = getCurrentDateInTz(tenant.timezone || DEFAULT_TIMEZONE);

const records = await prisma.dailyRecord.findMany({
  where: {
    date: todayStr,  // ✅ STRING '2025-01-06' (comparação direta)
  },
});
```

### Exemplo 3: Agrupar Eventos por Dia (Frontend)

#### ❌ ERRADO
```typescript
// Frontend
const eventsByDay = events.reduce((acc, event) => {
  const itemDate = parseISO(event.scheduledDate);  // ❌ Pode causar timezone shift!
  const dayKey = format(itemDate, 'yyyy-MM-dd');
  if (!acc[dayKey]) acc[dayKey] = [];
  acc[dayKey].push(event);
  return acc;
}, {});
```

#### ✅ CORRETO
```typescript
// Frontend
import { extractDateOnly } from '@/utils/dateHelpers';

const eventsByDay = events.reduce((acc, event) => {
  const dayKey = extractDateOnly(event.scheduledDate);  // ✅ '2025-01-06' (sempre correto)
  if (!acc[dayKey]) acc[dayKey] = [];
  acc[dayKey].push(event);
  return acc;
}, {});
```

### Exemplo 4: Calcular Dias até Vencimento (Backend)

#### ❌ ERRADO
```typescript
// Backend
const today = new Date();
const validUntil = new Date(prescription.validUntil);
const diffTime = validUntil.getTime() - today.getTime();
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
// ❌ Compara Date JS sem considerar timezone - pode estar errado se validUntil for 23:59 UTC!
```

#### ✅ CORRETO
```typescript
// Backend
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { timezone: true },
});

const todayStr = getCurrentDateInTz(tenant.timezone || DEFAULT_TIMEZONE);
const validUntilStr = parseDateOnly(prescription.validUntil as any);

// Converter para Date JS em UTC noon (neutraliza timezone)
const todayDate = new Date(todayStr + 'T00:00:00');
const validDate = new Date(validUntilStr + 'T00:00:00');

const diffTime = validDate.getTime() - todayDate.getTime();
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
// ✅ Comparação correta de datas civis
```

---

## 8. Testes

### 8.1. Testes Unitários (Backend)

**Arquivo:** `apps/backend/src/utils/date.helpers.spec.ts`

```typescript
import {
  parseDateOnly,
  formatDateOnly,
  getCurrentDateInTz,
  getDayRangeInTz,
  localToUTC,
  isValidDateOnly,
  isValidTime,
} from './date.helpers';

describe('Date Helpers', () => {
  it('parseDateOnly deve retornar string YYYY-MM-DD identicamente', () => {
    expect(parseDateOnly('2025-01-06')).toBe('2025-01-06');
  });

  it('formatDateOnly deve formatar Date sem timezone shift', () => {
    const date = new Date('2025-01-06T23:59:00.000Z'); // 23:59 UTC
    expect(formatDateOnly(date)).toBe('2025-01-06'); // Deve manter dia 06
  });

  it('getCurrentDateInTz deve retornar data atual em timezone', () => {
    const dateSP = getCurrentDateInTz('America/Sao_Paulo');
    expect(dateSP).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getDayRangeInTz deve retornar range UTC de um dia', () => {
    const range = getDayRangeInTz('2025-01-06', 'America/Sao_Paulo');
    expect(range.start.toISOString()).toBe('2025-01-06T03:00:00.000Z'); // 00:00 GMT-3
    expect(range.end.toISOString()).toContain('2025-01-07T02:59:59'); // 23:59:59.999 GMT-3
  });

  it('localToUTC deve converter data/hora local para UTC', () => {
    const utc = localToUTC('2025-01-06', '10:00', 'America/Sao_Paulo');
    expect(utc.toISOString()).toBe('2025-01-06T13:00:00.000Z'); // 10h GMT-3 = 13h UTC
  });

  it('isValidDateOnly deve validar YYYY-MM-DD', () => {
    expect(isValidDateOnly('2025-01-06')).toBe(true);
    expect(isValidDateOnly('2025-13-01')).toBe(false); // Mês inválido
  });

  it('isValidTime deve validar HH:mm', () => {
    expect(isValidTime('10:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false); // Hora inválida
  });
});
```

### 8.2. Testes E2E (Backend)

**Cenários críticos:**

1. **Virada de dia (23:55 vs 00:01):** Criar registro às 23:55 GMT-3, verificar que aparece no mesmo dia.
2. **Aniversário:** Verificar que birthDate `1950-01-01` nunca vira `1949-12-31`.
3. **Mudança de timezone:** Alterar `tenant.timezone`, verificar que `recordDate` não muda.
4. **Eventos agendados:** Criar evento "10h local", verificar que exibe "10h" no frontend.

---

## 9. Troubleshooting

### 9.1. Problema: Data aparece como "dia -1"

**Causa:** Campo DATE sendo tratado como TIMESTAMPTZ, ou uso de `.toISOString().slice(0, 10)`.

**Solução:**
1. Verificar schema Prisma: campo deve ser `@db.Date`, não `@db.Timestamptz(3)`
2. Substituir `.toISOString().slice(0, 10)` por `formatDateOnly()`
3. Usar `parseDateOnly()` ao receber strings de datas

### 9.2. Problema: Erro "Property 'timezone' does not exist on type"

**Causa:** Query do Prisma não está selecionando campo `timezone` do tenant.

**Solução:**
```typescript
// ❌ ERRADO
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { id: true, name: true },  // Faltou timezone!
});

// ✅ CORRETO
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { id: true, name: true, timezone: true },  // ✅ Incluir timezone
});
```

### 9.3. Problema: "Cannot find module 'date-fns-tz'"

**Causa:** Pacote `date-fns-tz` não está instalado.

**Solução:**
```bash
cd apps/backend
npm install date-fns-tz
```

---

## 10. Changelog

| Data | Versão | Alteração |
|------|--------|-----------|
| 2025-01-06 | 1.0.0 | 🎉 Implementação inicial completa<br>- 21 campos migrados TIMESTAMPTZ→DATE<br>- Criado date.helpers.ts backend<br>- Criado dateHelpers.ts frontend<br>- Deprecated timezone.ts<br>- Adicionado tenant.timezone |

---

## 11. Referências

- [PostgreSQL Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [Prisma Schema - Date/Time](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datetime)
- [date-fns Documentation](https://date-fns.org/)
- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [IANA Time Zone Database](https://www.iana.org/time-zones)

---

**Dúvidas?** Entre em contato com o time de engenharia: [suporte@rafalabs.com.br](mailto:suporte@rafalabs.com.br)
