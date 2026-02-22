# Módulo: Alertas Médicos de Sinais Vitais

**Status:** ✅ Implementado
**Versão:** 1.1.0
**Última atualização:** 22/02/2026

## Visão Geral

Sistema completo de alertas médicos persistentes para sinais vitais anormais, integrado com evoluções clínicas (SOAP). Diferente das notificações broadcast (temporárias), os alertas são **registros médicos permanentes** que permitem rastreamento, atribuição e gerenciamento de condutas.

## Atualização Técnica (22/02/2026)

As regras abaixo refletem a implementação atual e **prevalecem** sobre exemplos antigos deste documento:

- O módulo passou a consolidar **alertas vitais e alertas clínicos não-vitais** em uma trilha única de gestão.
- Tipos não-vitais persistidos atualmente:
  - `DIARRHEA_EPISODE_MONITORING`
  - `DESNUTRITION_RISK_MONITORING`
  - `SKIN_LESION_MONITORING`
- Em diarreia, o sistema reutiliza `DIARRHEA_EPISODE_MONITORING` com contexto por metadata:
  - contexto DDA (`rdcIndicator: DIARREIA_AGUDA`);
  - contexto risco de desidratação (`clinicalContext: DEHYDRATION_RISK`, `incidentSubtypeClinical: DESIDRATACAO`, `rdcIndicator: DESIDRATACAO`).
- Fluxo operacional:
  - registro diário gera alerta persistido;
  - Admin/RT decide no gerenciamento do alerta se confirma ou descarta intercorrência;
  - ao confirmar, a intercorrência é criada e vinculada ao alerta.
- `vitalSignId` em `VitalSignAlert` é opcional para suportar alertas clínicos sem vínculo direto em `vital_signs`.

## Funcionalidades Principais

- ✅ **Criação Automática**: Alertas gerados automaticamente quando sinais vitais anormais são detectados
- ✅ **12 Tipos de Alertas**: 9 vitais + 3 clínicos não-vitais persistidos
- ✅ **Severidade Dupla**: CRITICAL (≥160 PA, ≥250 glicemia) e WARNING (≥140 PA, ≥180 glicemia)
- ✅ **Sistema de Prioridades**: Cálculo automático 0-5 (hipoglicemia/hipóxia = 5)
- ✅ **Gerenciamento de Status**: ACTIVE → IN_TREATMENT → MONITORING → RESOLVED/IGNORED
- ✅ **Decisão de Intercorrência**: confirmação/descartes de intercorrência feitos por Admin/RT
- ✅ **Atribuição de Profissionais**: Designar responsável por cada alerta
- ✅ **Notas Médicas**: Documentação de observações e ações tomadas
- ✅ **Integração com Clinical Notes**: Criar evoluções SOAP pré-preenchidas a partir de alertas
- ✅ **Metadata Estruturada**: JSONB com threshold, faixa esperada, valores detectados

## Arquitetura

### Backend

**Prisma Schema:**
- `apps/backend/prisma/schema/vital-signs-alerts.prisma` - Modelo VitalSignAlert + enums
- `apps/backend/prisma/migrations/20260102201500_add_vital_sign_alerts_system/` - Migration

**VitalSignAlerts Module:**
- `apps/backend/src/vital-sign-alerts/vital-sign-alerts.service.ts` - Service (354 linhas)
- `apps/backend/src/vital-sign-alerts/vital-sign-alerts.controller.ts` - Controller REST
- `apps/backend/src/vital-sign-alerts/vital-sign-alerts.module.ts` - Module
- `apps/backend/src/vital-sign-alerts/dto/` - DTOs de validação

**Integrações:**
- `apps/backend/src/vital-signs/vital-signs.service.ts` - Criação automática em `detectAndNotifyAnomalies()`
- `apps/backend/src/clinical-notes/clinical-notes.service.ts` - Método `prefillFromAlert()` (105 linhas)
- `apps/backend/src/clinical-notes/dto/create-clinical-note.dto.ts` - Campo `vitalSignAlertId`

### Frontend

**API Client:**
- `apps/frontend/src/api/vitalSignAlerts.api.ts` - 7 funções API + types completos

**React Query Hooks:**
- `apps/frontend/src/hooks/useVitalSignAlerts.ts` - 5 hooks otimizados

**Components:** (Implementação ativa)
- `apps/frontend/src/components/vital-signs/VitalSignsAlerts.tsx` - Listagem/gestão de alertas vitais
- `apps/frontend/src/components/vital-signs/ManageAlertDialog.tsx` - Gerenciar alerta
- `apps/frontend/src/components/vital-signs/CreateEvolutionFromAlertDialog.tsx` - Criar evolução

