# 📅 Guia de Padrões de Data - Rafa ILPI Data

**Versão:** 1.0
**Data:** 06/12/2025
**Autores:** Equipe de Desenvolvimento Rafa Labs

---

## 🎯 Objetivo

Este guia documenta os padrões adotados no projeto Rafa ILPI Data para manipulação de datas, especialmente após a migração de campos `DATE` para `TIMESTAMPTZ(3)` no PostgreSQL.

**Por que este guia existe?**
- Evitar bugs de timezone que fazem datas aparecerem "um dia antes" ou "um dia depois"
- Garantir consistência entre frontend e backend
- Facilitar onboarding de novos desenvolvedores
- Documentar decisões arquiteturais importantes

---

## 🧭 Princípios Fundamentais

### 1. **Campos Date-Only vs Timestamp Completo**

No nosso sistema, temos dois tipos de campos temporais:

| Tipo | Exemplo | PostgreSQL | JavaScript | Uso |
|------|---------|------------|------------|-----|
| **Date-Only** | Data de nascimento, data de vacinação | `TIMESTAMPTZ(3)` com `T12:00:00.000` | `"2025-12-06"` (string) | Quando **apenas a data importa**, sem horário específico |
| **Timestamp Completo** | Data+hora da prescrição, data+hora de login | `TIMESTAMPTZ(3)` com hora real | `Date` object ou ISO string | Quando **data E hora importam** |

### 2. **A Estratégia do Meio-Dia (Noon Strategy)**

Para campos **date-only**, sempre usamos **12:00:00.000 (meio-dia UTC)** ao armazenar no banco.

**Por quê?**
```
❌ PROBLEMA: Usando meia-noite (00:00:00)
- Frontend BR (UTC-3): 06/12/2025 00:00:00
- Converte para UTC: 06/12/2025 03:00:00 (passa para o dia seguinte!)
- Backend salva: 2025-12-06T03:00:00.000Z
- Frontend exibe: 06/12/2025 (correto por sorte, mas frágil)

✅ SOLUÇÃO: Usando meio-dia (12:00:00)
- Frontend BR (UTC-3): 06/12/2025 12:00:00
- Converte para UTC: 06/12/2025 15:00:00 (ainda no mesmo dia!)
- Backend salva: 2025-12-06T15:00:00.000Z
- Frontend exibe: 06/12/2025 (sempre correto)
```

O meio-dia garante uma "margem de segurança" de 12 horas para qualquer timezone entre UTC-12 e UTC+12.

### 3. **Queries Sempre Usam Range**

Para buscar registros de uma data específica, **NUNCA** compare com igualdade exata:

```typescript
// ❌ ERRADO
where: {
  date: new Date('2025-12-06')  // Compara com timestamp exato
}

// ✅ CORRETO
where: {
  date: {
    gte: startOfDay(parseISO('2025-12-06')),
    lte: endOfDay(parseISO('2025-12-06'))
  }
}
```

---

## 🔧 Padrões por Camada

### **Backend (NestJS + Prisma)**

#### **1. Criação de Registros com Date-Only**

```typescript
import { parseISO } from 'date-fns'

// DTO recebe string "YYYY-MM-DD" do frontend
async create(dto: CreateVaccinationDto) {
  return this.prisma.vaccination.create({
    data: {
      // ✅ SEMPRE usar parseISO com T12:00:00
      date: parseISO(`${dto.date}T12:00:00.000`),
      // outros campos...
    }
  })
}
```

**Por que `parseISO` e não `new Date(dto.date)`?**
- `new Date("2025-12-06")` interpreta como UTC e pode dar resultados inesperados
- `parseISO("2025-12-06T12:00:00.000")` é explícito e previsível

#### **2. Queries de Data Exata**

```typescript
import { parseISO, startOfDay, endOfDay } from 'date-fns'

async findByDate(dateStr: string) {
  const dateObj = parseISO(dateStr)

  return this.prisma.dailyRecord.findMany({
    where: {
      date: {
        // ✅ Usar range para pegar o dia completo
        gte: startOfDay(dateObj),
        lte: endOfDay(dateObj)
      }
    }
  })
}
```

#### **3. Queries de Período (Mês Completo)**

