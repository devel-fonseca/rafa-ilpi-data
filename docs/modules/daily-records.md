# Módulo: Registros Diários (Daily Records)

**Status:** ✅ Implementado
**Versão:** 1.1.0
**Última atualização:** 16/12/2025

## Visão Geral

Sistema completo de registros diários para documentar a rotina e cuidados dos residentes em ILPIs. Oferece 10 tipos diferentes de registros, versionamento completo com auditoria, e integração automática com sinais vitais.

## Funcionalidades Principais

- ✅ **10 tipos de registro**: Higiene, Alimentação, Hidratação, Monitoramento, Eliminação, Comportamento, Intercorrência, Atividades, Visita, Outros
- ✅ **Versionamento completo**: Histórico imutável de todas as alterações com snapshots JSON
- ✅ **Auditoria total**: Rastreamento de quem, quando, por quê e o que mudou
- ✅ **Sincronização automática**: Registros de monitoramento criam automaticamente sinais vitais
- ✅ **Soft delete**: Motivo obrigatório para exclusões com preservação de dados
- ✅ **Timeline visual**: Interface cronológica intuitiva para profissionais de saúde
- ✅ **Restauração de versões**: Capacidade de reverter para estados anteriores
- ✅ **Dashboard clínico**: Cards de resumo com alergias, condições, sinais vitais e nutrição
- ✅ **Cálculos automáticos**: IMC, aceitação alimentar e hidratação total

## Interface de Usuário

### Dashboard de Resumo Clínico

A página de registros diários apresenta um dashboard completo dividido em 3 grids responsivos:

#### Grid 1: Informações Clínicas Críticas (3 colunas)

1. **Card de Alergias** (vermelho)
   - Exibe todas as alergias ativas do residente
   - Informações: alérgeno, reação, gravidade
   - Integração: `useAllergiesByResident(residentId)`
   - Ícone: AlertCircle

2. **Card de Condições Crônicas** (amarelo)
   - Lista condições ativas
   - Informações: nome, CID-10, início, status
   - Integração: `useConditionsByResident(residentId)`
   - Ícone: Activity

3. **Card de Restrições Alimentares** (azul)
   - Lista restrições dietéticas
   - Informações: tipo, grau, observações
   - Integração: `useDietaryRestrictionsByResident(residentId)`
   - Ícone: UtensilsCrossed

#### Grid 2: Ações Rápidas (3 colunas)

- **Tarefas do Dia**: Lista de registros obrigatórios
- **Timeline**: Histórico cronológico dos registros
- **Adicionar Registro**: 10 tipos de registro disponíveis

#### Grid 3: Resumo Quantitativo (3 colunas)

1. **Card de Sinais Vitais e Antropometria** (roxo)
   - Dados antropométricos:
     - Peso (kg)
     - Altura (m)
     - IMC com classificação (cores: verde/amarelo/laranja/vermelho)
   - Sinais vitais cardiovasculares:
     - Pressão Arterial (mmHg)
     - Frequência Cardíaca (bpm)
     - SpO₂ (%)
   - Sinais vitais metabólicos:
     - Temperatura (°C)
     - Glicemia (mg/dL)
   - Fonte: Registros de PESO e MONITORAMENTO
   - Ícone: Heart

2. **Card de Aceitação Alimentar Total** (laranja)
   - Percentual de aceitação: 0-100%
   - Baseado em 6 refeições diárias (600 pontos total)
   - Conversão de valores:
     - 100% → 100 pontos
     - 75% → 75 pontos
     - 50% → 50 pontos
     - <25% → 25 pontos
     - Recusou → 0 pontos
   - Fórmula: `(soma_pontos / 600) × 100`
   - Exibe quantidade de refeições registradas
   - Fonte: Registros de ALIMENTACAO
   - Ícone: Utensils

3. **Card de Total de Líquidos Ingeridos** (ciano)
   - Volume total em ml
   - Breakdown por fonte:
     - Hidratação direta (registros HIDRATACAO)
     - Durante refeições (registros ALIMENTACAO com volumeMl)
   - Fonte: Registros de HIDRATACAO e ALIMENTACAO
   - Ícone: Droplets

### Padronização de Altura

O sistema implementa entrada de altura padronizada em centímetros para melhor UX:

- **Camada de Apresentação** (Frontend):
  - Input numérico em centímetros (ex: "170")
  - Máscara: apenas dígitos, máximo 3 caracteres
  - Label: "Altura (cm)"

- **Camada de Dados** (Backend):
  - Armazenamento em metros (ex: 1.70)
  - Tipo: `Decimal(5,2)`

- **Conversões Automáticas**:
  - **Ao salvar**: CM → metros (170 → 1.70)
  - **Ao carregar**: metros → CM (1.70 → "170")
  - **Auto-detecção**: valores < 10 = metros, >= 10 = centímetros