## Modelos de Dados

### VitalSignAlert

```prisma
model VitalSignAlert {
  id             String   @id @default(uuid())
  tenantId       String   @db.Uuid
  residentId     String   @db.Uuid
  vitalSignId    String?  @db.Uuid
  notificationId String?  @db.Uuid

  // Tipo e severidade
  type     VitalSignAlertType  // PRESSURE_HIGH, GLUCOSE_LOW, etc.
  severity AlertSeverity       // INFO, WARNING, CRITICAL

  // Descrição do alerta
  title       String  @db.VarChar(255)
  description String  @db.Text
  value       String  @db.VarChar(100)  // "175/98 mmHg", "280 mg/dL"
  metadata    Json    @db.JsonB

  // Gerenciamento
  status     AlertStatus @default(ACTIVE)
  priority   Int         @default(0)      // 0-5 (calculado automaticamente)
  assignedTo String?     @db.Uuid

  // Documentação médica
  medicalNotes String? @db.Text
  actionTaken  String? @db.Text

  // Auditoria
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  resolvedAt DateTime?
  resolvedBy String?   @db.Uuid
  createdBy  String?   @db.Uuid

  // Relacionamentos
  tenant         Tenant
  resident       Resident
  vitalSign      VitalSign?
  notification   Notification?
  clinicalNotes  ClinicalNote[]     // 1:N - Um alerta pode gerar múltiplas evoluções
  assignedUser   User?
  resolvedUser   User?
}
```

### Enums

```typescript
enum VitalSignAlertType {
  PRESSURE_HIGH      // PA sistólica ≥140 (WARNING) ou ≥160 (CRITICAL)
  PRESSURE_LOW       // PA sistólica <90 (WARNING) ou <80 (CRITICAL)
  GLUCOSE_HIGH       // Glicemia ≥180 (WARNING) ou ≥250 (CRITICAL)
  GLUCOSE_LOW        // Glicemia <70 (WARNING) ou <60 (CRITICAL)
  TEMPERATURE_HIGH   // Temperatura ≥38°C (WARNING) ou ≥39°C (CRITICAL)
  TEMPERATURE_LOW    // Temperatura <35.5°C (WARNING) ou <35°C (CRITICAL)
  OXYGEN_LOW         // SpO₂ <92% (WARNING) ou <90% (CRITICAL)
  HEART_RATE_HIGH    // FC >100 (WARNING) ou >120 (CRITICAL)
  HEART_RATE_LOW     // FC <60 (WARNING) ou <50 (CRITICAL)
  DIARRHEA_EPISODE_MONITORING    // Episódios diarreicos (DDA e risco de desidratação via metadata)
  DESNUTRITION_RISK_MONITORING   // Risco de desnutrição por padrão alimentar
  SKIN_LESION_MONITORING         // Possível lesão/úlcera detectada em observação
}

enum AlertStatus {
  ACTIVE       // Aguardando conduta (recém-criado)
  IN_TREATMENT // Em tratamento (conduta aplicada ou evolução criada)
  MONITORING   // Sob monitoramento contínuo
  RESOLVED     // Resolvido com sucesso
  IGNORED      // Ignorado (com justificativa em medicalNotes)
}

// AlertSeverity reutiliza enum existente em enums.prisma
enum AlertSeverity {
  INFO      // Informativo
  WARNING   // Atenção necessária
  CRITICAL  // Intervenção imediata
}
```

## API Endpoints

### VitalSignAlerts

```typescript
// Criar alerta (geralmente chamado automaticamente pelo sistema)
POST /vital-sign-alerts
Body: CreateVitalSignAlertDto
Response: VitalSignAlert

// Listar alertas com filtros e paginação
GET /vital-sign-alerts?residentId=...&status=...&page=1&limit=50
Response: { data: VitalSignAlert[], pagination: {...} }

// Estatísticas de alertas por status
GET /vital-sign-alerts/stats
Response: { active: 5, inTreatment: 3, resolved: 12, ... }

// Alertas ativos de um residente específico
GET /vital-sign-alerts/resident/:residentId/active
Response: VitalSignAlert[]

// Buscar alerta por ID
GET /vital-sign-alerts/:id
Response: VitalSignAlert (com includes completos)

// Atualizar alerta (status, atribuição, notas)
PATCH /vital-sign-alerts/:id
Body: UpdateVitalSignAlertDto
Response: VitalSignAlert
```