```typescript
import { startOfMonth, endOfMonth } from 'date-fns'

async findByMonth(year: number, month: number) {
  const referenceDate = new Date(year, month - 1, 1)

  return this.prisma.vaccination.findMany({
    where: {
      date: {
        // ✅ Usar startOfMonth/endOfMonth
        gte: startOfMonth(referenceDate),
        lte: endOfMonth(referenceDate)
      }
    }
  })
}
```

#### **4. Comparações de Data (Vencimento, Expiração)**

```typescript
import { startOfDay, endOfDay, addDays } from 'date-fns'

async getExpiringPrescriptions(days: number) {
  const today = new Date()

  return this.prisma.prescription.findMany({
    where: {
      validUntil: {
        // ✅ Usar endOfDay para incluir todo o último dia
        lte: endOfDay(addDays(today, days)),
        gte: startOfDay(today)
      }
    }
  })
}
```

#### **5. Campos Timestamp Completos (com hora relevante)**

```typescript
// Para campos onde a HORA importa, use Date normal
async create(dto: CreatePrescriptionDto) {
  return this.prisma.prescription.create({
    data: {
      // ✅ prescriptionDate tem hora relevante
      prescriptionDate: new Date(dto.prescriptionDate),

      // ✅ Timestamps automáticos
      createdAt: new Date(),  // Prisma já faz isso automaticamente
      updatedAt: new Date()   // Prisma já faz isso automaticamente
    }
  })
}
```

---

### **Frontend (React + TypeScript)**

#### **1. Formulários com Date Inputs**

```tsx
import { getCurrentDate } from '@/utils/dateHelpers'

function VaccinationForm() {
  const { register } = useForm({
    defaultValues: {
      // ✅ Usar getCurrentDate() que retorna "yyyy-MM-dd"
      date: getCurrentDate()
    }
  })

  return (
    <div>
      <Label htmlFor="date">Data da Vacinação *</Label>
      {/* ✅ HTML5 date input envia string "yyyy-MM-dd" */}
      <Input
        id="date"
        type="date"
        {...register('date')}
      />
    </div>
  )
}
```

#### **2. Exibir Datas do Backend**

```tsx
import { formatDateOnly, formatDateTimeSafe } from '@/utils/dateHelpers'

function VaccinationCard({ vaccination }) {
  return (
    <div>
      {/* ✅ formatDateOnly reconhece timestamps T12:00:00 como date-only */}
      <p>Data: {formatDateOnly(vaccination.date)}</p>

      {/* ✅ formatDateTimeSafe exibe data+hora se houver */}
      <p>Criado em: {formatDateTimeSafe(vaccination.createdAt)}</p>
    </div>
  )
}
```

#### **3. Preencher Formulários de Edição**

```tsx
import { timestamptzToDisplay } from '@/utils/formMappers'

function EditResidentForm({ resident }) {
  const { register } = useForm({
    defaultValues: {
      // ✅ timestamptzToDisplay converte TIMESTAMPTZ para DD/MM/YYYY
      dataNascimento: timestamptzToDisplay(resident.birthDate)
    }
  })

  return (
    <MaskedInput
      mask="99/99/9999"
      placeholder="DD/MM/AAAA"
      {...register('dataNascimento')}
    />
  )
}
```

#### **4. Enviar Datas para o Backend**

```tsx
import { displayToDate } from '@/utils/formMappers'

async function onSubmit(data) {
  const payload = {
    ...data,
    // ✅ displayToDate converte DD/MM/YYYY para Date com meio-dia
    birthDate: displayToDate(data.dataNascimento),
  }

  await api.post('/residents', payload)
}
```

**Importante:** `displayToDate()` cria um `Date` object com horário às **12:00:00**, que ao ser serializado para JSON vira um ISO string que o backend interpreta corretamente.

#### **5. Construir URLs de API com Datas**

```tsx
import { format } from 'date-fns'

function MedicationCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { data } = useQuery({
    queryKey: ['administrations', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // ✅ Usar format do date-fns para gerar "yyyy-MM-dd"
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      return api.get(`/prescriptions/administrations/${dateStr}`)
    }
  })
}
```

---

## 📚 Helpers Disponíveis

### **Backend (`date-fns`)**