- **Cálculo de IMC**:

  ```typescript
  // Garantir que altura esteja em metros
  const alturaMetros = alturaCm / 100
  const imc = peso / (alturaMetros * alturaMetros)
  ```

- **Classificação de IMC**:
  - < 18.5: Baixo peso (amarelo)
  - 18.5-24.9: Peso normal (verde)
  - 25.0-29.9: Sobrepeso (laranja)
  - ≥ 30.0: Obesidade (vermelho)

## Arquitetura

### Backend

**Controller:** [apps/backend/src/daily-records/daily-records.controller.ts](../../apps/backend/src/daily-records/daily-records.controller.ts)
**Service:** [apps/backend/src/daily-records/daily-records.service.ts](../../apps/backend/src/daily-records/daily-records.service.ts)
**DTOs:** [apps/backend/src/daily-records/dto/](../../apps/backend/src/daily-records/dto/)
**Migration:** `20251115141651_add_daily_records`

### Frontend

**Páginas:**
- [apps/frontend/src/pages/daily-records/DailyRecordsPage.tsx](../../apps/frontend/src/pages/daily-records/DailyRecordsPage.tsx)

**API Client:** [apps/frontend/src/api/dailyRecords.api.ts](../../apps/frontend/src/api/dailyRecords.api.ts)
**Hooks:** [apps/frontend/src/hooks/useDailyRecords.ts](../../apps/frontend/src/hooks/useDailyRecords.ts)
**Types:** [apps/frontend/src/types/dailyRecords.types.ts](../../apps/frontend/src/types/dailyRecords.types.ts)

## Modelos de Dados

### DailyRecord

```prisma
model DailyRecord {
  id          String             @id @default(uuid()) @db.Uuid
  tenantId    String             @db.Uuid
  residentId  String             @db.Uuid
  recordType  DailyRecordType    // Enum com 10 tipos
  date        DateTime           @db.Timestamptz(3)
  time        String?            @db.VarChar(5)  // HH:MM
  notes       String             @db.Text
  createdBy   String             @db.Uuid
  updatedBy   String?            @db.Uuid
  createdAt   DateTime           @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime           @updatedAt @db.Timestamptz(3)
  deletedAt   DateTime?          @db.Timestamptz(3)

  tenant      Tenant             @relation(...)
  resident    Resident           @relation(...)
  history     DailyRecordHistory[]
}
```

### DailyRecordHistory

```prisma
model DailyRecordHistory {
  id             String          @id @default(uuid()) @db.Uuid
  tenantId       String          @db.Uuid
  recordId       String          @db.Uuid
  changeReason   String          @db.Text
  previousData   Json
  newData        Json
  changedFields  String[]
  changedBy      String          @db.Uuid
  changedAt      DateTime        @default(now()) @db.Timestamptz(3)

  record         DailyRecord     @relation(...)
}
```

### Enum DailyRecordType

- `HIGIENE` - Higiene corporal e pessoal
- `ALIMENTACAO` - Refeições e nutrição
- `HIDRATACAO` - Ingestão de líquidos
- `MONITORAMENTO` - Sinais vitais (PA, FC, Temp, Glicemia, SpO2)
- `ELIMINACAO` - Eliminações fisiológicas
- `COMPORTAMENTO` - Estado emocional e comportamental
- `INTERCORRENCIA` - Eventos e intercorrências
- `ATIVIDADES` - Atividades coletivas
- `VISITA` - Visitas de familiares
- `OUTROS` - Outros registros

## Endpoints da API

### CRUD Básico

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| POST | `/api/daily-records` | Criar registro | CREATE_DAILY_RECORDS |
| GET | `/api/daily-records/resident/:residentId` | Listar registros do residente | VIEW_DAILY_RECORDS |
| GET | `/api/daily-records/:id` | Buscar registro específico | VIEW_DAILY_RECORDS |
| PATCH | `/api/daily-records/:id` | Editar registro (requer editReason) | UPDATE_DAILY_RECORDS |
| DELETE | `/api/daily-records/:id` | Soft delete (requer deleteReason) | DELETE_DAILY_RECORDS |

### Histórico e Versionamento

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/daily-records/:id/history` | Histórico de alterações | VIEW_DAILY_RECORDS |
| POST | `/api/daily-records/:id/restore` | Restaurar versão anterior | UPDATE_DAILY_RECORDS |

### Filtros Avançados

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/daily-records/resident/:residentId/type/:type` | Filtrar por tipo | VIEW_DAILY_RECORDS |
| GET | `/api/daily-records/resident/:residentId/date-range` | Filtrar por período | VIEW_DAILY_RECORDS |
| GET | `/api/daily-records/resident/:residentId/summary` | Resumo estatístico | VIEW_DAILY_RECORDS |
| GET | `/api/daily-records/resident/:residentId/timeline` | Timeline consolidada | VIEW_DAILY_RECORDS |