### ClinicalNotes Integration

```typescript
// Pré-preencher evolução SOAP a partir de alerta
GET /clinical-notes/prefill-from-alert/:alertId
Response: {
  objective: string       // Sinais vitais + descrição do alerta
  assessment: string      // Severidade + orientações clínicas
  residentId: string
  suggestedTags: string[] // Ex: ["Sinais Vitais Anormais", "Cardiovascular", "Urgente"]
}
```

## Fluxo Automático de Criação

1. **Registro clínico de origem**:
   - Monitoramento (sinais vitais) via `VitalSignsService`
   - Regras clínicas não-vitais via `IncidentInterceptorService` (ex.: diarreia <3/24h, diarreia >=3/24h com suspeita DDA/risco de desidratação, risco de desnutrição, lesão cutânea suspeita)
2. **Detecção de anomalia/regra clínica**:
   - `VitalSignsService.detectAndNotifyAnomalies()` para parâmetros vitais
   - `IncidentInterceptorService.createAutoClinicalAlert()` para alertas clínicos não-vitais
3. **Criação Dupla**:
   - **Notification** (broadcast temporária) → Enviada para todos os usuários
   - **VitalSignAlert** (registro médico permanente) → Criado com metadata estruturada
4. **Tomada de decisão clínica (Admin/RT)**:
   - confirmar intercorrência (gera `DailyRecord` de `INTERCORRENCIA` vinculado)
   - ou descartar intercorrência (mantém rastreabilidade do alerta)
   - na confirmação, o subtipo/indicador pode ser derivado da metadata (ex.: `DESIDRATACAO` em alerta de diarreia com contexto de desidratação)
5. **Linking Bidirecional**: `notification.id` → `alert.notificationId` e vice-versa
6. **Cálculo de Prioridade**: Automático baseado em severidade + tipo
7. **Status Inicial**: ACTIVE (aguardando conduta)

## Exemplo de Metadata

```json
{
  "threshold": "≥160 mmHg",
  "expectedRange": "90-140 mmHg",
  "detectedAt": "2026-01-02T20:15:00.000Z",
  "systolic": 175,
  "diastolic": 98
}
```

## Pré-preenchimento de Evoluções (Smart Prefill)

O método `ClinicalNotesService.prefillFromAlert()` gera automaticamente:

### Objective (O) - Dados Objetivos
```
Sinais vitais aferidos em 02/01/2026 20:15:00:
PA: 175/98 mmHg
FC: 88 bpm
Tax: 36.5°C
SpO₂: 97%

Alerta: Pressão Arterial Crítica
Pressão arterial sistólica crítica: 175/98 mmHg. Valores normais: 90-140 mmHg.
```

### Assessment (A) - Avaliação
```
Pressão Arterial Crítica - Severidade: CRITICAL

Hipertensão arterial detectada. Avaliar sinais de cefaleia, tontura, visão turva.
```

### Tags Sugeridas
- Sinais Vitais Anormais
- Urgente (se CRITICAL)
- Cardiovascular (se PRESSURE)
- Diabetes (se GLUCOSE)
- Infecção (se TEMPERATURE)
- Respiratório (se OXYGEN)

## Cálculo de Prioridade

```typescript
// Severidade CRITICAL
if (severity === 'CRITICAL') {
  if (type === 'GLUCOSE_LOW' || type === 'OXYGEN_LOW') return 5  // Mais urgente
  return 4  // Outras críticas
}

// Severidade WARNING
if (severity === 'WARNING') return 2

// Severidade INFO
return 1
```

**Ordenação**: `ORDER BY priority DESC, createdAt DESC`

## Permissões e Autorização

- **Visualizar alertas**: Todos os profissionais autenticados
- **Atualizar alertas**: Profissionais com permissão `UPDATE_VITAL_SIGNS` ou similares
- **Criar evolução**: Validado por `professional-authorization.config.ts` (MEDICAL, NURSING, etc.)
- **Resolver alertas**: Profissionais que podem atualizar + campo `resolvedBy` rastreado

## Índices de Performance

```sql
-- Buscar alertas de um residente por status
CREATE INDEX idx_alerts_tenant_resident ON vital_sign_alerts(tenantId, residentId);
CREATE INDEX idx_alerts_tenant_status ON vital_sign_alerts(tenantId, status);

-- Buscar alertas por data (listagem)
CREATE INDEX idx_alerts_created_desc ON vital_sign_alerts(tenantId, createdAt DESC);

-- Buscar por atribuição
CREATE INDEX idx_alerts_assigned ON vital_sign_alerts(assignedTo);

-- Linking reverso
CREATE INDEX idx_alerts_vital_sign ON vital_sign_alerts(vitalSignId);
CREATE INDEX idx_alerts_notification ON vital_sign_alerts(notificationId);
CREATE INDEX idx_clinical_notes_alert ON clinical_notes(vitalSignAlertId);
```