| Helper | Uso | Exemplo |
|--------|-----|---------|
| `parseISO(string)` | Parsear string ISO para Date | `parseISO('2025-12-06T12:00:00.000')` |
| `startOfDay(date)` | Início do dia (00:00:00) | `startOfDay(new Date())` |
| `endOfDay(date)` | Fim do dia (23:59:59.999) | `endOfDay(new Date())` |
| `startOfMonth(date)` | Primeiro dia do mês | `startOfMonth(new Date(2025, 11, 15))` |
| `endOfMonth(date)` | Último dia do mês | `endOfMonth(new Date(2025, 11, 15))` |
| `addDays(date, n)` | Adicionar dias | `addDays(new Date(), 7)` |

### **Frontend (`dateHelpers.ts`)**

| Helper | Retorno | Uso |
|--------|---------|-----|
| `getCurrentDate()` | `"yyyy-MM-dd"` | Valor padrão para `<input type="date">` |
| `getCurrentTime()` | `"HH:mm"` | Valor padrão para `<input type="time">` |
| `formatDateOnly(timestamp)` | `"dd/MM/yyyy"` | Exibir campos date-only |
| `formatDateTimeSafe(timestamp)` | `"dd/MM/yyyy HH:mm"` | Exibir timestamps completos |
| `normalizeUTCDate(date)` | `Date` com UTC normalizado | Converter datas para UTC |

### **Frontend (`formMappers.ts`)**

| Helper | Entrada | Saída | Uso |
|--------|---------|-------|-----|
| `timestamptzToDisplay(timestamp)` | `Date` ou string ISO | `"dd/MM/yyyy"` | Preencher input mascarado de data |
| `displayToDate(dateStr)` | `"dd/MM/yyyy"` | `Date` com meio-dia | Enviar data para backend |

---

## ⚠️ Erros Comuns e Como Evitar

### **Erro 1: Usar `new Date(stringVariable)`**

```typescript
// ❌ EVITAR
const date = new Date(dto.date)  // Pode dar resultados inesperados

// ✅ PREFERIR
const date = parseISO(`${dto.date}T12:00:00.000`)
```

**Por quê?**
- `new Date("2025-12-06")` interpreta a string de forma diferente em diferentes ambientes
- Pode resultar em datas "um dia antes" dependendo do timezone

### **Erro 2: Comparar Datas com Igualdade Exata**

```typescript
// ❌ EVITAR
where: {
  date: new Date('2025-12-06')
}

// ✅ PREFERIR
where: {
  date: {
    gte: startOfDay(parseISO('2025-12-06')),
    lte: endOfDay(parseISO('2025-12-06'))
  }
}
```

### **Erro 3: Construir Datas Manualmente**

```typescript
// ❌ EVITAR
const firstDay = new Date(year, month - 1, 1)
const lastDay = new Date(year, month, 0, 23, 59, 59)

// ✅ PREFERIR
const referenceDate = new Date(year, month - 1, 1)
const firstDay = startOfMonth(referenceDate)
const lastDay = endOfMonth(referenceDate)
```

### **Erro 4: Usar `setHours()` para Normalizar**

```typescript
// ❌ EVITAR
const today = new Date(dto.date)
today.setHours(0, 0, 0, 0)

// ✅ PREFERIR
const today = startOfDay(parseISO(dto.date))
```

### **Erro 5: Calcular Datas Futuras com Aritmética Manual**

```typescript
// ❌ EVITAR
const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

// ✅ PREFERIR
const futureDate = endOfDay(addDays(new Date(), 30))
```

---

## 🧪 Exemplos Práticos

### **Exemplo 1: Criar Vacinação**

**Frontend:**
```tsx
function VaccinationForm() {
  const onSubmit = async (data) => {
    await api.post('/vaccinations', {
      ...data,
      date: data.date  // "2025-12-06" (string do <input type="date">)
    })
  }
}
```

**Backend:**
```typescript
async create(dto: CreateVaccinationDto) {
  // ✅ dto.date = "2025-12-06"

  return this.prisma.vaccination.create({
    data: {
      date: parseISO(`${dto.date}T12:00:00.000`),  // 2025-12-06T12:00:00.000
      // ...
    }
  })
}
```

**Banco de Dados:**
```sql
-- Salvo como TIMESTAMPTZ: 2025-12-06 12:00:00.000-03:00
-- Em UTC: 2025-12-06T15:00:00.000Z
```

### **Exemplo 2: Buscar Registros de Um Dia**