## Regras de Negócio

### Validações

1. **Criação de Registro**
   - `recordType`: Obrigatório (enum)
   - `date`: Obrigatório (ISO 8601)
   - `time`: Opcional (formato HH:MM)
   - `notes`: Obrigatório (min 10 chars, max 5000)

2. **Edição de Registro**
   - `editReason`: Obrigatório (min 10 chars, max 500)
   - Cria entrada automática em `DailyRecordHistory`
   - Snapshots JSON preservam estado completo

3. **Exclusão de Registro**
   - `deleteReason`: Obrigatório (min 10 chars, max 500)
   - Soft delete (campo `deletedAt`)
   - Snapshot final preservado no histórico

### Integração com Sinais Vitais

Registros do tipo `MONITORAMENTO` sincronizam automaticamente com a tabela `vital_signs`:

- **Criação**: Extrai dados e cria `VitalSign`
- **Edição**: Atualiza `VitalSign` relacionado
- **Exclusão**: Soft delete em `VitalSign`

**Campos mapeados:**
- Pressão Arterial (sistólica/diastólica)
- Frequência Cardíaca
- Temperatura
- Glicemia
- SpO2

### Auditoria

Cada alteração registra:
- ✅ Quem alterou (`changedBy`)
- ✅ Quando alterou (`changedAt`)
- ✅ Por que alterou (`changeReason`)
- ✅ O que mudou (`changedFields`)
- ✅ Estado anterior (`previousData`)
- ✅ Novo estado (`newData`)

## Fluxos de Uso

### 1. Criar Registro de Higiene

```
Profissional → Prontuário → Registros Diários → Adicionar
  ↓
Seleciona tipo "Higiene"
  ↓
Preenche: data, hora, observações
  ↓
Salvar → Validação (Zod) → POST /api/daily-records
  ↓
Backend valida → Insere no banco → Retorna sucesso
  ↓
React Query invalida cache → Timeline atualiza
```

### 2. Editar com Versionamento

```
Usuário clica "Editar" em registro
  ↓
Modal abre com dados atuais
  ↓
Altera campo + digita motivo (obrigatório)
  ↓
PATCH /api/daily-records/:id { data, editReason }
  ↓
Service cria snapshot anterior
  ↓
Transação: UPDATE daily_records + INSERT history
  ↓
React Query invalida → Lista atualiza
```

### 3. Restaurar Versão Anterior

```
Usuário → Ver histórico → Timeline de versões
  ↓
Seleciona versão → Clica "Restaurar"
  ↓
Confirma com motivo
  ↓
POST /api/daily-records/:id/restore { versionId, reason }
  ↓
Service busca snapshot antigo
  ↓
Transação: UPDATE com dados antigos + INSERT history
  ↓
Toast de sucesso → Lista atualiza
```

## Performance e Otimizações

### Índices de Banco de Dados

```sql
CREATE INDEX idx_daily_records_tenant_resident_date
ON daily_records(tenant_id, resident_id, date DESC, deleted_at);

CREATE INDEX idx_daily_records_resident_type
ON daily_records(resident_id, record_type, deleted_at);

CREATE INDEX idx_daily_record_history_record
ON daily_record_history(record_id, changed_at DESC);
```

### React Query Strategy

```typescript
{
  staleTime: 2 * 60 * 1000,  // 2 minutos
  cacheTime: 10 * 60 * 1000,  // 10 minutos
  refetchOnWindowFocus: true,
  onSuccess: () => {
    queryClient.invalidateQueries(['daily-records', residentId])
  }
}
```

## Limitações Conhecidas

1. **Sem edição em lote** - Auditoria requer edição individual
2. **Histórico ilimitado** - Todas versões preservadas indefinidamente
3. **Sincronização unidirecional** - VitalSign manual não cria DailyRecord
4. **Sem bulk import** - Todos registros criados manualmente

## Próximos Passos

- [ ] Busca textual avançada em observações
- [ ] Relatórios automatizados em PDF
- [ ] Templates de observações predefinidas
- [ ] Notificações push de ausência de registros
- [ ] Assinatura digital com certificado
- [ ] Modo offline com sincronização

## Dependências

**Backend:**
- NestJS 10
- Prisma ORM 5.22
- PostgreSQL (Timestamptz)
- class-validator

**Frontend:**
- React 18
- TanStack Query
- react-hook-form
- Zod
- date-fns

## Referências

- [CHANGELOG - 2025-11-15](../../CHANGELOG.md#2025-11-15---módulo-completo-de-registros-diários)
- [Arquitetura Multi-Tenancy](../architecture/multi-tenancy.md)
- [Schema do Banco](../architecture/database-schema.md)
- [Módulo de Sinais Vitais](vital-signs.md)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Data de implementação:** 15/11/2025
