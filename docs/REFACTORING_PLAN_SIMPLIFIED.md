# 📋 PLANO SIMPLIFICADO DE REFATORAÇÃO
## Sistema Fora de Produção - Versão Ágil

**Versão:** 2.0 (Simplificada)
**Data:** 2026-01-10
**Contexto:** ✅ Sistema ainda não está em produção
**Esforço Total:** **1-2 dias** (7-11 horas)

---

## 📊 COMPARAÇÃO COM PLANO ORIGINAL

| Aspecto | Plano Original | Plano Simplificado |
|---------|----------------|-------------------|
| **Fases** | 6 fases | 3 fases |
| **Backward Compatibility** | ✅ Obrigatório | ❌ Não necessário |
| **Código Duplicado** | ✅ Temporário | ❌ Evitado |
| **Rotas Deprecated** | ✅ Mantidas | ❌ Removidas direto |
| **Deploy Blue-Green** | ✅ Necessário | ❌ Não necessário |
| **Duração** | 14-21h (3-5 dias) | 7-11h (1-2 dias) |
| **Risco** | 🟡 Moderado | 🟢 Baixo |

---

## 🚀 FASE 1: CRIAÇÃO E MIGRAÇÃO DIRETA
**Duração:** 4-6 horas
**Risco:** 🟢 Baixo

### **Checklist de Implementação:**

#### **1.1. Setup Inicial**
- [ ] Instalar `@nestjs/event-emitter`
- [ ] Configurar EventEmitterModule no app.module.ts
- [ ] Criar estrutura de diretórios dos novos módulos
- [ ] Criar branch de trabalho `refactor/conformidade-rdc`

#### **1.2. Mover Arquivos (sem duplicação)**
- [ ] Mover `sentinel-event.service.ts` → `sentinel-events/sentinel-events.service.ts`
- [ ] Mover `indicadores-rdc.service.ts` → `rdc-indicators/rdc-indicators.service.ts`
- [ ] Mover `indicadores-rdc.cron.ts` → `rdc-indicators/rdc-indicators-cron.service.ts`
- [ ] Mover `admin-compliance.service.ts` → `compliance/compliance.service.ts`

#### **1.3. Renomear Classes**
- [ ] `SentinelEventService` → `SentinelEventsService`
- [ ] `IndicadoresRdcService` → `RdcIndicatorsService`
- [ ] `IndicadoresRdcCronService` → `RdcIndicatorsCronService`
- [ ] `AdminComplianceService` → `ComplianceService`
- [ ] Renomear método `getTodayCompliance()` → `getDailySummary(tenantId: string)`

#### **1.4. Criar DTOs**
- [ ] `sentinel-events/dto/query-sentinel-event.dto.ts`
- [ ] `sentinel-events/dto/update-sentinel-event-status.dto.ts`
- [ ] `sentinel-events/dto/index.ts`
- [ ] `rdc-indicators/dto/query-indicators.dto.ts`
- [ ] `rdc-indicators/dto/index.ts`
- [ ] `compliance/dto/daily-compliance-response.dto.ts`
- [ ] `compliance/dto/index.ts`

#### **1.5. Criar Events**
- [ ] `sentinel-events/events/daily-record-created.event.ts`

#### **1.6. Criar Controllers**
- [ ] `sentinel-events/sentinel-events.controller.ts` (com Swagger completo)
- [ ] `rdc-indicators/rdc-indicators.controller.ts` (com Swagger completo)
- [ ] `compliance/compliance.controller.ts` (com Swagger completo)

#### **1.7. Criar Modules**
- [ ] `sentinel-events/sentinel-events.module.ts`
- [ ] `rdc-indicators/rdc-indicators.module.ts`
- [ ] `compliance/compliance.module.ts`

#### **1.8. Adicionar Event Listeners**
- [ ] Adicionar `@OnEvent('daily-record.created')` no SentinelEventsService

#### **1.9. Refatorar DailyRecordsService**
- [ ] Injetar `EventEmitter2`
- [ ] Emitir evento `daily-record.created` no método `create()`
- [ ] **REMOVER** injeção de `SentinelEventService`
- [ ] **REMOVER** chamada direta `sentinelEventService.triggerSentinelEventWorkflow()`