**Frontend:**
```tsx
const dateStr = format(selectedDate, 'yyyy-MM-dd')  // "2025-12-06"
const { data } = useQuery({
  queryKey: ['records', dateStr],
  queryFn: () => api.get(`/daily-records?date=${dateStr}`)
})
```

**Backend:**
```typescript
async findByDate(dateStr: string) {
  // ✅ dateStr = "2025-12-06"

  const dateObj = parseISO(dateStr)

  return this.prisma.dailyRecord.findMany({
    where: {
      date: {
        gte: startOfDay(dateObj),   // 2025-12-06 00:00:00
        lte: endOfDay(dateObj)       // 2025-12-06 23:59:59.999
      }
    }
  })
}
```

### **Exemplo 3: Editar Residente**

**Frontend:**
```tsx
// Exibir data no formulário
const defaultValues = {
  dataNascimento: timestamptzToDisplay(resident.birthDate)  // "15/03/1950"
}

// Enviar data atualizada
const onSubmit = async (data) => {
  await api.put(`/residents/${id}`, {
    ...data,
    birthDate: displayToDate(data.dataNascimento)  // Date com meio-dia
  })
}
```

**Backend:**
```typescript
async update(id: string, dto: UpdateResidentDto) {
  return this.prisma.resident.update({
    where: { id },
    data: {
      // dto.birthDate já vem como Date do JSON (Nest desserializa automaticamente)
      birthDate: dto.birthDate,
      // ...
    }
  })
}
```

---

## 🔍 Debugging de Problemas de Timezone

### **Sintoma: Data aparece "um dia antes"**

**Possíveis causas:**
1. ✅ Backend criou registro com meia-noite ao invés de meio-dia
2. ✅ Frontend enviou Date ao invés de string "yyyy-MM-dd"
3. ✅ Query comparou data exata ao invés de usar range

**Como investigar:**
```sql
-- Verificar valor armazenado no banco
SELECT id, date, date AT TIME ZONE 'UTC' as date_utc
FROM vaccinations
WHERE id = 'xxx';

-- Esperado para date-only:
-- date = 2025-12-06 12:00:00-03:00
-- date_utc = 2025-12-06 15:00:00
```

### **Sintoma: Query não encontra registros**

**Possíveis causas:**
1. ✅ Usando comparação exata ao invés de range
2. ✅ Timezone do servidor diferente do esperado

**Como investigar:**
```typescript
// Adicionar logs
console.log('Query params:', {
  gte: startOfDay(dateObj).toISOString(),
  lte: endOfDay(dateObj).toISOString()
})

// Verificar registros no banco
const allRecords = await this.prisma.dailyRecord.findMany({
  select: { id: true, date: true }
})
console.log('All records:', allRecords)
```

---

## 📋 Checklist para Code Review

Ao revisar código que manipula datas:

### Backend
- [ ] Campos date-only usam `parseISO('YYYY-MM-DDT12:00:00.000')`?
- [ ] Queries de data usam range (`gte`/`lte`) com `startOfDay`/`endOfDay`?
- [ ] Não há `new Date(stringVariable)` para campos date-only?
- [ ] Cálculos de período usam `startOfMonth`/`endOfMonth` ao invés de construção manual?
- [ ] Comparações de data usam `addDays`/`endOfDay` ao invés de aritmética manual?

### Frontend
- [ ] Inputs de data usam `<Input type="date">`?
- [ ] Valores padrão usam `getCurrentDate()` ou `timestamptzToDisplay()`?
- [ ] Datas para API são enviadas como strings "yyyy-MM-dd" ou Date objects com meio-dia?
- [ ] Exibição usa `formatDateOnly()` ou `formatDateTimeSafe()`?
- [ ] Não há `new Date(stringVariable)` sendo enviado para backend?

---

## 🔗 Referências

- [PostgreSQL TIMESTAMPTZ Documentation](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [date-fns Documentation](https://date-fns.org/)
- [MDN: Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [Relatório de Análise TIMESTAMPTZ (Backend)](/tmp/relatorio-analise-timestamptz.md)
- [Auditoria Frontend TIMESTAMPTZ](./AUDITORIA-FRONTEND-TIMESTAMPTZ.md)

---

## 📝 Histórico de Alterações

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 06/12/2025 | 1.0 | Claude Sonnet 4.5 | Criação inicial do guia após migração TIMESTAMPTZ |

---

**Dúvidas ou sugestões?**
Abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.
