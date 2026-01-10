# 📋 PLANO DETALHADO DE REFATORAÇÃO

## Alinhamento aos Padrões Arquiteturais do Sistema

**Versão:** 1.0
**Data:** 2026-01-10
**Responsável:** Dr. E. (Emanuel)
**Esforço Total Estimado:** 3-5 dias de desenvolvimento

---

## ÍNDICE

1. [Análise de Dependências](#1-análise-de-dependências)
2. [Estratégia de Refatoração](#2-estratégia-de-refatoração)
3. [Fase 1: Preparação](#fase-1-preparação)
4. [Fase 2: Criação dos Novos Módulos](#fase-2-criação-dos-novos-módulos)
5. [Fase 3: Migração de Código](#fase-3-migração-de-código)
6. [Fase 4: Refatoração de Rotas](#fase-4-refatoração-de-rotas)
7. [Fase 5: Testes e Validação](#fase-5-testes-e-validação)
8. [Fase 6: Limpeza e Documentação](#fase-6-limpeza-e-documentação)
9. [Estratégia de Deploy](#estratégia-de-deploy)
10. [Checklist de Validação](#checklist-de-validação)

---

## 1. ANÁLISE DE DEPENDÊNCIAS

### **Mapa de Dependências Atual**

```
┌─────────────────────────────────────────────────────────────┐
│                     DailyRecordsModule                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  DailyRecordsService                               │    │
│  │    ├─ IncidentInterceptorService ────────┐         │    │
│  │    │    └─ SentinelEventService          │         │    │
│  │    └─ SentinelEventService ──────────────┘         │    │
│  │                                                     │    │
│  │  IndicadoresRdcService (independente)              │    │
│  │  IndicadoresRdcCronService                         │    │
│  │    └─ IndicadoresRdcService                        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        AdminModule                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AdminComplianceService (independente)             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### **Pontos de Acoplamento Identificados**

1. **DailyRecordsService → IncidentInterceptorService**
   - Linha 24 de `apps/backend/src/daily-records/daily-records.service.ts`
   - Chamado no método `create()` (linha 101)

2. **DailyRecordsService → SentinelEventService**
   - Linha 25 de `apps/backend/src/daily-records/daily-records.service.ts`
   - Chamado no método `create()` (linha 119)

3. **IncidentInterceptorService → SentinelEventService**
   - Linha 25 de `apps/backend/src/daily-records/incident-interceptor.service.ts`
   - Injeção opcional para evitar dependência circular

4. **DailyRecordsController → IndicadoresRdcService + SentinelEventService**
   - Injeção no construtor para endpoints de conformidade

### **Tabelas de Banco Afetadas**

| Tabela | Uso Atual | Uso Futuro |
|--------|-----------|------------|
| `daily_records` | DailyRecordsModule | DailyRecordsModule (sem mudanças) |
| `sentinel_event_notifications` | DailyRecordsModule | SentinelEventsModule |
| `incident_monthly_indicators` | DailyRecordsModule | RdcIndicatorsModule |

---

## 2. ESTRATÉGIA DE REFATORAÇÃO

### **Princípios Norteadores**

1. ✅ **Zero Downtime**: Sistema continua funcionando durante refatoração
2. ✅ **Backward Compatibility**: Rotas antigas mantidas temporariamente
3. ✅ **Isolamento de Mudanças**: Cada fase é independente e testável
4. ✅ **Event-Driven**: Desacoplamento via eventos (NestJS Events)
5. ✅ **Simplicidade**: Minimizar alterações no código existente

### **Abordagem: Refatoração Incremental com Eventos**

Ao invés de refatorar tudo de uma vez, vamos:

1. Criar novos módulos vazios
2. Mover código gradualmente
3. Usar **Events** do NestJS para desacoplar
4. Manter rotas antigas funcionando
5. Migrar frontend para novas rotas
6. Deprecar rotas antigas

### **Padrão de Desacoplamento: Domain Events**

```typescript
// Evento disparado quando Daily Record é criado
class DailyRecordCreatedEvent {
  constructor(
    public readonly record: DailyRecord,
    public readonly tenantId: string,
    public readonly userId: string
  ) {}
}

// DailyRecordsService emite evento
this.eventEmitter.emit('daily-record.created', new DailyRecordCreatedEvent(...));

// SentinelEventsService escuta evento (em outro módulo)
@OnEvent('daily-record.created')
async handleDailyRecordCreated(event: DailyRecordCreatedEvent) {
  // Processar evento sentinela
}
```

**Vantagens:**
- ✅ Módulos não precisam conhecer uns aos outros
- ✅ Fácil adicionar novos listeners
- ✅ Testável isoladamente

---

## FASE 1: PREPARAÇÃO

**Objetivo:** Preparar terreno sem quebrar nada
**Duração:** 2-3 horas
**Risco:** 🟢 Baixo

### **1.1. Instalar Dependências**

```bash
# EventEmitter do NestJS (se não tiver)
npm install @nestjs/event-emitter
```

### **1.2. Configurar EventEmitter**

**Arquivo:** `apps/backend/src/app.module.ts`

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... outros módulos
  ],
})
export class AppModule {}
```

### **1.3. Criar Estrutura de Diretórios**

```bash
# Criar novos módulos vazios
mkdir -p apps/backend/src/sentinel-events/dto
mkdir -p apps/backend/src/rdc-indicators/dto
mkdir -p apps/backend/src/compliance/dto

# Criar arquivos events
mkdir -p apps/backend/src/daily-records/events
```

### **1.4. Backup de Segurança**

```bash
# Criar branch de backup
git checkout -b backup/pre-refactoring
git add .
git commit -m "backup: estado antes da refatoração de conformidade"
git checkout main

# Criar branch de trabalho
git checkout -b refactor/conformidade-rdc
```

### **1.5. Documentar Estado Atual**

Criar arquivo `REFACTORING.md` na raiz documentando:
- Endpoints atuais e suas responsabilidades
- Dependências entre módulos
- Testes existentes que precisam ser atualizados

---

## FASE 2: CRIAÇÃO DOS NOVOS MÓDULOS

**Objetivo:** Criar módulos vazios seguindo padrão
**Duração:** 1-2 horas
**Risco:** 🟢 Baixo

### **2.1. Estrutura de Arquivos - Sentinel Events**

```
apps/backend/src/sentinel-events/
├── dto/
│   ├── query-sentinel-event.dto.ts
│   ├── update-sentinel-event-status.dto.ts
│   └── index.ts
├── events/
│   └── daily-record-created.event.ts
├── sentinel-events.controller.ts
├── sentinel-events.service.ts
└── sentinel-events.module.ts
```

### **2.2. Estrutura de Arquivos - RDC Indicators**

```
apps/backend/src/rdc-indicators/
├── dto/
│   ├── query-indicators.dto.ts
│   └── index.ts
├── rdc-indicators.controller.ts
├── rdc-indicators.service.ts
├── rdc-indicators-cron.service.ts
└── rdc-indicators.module.ts
```

### **2.3. Estrutura de Arquivos - Compliance**

```
apps/backend/src/compliance/
├── dto/
│   ├── daily-compliance-response.dto.ts
│   └── index.ts
├── compliance.controller.ts
├── compliance.service.ts
└── compliance.module.ts
```

### **2.4. Registrar Novos Módulos no AppModule**

```typescript
import { SentinelEventsModule } from './sentinel-events/sentinel-events.module';
import { RdcIndicatorsModule } from './rdc-indicators/rdc-indicators.module';
import { ComplianceModule } from './compliance/compliance.module';

@Module({
  imports: [
    // ... módulos existentes
    SentinelEventsModule,
    RdcIndicatorsModule,
    ComplianceModule,
  ],
})
export class AppModule {}
```

---

## FASE 3: MIGRAÇÃO DE CÓDIGO

**Objetivo:** Mover lógica para novos módulos
**Duração:** 4-6 horas
**Risco:** 🟡 Moderado

### **3.1. Migrar SentinelEventService**

- Copiar todo conteúdo de `apps/backend/src/daily-records/sentinel-event.service.ts`
- Para `apps/backend/src/sentinel-events/sentinel-events.service.ts`
- Adicionar listener de eventos `@OnEvent('daily-record.created')`

### **3.2. Migrar IndicadoresRdcService**

- Copiar de `apps/backend/src/daily-records/indicadores-rdc.service.ts`
- Para `apps/backend/src/rdc-indicators/rdc-indicators.service.ts`
- Copiar Cron de `indicadores-rdc.cron.ts` para `rdc-indicators-cron.service.ts`

### **3.3. Migrar AdminComplianceService**

- Copiar de `apps/backend/src/admin/admin-compliance.service.ts`
- Para `apps/backend/src/compliance/compliance.service.ts`
- Renomear método `getTodayCompliance()` para `getDailySummary()`

### **3.4. Manter IncidentInterceptorService em DailyRecords**

- Mantém específico do domínio de Daily Records
- Apenas dispara eventos para outros módulos

---

## FASE 4: REFATORAÇÃO DE ROTAS

**Objetivo:** Integrar eventos e deprecar rotas antigas
**Duração:** 2-3 horas
**Risco:** 🟡 Moderado

### **4.1. Adicionar Emissão de Eventos no DailyRecordsService**

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DailyRecordCreatedEvent } from '../sentinel-events/events/daily-record-created.event';

// No método create(), após criar record:
this.eventEmitter.emit(
  'daily-record.created',
  new DailyRecordCreatedEvent(record, tenantId, userId)
);
```

### **4.2. Criar Rotas nos Novos Controllers**

**SentinelEventsController:**
- `GET /sentinel-events` - Listar eventos
- `PATCH /sentinel-events/:id` - Atualizar status

**RdcIndicatorsController:**
- `GET /rdc-indicators` - Obter indicadores
- `GET /rdc-indicators/history` - Histórico
- `POST /rdc-indicators/calculate` - Calcular manualmente

**ComplianceController:**
- `GET /compliance/daily-summary` - Resumo do dia

### **4.3. Marcar Rotas Antigas como Deprecated**

```typescript
@Get('eventos-sentinela/list')
@ApiOperation({
  summary: 'Listar eventos sentinela',
  deprecated: true,
  description: '⚠️ DEPRECATED: Use GET /sentinel-events',
})
```

---

## FASE 5: TESTES E VALIDAÇÃO

**Objetivo:** Garantir que tudo funciona
**Duração:** 3-4 horas
**Risco:** 🟢 Baixo

### **5.1. Testes Unitários**

- Criar `sentinel-events.service.spec.ts`
- Criar `rdc-indicators.service.spec.ts`
- Criar `compliance.service.spec.ts`

### **5.2. Testes E2E**

- Testar fluxo completo de criação de evento sentinela
- Testar cálculo de indicadores
- Testar obtenção de conformidade

### **5.3. Testes de Compatibilidade**

- Verificar que rotas antigas retornam mesmos dados que novas
- Garantir backward compatibility

---

## FASE 6: LIMPEZA E DOCUMENTAÇÃO

**Objetivo:** Remover código duplicado e finalizar
**Duração:** 2-3 horas
**Risco:** 🟢 Baixo

### **6.1. Remover Código Antigo**

```bash
# Deletar arquivos migrados
rm apps/backend/src/daily-records/sentinel-event.service.ts
rm apps/backend/src/daily-records/indicadores-rdc.service.ts
rm apps/backend/src/daily-records/indicadores-rdc.cron.ts
rm apps/backend/src/admin/admin-compliance.service.ts
```

### **6.2. Limpar Módulos**

- Remover injeções de services antigos
- Remover imports não utilizados
- Atualizar providers nos modules

### **6.3. Atualizar Documentação**

- Atualizar `README.md`
- Criar `docs/MIGRATION.md`
- Atualizar `CHANGELOG.md`

---

## ESTRATÉGIA DE DEPLOY

### **Deploy em Produção - Blue-Green**

1. **Deploy com código duplicado** (Fase 4)
2. **Validação em produção** (rotas antigas e novas)
3. **Migração gradual do frontend** (10% → 50% → 100%)
4. **Deploy final** após 2 semanas (Fase 6)

### **Rollback Plan**

- Até Fase 4: Rollback completo disponível
- Fase 5+: Rollback parcial (reverter frontend)

---

## CHECKLIST DE VALIDAÇÃO FINAL

### **Antes do Deploy**

- [ ] Todos testes unitários passando
- [ ] Todos testes E2E passando
- [ ] Coverage > 80%
- [ ] Build sem erros
- [ ] Linter sem warnings
- [ ] Swagger atualizado

### **Pós-Deploy**

- [ ] Testar criação de evento sentinela
- [ ] Verificar notificações criadas
- [ ] Testar cálculo de indicadores
- [ ] Comparar rotas antigas vs novas
- [ ] Monitorar logs por 24h

---

## ESTIMATIVAS DE ESFORÇO

| Fase | Duração | Risco |
|------|---------|-------|
| 1. Preparação | 2-3h | 🟢 Baixo |
| 2. Criação Módulos | 1-2h | 🟢 Baixo |
| 3. Migração Código | 4-6h | 🟡 Moderado |
| 4. Refatoração Rotas | 2-3h | 🟡 Moderado |
| 5. Testes | 3-4h | 🟢 Baixo |
| 6. Limpeza | 2-3h | 🟢 Baixo |
| **TOTAL** | **14-21h (3-5 dias)** | 🟡 Moderado |

---

## NOVOS ENDPOINTS

### **Sentinel Events**
```
GET    /sentinel-events                  - Listar eventos sentinela
PATCH  /sentinel-events/:id              - Atualizar status
```

### **RDC Indicators**
```
GET    /rdc-indicators                   - Obter indicadores do mês
GET    /rdc-indicators/history           - Histórico (12 meses)
POST   /rdc-indicators/calculate         - Calcular manualmente
```

### **Compliance**
```
GET    /compliance/daily-summary         - Resumo diário
```

### **Deprecated (manter até v2.0)**
```
GET    /daily-records/eventos-sentinela/list
PUT    /daily-records/eventos-sentinela/:id/status
GET    /daily-records/indicadores-rdc
GET    /admin/compliance/today
```

---

**Fim do Plano de Refatoração v1.0**