#### **1.10. Refatorar IncidentInterceptorService**
- [ ] **REMOVER** injeção opcional de `SentinelEventService`

#### **1.11. Limpar DailyRecordsModule**
- [ ] **REMOVER** `IndicadoresRdcService` dos providers
- [ ] **REMOVER** `IndicadoresRdcCronService` dos providers
- [ ] **REMOVER** `SentinelEventService` dos providers
- [ ] Manter apenas `DailyRecordsService` e `IncidentInterceptorService`

#### **1.12. Limpar DailyRecordsController**
- [ ] **REMOVER** injeção de `IndicadoresRdcService`
- [ ] **REMOVER** injeção de `SentinelEventService`
- [ ] **DELETAR** rota `GET eventos-sentinela/list`
- [ ] **DELETAR** rota `PUT eventos-sentinela/:id/status`
- [ ] **DELETAR** rota `GET indicadores-rdc`
- [ ] **DELETAR** rota `GET indicadores-rdc/history`
- [ ] **DELETAR** rota `POST indicadores-rdc/calculate`

#### **1.13. Limpar AdminModule**
- [ ] **REMOVER** `AdminComplianceService` dos providers
- [ ] Limpar array de providers se ficar vazio

#### **1.14. Limpar AdminController**
- [ ] **REMOVER** injeção de `AdminComplianceService`
- [ ] **DELETAR** rota `GET compliance/today`

#### **1.15. Registrar Novos Módulos**
- [ ] Importar `SentinelEventsModule` no AppModule
- [ ] Importar `RdcIndicatorsModule` no AppModule
- [ ] Importar `ComplianceModule` no AppModule

#### **1.16. Verificar Compilação**
- [ ] `npm run build` sem erros
- [ ] `npm run lint` sem warnings
- [ ] `npx tsc --noEmit` sem erros de tipo

---

## 🧪 FASE 2: TESTES E VALIDAÇÃO
**Duração:** 2-3 horas
**Risco:** 🟢 Baixo

### **Checklist de Testes:**

#### **2.1. Testes Unitários Básicos**
- [ ] Criar `sentinel-events/sentinel-events.service.spec.ts`
- [ ] Criar `rdc-indicators/rdc-indicators.service.spec.ts`
- [ ] Criar `compliance/compliance.service.spec.ts`
- [ ] `npm run test` sem falhas

#### **2.2. Testes Manuais - Sentinel Events**
- [ ] Iniciar servidor: `npm run start:dev`
- [ ] Criar Daily Record normal → Não deve criar evento sentinela
- [ ] Criar Daily Record com `isEventoSentinela=true` → Deve criar evento sentinela
- [ ] `GET /sentinel-events` → Deve listar eventos
- [ ] `PATCH /sentinel-events/:id` → Deve atualizar status

#### **2.3. Testes Manuais - RDC Indicators**
- [ ] `GET /rdc-indicators?year=2026&month=1` → Deve retornar indicadores
- [ ] `GET /rdc-indicators/history` → Deve retornar histórico
- [ ] `POST /rdc-indicators/calculate` → Deve calcular indicadores

#### **2.4. Testes Manuais - Compliance**
- [ ] `GET /compliance/daily-summary` → Deve retornar resumo do dia

#### **2.5. Verificar Swagger**
- [ ] Acessar `http://localhost:3000/api`
- [ ] Verificar grupo "Sentinel Events" com 2 endpoints
- [ ] Verificar grupo "RDC Indicators" com 3 endpoints
- [ ] Verificar grupo "Compliance" com 1 endpoint
- [ ] Verificar que rotas antigas NÃO aparecem

#### **2.6. Verificar Logs de Eventos**
- [ ] Criar evento sentinela e verificar log: `⚠️ EVENTO SENTINELA DETECTADO`
- [ ] Verificar que listener foi acionado

---

## 📝 FASE 3: DOCUMENTAÇÃO E FINALIZAÇÃO
**Duração:** 1-2 horas
**Risco:** 🟢 Baixo

### **Checklist de Documentação:**

#### **3.1. Atualizar README.md**
- [ ] Adicionar seção "Módulos de Conformidade RDC 502/2021"
- [ ] Documentar novos endpoints
- [ ] Documentar workflow de eventos sentinela