## Diferenças: Notifications vs Alerts

| Característica | Notifications | VitalSignAlerts |
|---|---|---|
| **Propósito** | Broadcast temporário | Registro médico permanente |
| **Persistência** | Pode expirar (`expiresAt`) | Permanente (soft-delete futuro) |
| **Rastreamento** | `NotificationRead` (N:N) | Status, atribuição, condutas |
| **Documentação** | Não aplicável | `medicalNotes`, `actionTaken` |
| **Evolução Clínica** | Não vinculado | 1:N com `ClinicalNote` |
| **Prioridade** | Severidade fixa | Cálculo automático 0-5 |
| **Auditoria** | Básica | Completa (criado, resolvido, por quem) |

## Casos de Uso

### 1. Fluxo de Conduta Médica

```
1. Sistema detecta PA 175/98 mmHg
2. Cria alerta CRITICAL + notificação
3. Médico vê notificação no dropdown
4. Abre modal de alertas do residente
5. Clica "Gerenciar" no alerta
6. Atribui para si mesmo + muda status para IN_TREATMENT
7. Adiciona nota: "Solicitado verificação em 30min"
8. Clica "Criar Evolução Médica"
9. Campos Objective e Assessment pré-preenchidos
10. Completa Subjective e Plan
11. Salva evolução com vitalSignAlertId linkado
12. Alerta automaticamente vai para IN_TREATMENT
```

### 2. Monitoramento Contínuo

```
1. Residente diabético com múltiplos alertas de glicemia
2. Enfermeira filtra alertas por residentId + status ACTIVE
3. Vê histórico de 3 alertas de GLUCOSE_HIGH nos últimos 2 dias
4. Cria evolução de enfermagem documentando padrão
5. Muda status para MONITORING
6. Médico revisa e ajusta prescrição de insulina
7. Resolve alertas após estabilização
```

### 3. Auditoria e Relatórios

```sql
-- Alertas críticos não resolvidos > 2 horas
SELECT * FROM vital_sign_alerts
WHERE severity = 'CRITICAL'
  AND status = 'ACTIVE'
  AND createdAt < NOW() - INTERVAL '2 hours';

-- Taxa de resolução por profissional
SELECT resolvedBy, COUNT(*) as resolved_count
FROM vital_sign_alerts
WHERE resolvedAt IS NOT NULL
GROUP BY resolvedBy;
```

## Desenvolvimento Futuro

### Fase 2 (Frontend)
- [ ] Atualizar `VitalSignsAlerts.tsx` para consumir API real
- [ ] Implementar `ManageAlertDialog` com formulário completo
- [ ] Implementar `CreateEvolutionFromAlertDialog` com prefill
- [ ] Dashboard de alertas na página inicial
- [ ] Filtros avançados e exportação

### Fase 3 (Melhorias)
- [ ] Webhooks para alertas CRITICAL
- [ ] Notificações push mobile
- [ ] Escalação automática (se não resolvido em X horas)
- [ ] Machine learning para predição de alertas
- [ ] Integração com prontuário eletrônico (HL7/FHIR)

## Testes

### Backend (Manual via curl/Postman)
```bash
# Estatísticas
curl http://localhost:3000/vital-sign-alerts/stats \
  -H "Authorization: Bearer $TOKEN"

# Listar alertas
curl http://localhost:3000/vital-sign-alerts?status=ACTIVE \
  -H "Authorization: Bearer $TOKEN"

# Pré-preencher evolução
curl http://localhost:3000/clinical-notes/prefill-from-alert/{alertId} \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend (React Query DevTools)
- Verificar cache de queries
- Testar invalidação após mutations
- Monitorar refetch intervals

## Referências

- [CHANGELOG - 2026-01-02](../../CHANGELOG.md)
- [Prisma Schema - vital-signs-alerts.prisma](../../apps/backend/prisma/schema/vital-signs-alerts.prisma)
- [VitalSignAlertsService](../../apps/backend/src/vital-sign-alerts/vital-sign-alerts.service.ts)
- [Clinical Notes Integration](../../apps/backend/src/clinical-notes/clinical-notes.service.ts#L705-L809)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Data de Implementação:** 02/01/2026