#### **3.2. Atualizar CHANGELOG.md**
- [ ] Adicionar entrada `[1.5.0] - 2026-01-10`
- [ ] Listar mudanças: Adicionado, Alterado, Removido, Corrigido

#### **3.3. Criar Documentação de API** (opcional)
- [ ] Criar `docs/api/COMPLIANCE_API.md`
- [ ] Documentar todos os endpoints com exemplos

#### **3.4. Commit Final**
- [ ] `git add .`
- [ ] Criar commit com mensagem detalhada
- [ ] `git push origin refactor/conformidade-rdc`

#### **3.5. Merge e Limpeza**
- [ ] Criar Pull Request (se aplicável)
- [ ] Merge para `main`
- [ ] Deletar branch de trabalho

---

## 📦 ESTRUTURA FINAL DOS MÓDULOS

### **Novos Módulos Criados:**

```
✨ sentinel-events/
├── dto/
│   ├── query-sentinel-event.dto.ts
│   ├── update-sentinel-event-status.dto.ts
│   └── index.ts
├── events/
│   └── daily-record-created.event.ts
├── sentinel-events.controller.ts
├── sentinel-events.service.ts
└── sentinel-events.module.ts

✨ rdc-indicators/
├── dto/
│   ├── query-indicators.dto.ts
│   └── index.ts
├── rdc-indicators.controller.ts
├── rdc-indicators.service.ts
├── rdc-indicators-cron.service.ts
└── rdc-indicators.module.ts

✨ compliance/
├── dto/
│   ├── daily-compliance-response.dto.ts
│   └── index.ts
├── compliance.controller.ts
├── compliance.service.ts
└── compliance.module.ts
```

### **Módulos Limpos:**

```
✅ daily-records/
├── dto/
├── daily-records.controller.ts       (apenas rotas de daily records)
├── daily-records.service.ts          (emite eventos)
├── incident-interceptor.service.ts   (mantido - específico do domínio)
└── daily-records.module.ts           (2 providers apenas)

✅ admin/
├── admin.controller.ts               (apenas planos/pagamentos/contratos)
└── admin.module.ts                   (sem compliance)
```

---

## 🎯 NOVOS ENDPOINTS

### **Sentinel Events**
```http
GET    /sentinel-events                  # Listar eventos sentinela
PATCH  /sentinel-events/:id              # Atualizar status de notificação
```

### **RDC Indicators**
```http
GET    /rdc-indicators                   # Obter indicadores do mês
GET    /rdc-indicators/history           # Histórico de 12 meses
POST   /rdc-indicators/calculate         # Calcular manualmente
```

### **Compliance**
```http
GET    /compliance/daily-summary         # Resumo diário de conformidade
```

### **Rotas Removidas:**
```http
❌ GET    /daily-records/eventos-sentinela/list
❌ PUT    /daily-records/eventos-sentinela/:id/status
❌ GET    /daily-records/indicadores-rdc
❌ GET    /daily-records/indicadores-rdc/history
❌ POST   /daily-records/indicadores-rdc/calculate
❌ GET    /admin/compliance/today
```

---

## ⏱️ CRONOGRAMA SUGERIDO

### **Dia 1 (Manhã - 4h)**
- ✅ Fase 1: Itens 1.1 a 1.8 (Setup + Criação de arquivos)

### **Dia 1 (Tarde - 3h)**
- ✅ Fase 1: Itens 1.9 a 1.16 (Refatoração + Limpeza)
- ✅ Verificar compilação

### **Dia 2 (Manhã - 3h)**
- ✅ Fase 2: Testes completos
- ✅ Validar Swagger

### **Dia 2 (Tarde - 1h)**
- ✅ Fase 3: Documentação + Commit + Merge

**TOTAL: 1-2 dias de trabalho focado**

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Sistema compila sem erros
- [ ] Todos os testes passando
- [ ] Eventos sentinela sendo criados automaticamente
- [ ] Novos endpoints funcionando corretamente
- [ ] Rotas antigas removidas
- [ ] Swagger atualizado e documentado
- [ ] Código commitado e mergeado
- [ ] Documentação atualizada

---

**Fim do Plano Simplificado v2.0**
