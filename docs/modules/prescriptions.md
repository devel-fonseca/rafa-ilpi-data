# Módulo: Prescrições Médicas

**Status:** ✅ Implementado
**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

Sistema completo de gerenciamento de prescrições médicas com suporte a múltiplos medicamentos (contínuos e SOS), administração com dupla checagem, calendário de administrações, dashboard de alertas e conformidade com portarias para medicamentos controlados.

## Funcionalidades Principais

- ✅ **6 tipos de prescrição**: ROTINA, ALTERACAO_PONTUAL, ANTIBIOTICO, ALTO_RISCO, CONTROLADO, OUTRO
- ✅ **Múltiplos medicamentos**: Contínuos (horários fixos) + SOS (se necessário)
- ✅ **Dashboard completo**: Estatísticas, alertas críticos, ações do dia
- ✅ **Calendário de administrações**: Navegação por data com filtros
- ✅ **Dupla checagem**: Para medicamentos de alto risco
- ✅ **Medicamentos controlados**: Validação de receita, notificação, classe
- ✅ **Administração de SOS**: Validação de intervalo mínimo e limite diário
- ✅ **Alertas automáticos**: Prescrições vencidas, sem receita, antibióticos

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/prescriptions/prescriptions.controller.ts](../../apps/backend/src/prescriptions/prescriptions.controller.ts)
- **Service:** [apps/backend/src/prescriptions/prescriptions.service.ts](../../apps/backend/src/prescriptions/prescriptions.service.ts) (1.390 linhas)
- **Module:** [apps/backend/src/prescriptions/prescriptions.module.ts](../../apps/backend/src/prescriptions/prescriptions.module.ts)
- **DTOs:** [apps/backend/src/prescriptions/dto/](../../apps/backend/src/prescriptions/dto/)
- **Schema:** [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma)

### Frontend
- **Dashboard:** [apps/frontend/src/pages/prescriptions/PrescriptionsPage.tsx](../../apps/frontend/src/pages/prescriptions/PrescriptionsPage.tsx)
- **Lista:** [apps/frontend/src/pages/prescriptions/PrescriptionsList.tsx](../../apps/frontend/src/pages/prescriptions/PrescriptionsList.tsx)
- **Formulário:** [apps/frontend/src/pages/prescriptions/PrescriptionForm.tsx](../../apps/frontend/src/pages/prescriptions/PrescriptionForm.tsx) (multi-step)
- **Detalhes:** [apps/frontend/src/pages/prescriptions/PrescriptionDetails.tsx](../../apps/frontend/src/pages/prescriptions/PrescriptionDetails.tsx)
- **API:** [apps/frontend/src/api/prescriptions.api.ts](../../apps/frontend/src/api/prescriptions.api.ts)

## Modelos de Dados

### Prescription (Prescrição)

```prisma
model Prescription {
  id         String           @id @default(uuid()) @db.Uuid
  tenantId   String           @db.Uuid
  residentId String           @db.Uuid

  // Dados do Prescritor
  doctorName       String
  doctorCrm        String
  doctorCrmState   String // UF
  prescriptionDate DateTime @db.Timestamptz(3)
  prescriptionType PrescriptionType
  validUntil       DateTime? @db.Timestamptz(3)
  reviewDate       DateTime? @db.Timestamptz(3)

  // Campos específicos para CONTROLADO
  controlledClass    ControlledClass?
  notificationNumber String?
  notificationType   NotificationType?

  // Anexos e Status
  prescriptionImageUrl String?
  notes                String? @db.Text
  isActive             Boolean @default(true)

  // Relações
  medications         Medication[]
  sosMedications      SOSMedication[]
  administrations     MedicationAdministration[]
  sosAdministrations  SOSAdministration[]
}
```

### Medication (Medicamento Contínuo)

```prisma
model Medication {
  id             String @id
  prescriptionId String @db.Uuid

  name           String
  presentation   MedicationPresentation
  concentration  String
  dose           String
  route          AdministrationRoute
  frequency      MedicationFrequency
  scheduledTimes Json @default("[]") // ["06:00", "14:00", "22:00"]

  startDate DateTime  @db.Timestamptz(3)
  endDate   DateTime? @db.Timestamptz(3)

  isControlled        Boolean @default(false)
  isHighRisk          Boolean @default(false)
  requiresDoubleCheck Boolean @default(false)
  instructions        String? @db.Text

  administrations MedicationAdministration[]
}
```

### SOSMedication (Medicação Se Necessário)

```prisma
model SOSMedication {
  id             String @id
  prescriptionId String @db.Uuid

  name           String
  presentation   MedicationPresentation
  concentration  String
  dose           String
  route          AdministrationRoute

  indication        SOSIndicationType
  indicationDetails String?
  minInterval       String // "6 horas"
  maxDailyDoses     Int    // 3

  startDate DateTime  @db.Timestamptz(3)
  endDate   DateTime? @db.Timestamptz(3)
  instructions String? @db.Text

  sosAdministrations SOSAdministration[]
}
```

### MedicationAdministration (Administração)

```prisma
model MedicationAdministration {
  id             String @id
  medicationId   String @db.Uuid
  residentId     String @db.Uuid

  date          DateTime @db.Timestamptz(3)
  scheduledTime String // "06:00"
  actualTime    String? // "06:15"

  wasAdministered Boolean @default(false)
  reason          String? // Motivo de não administração

  administeredBy  String
  userId          String @db.Uuid
  checkedBy       String? // Dupla checagem
  checkedByUserId String? @db.Uuid
  notes           String? @db.Text
}
```

### Enums Importantes

```prisma
enum PrescriptionType {
  ROTINA
  ALTERACAO_PONTUAL
  ANTIBIOTICO
  ALTO_RISCO
  CONTROLADO
  OUTRO
}

enum AdministrationRoute {
  VO IM EV SC TOPICA SL RETAL OCULAR NASAL INALATORIA OUTRA
}

enum MedicationPresentation {
  COMPRIMIDO CAPSULA AMPOLA GOTAS SOLUCAO SUSPENSAO
  POMADA CREME SPRAY INALADOR ADESIVO SUPOSITORIO OUTRO
}

enum ControlledClass {
  BZD PSICOFARMACO OPIOIDE ANTICONVULSIVANTE OUTRO
}

enum MedicationFrequency {
  UMA_VEZ_DIA DUAS_VEZES_DIA SEIS_SEIS_H
  OITO_OITO_H DOZE_DOZE_H PERSONALIZADO
}

enum SOSIndicationType {
  DOR FEBRE ANSIEDADE AGITACAO NAUSEA INSONIA OUTRO
}
```

## Endpoints da API

### CRUD Básico

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/api/prescriptions` | CREATE_PRESCRIPTIONS | Criar prescrição |
| GET | `/api/prescriptions` | - | Listar com filtros |
| GET | `/api/prescriptions/:id` | - | Buscar por ID |
| PATCH | `/api/prescriptions/:id` | Roles: admin/user | Atualizar |
| DELETE | `/api/prescriptions/:id` | Roles: admin | Soft delete |

### Dashboard e Estatísticas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/prescriptions/stats/dashboard` | Estatísticas gerais |
| GET | `/api/prescriptions/alerts/critical` | Alertas críticos |
| GET | `/api/prescriptions/expiring/list?days=5` | Prescrições vencendo |
| GET | `/api/prescriptions/controlled/residents` | Residentes com controlados |
| GET | `/api/prescriptions/review-needed/list?days=30` | Prescrições para revisão |

### Administração

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/prescriptions/administer` | Registrar administração contínua |
| POST | `/api/prescriptions/administer-sos` | Registrar administração SOS |
| GET | `/api/prescriptions/medication-administrations/resident/:residentId/dates` | Datas com administrações (calendário) |
| GET | `/api/prescriptions/medication-administrations/resident/:residentId/date/:date` | Administrações de uma data |

## Regras de Negócio

### Validação por Tipo de Prescrição

**CONTROLADO** (Portaria SVS/MS nº 344/1998):
- ✅ Obrigatório: `validUntil`, `prescriptionImageUrl`, `notificationNumber`, `notificationType`, `controlledClass`
- ✅ Validade máxima: conforme tipo de receita (Amarela 30 dias, Azul 30 dias, Branca Especial 30 dias)
- ✅ Upload de receita médica obrigatório

**ANTIBIOTICO** (RDC 20/2011 ANVISA):
- ✅ Obrigatório: `validUntil`
- ✅ Receita de controle especial em 2 vias

**ALTO_RISCO**:
- ✅ Medicamentos requerem dupla checagem
- ✅ Flags: `isHighRisk`, `requiresDoubleCheck`

### Administração de Medicamentos

**Contínuos:**
- ✅ Validação de horários (formato HH:mm)
- ✅ Registro de horário programado vs. horário real
- ✅ Motivo obrigatório se não administrado
- ✅ Dupla checagem para medicamentos que requerem

**SOS (Se Necessário):**
- ✅ Validação de limite diário (`maxDailyDoses`)
- ✅ Validação de intervalo mínimo entre doses
- ✅ Contagem de administrações do dia
- ✅ Indicação obrigatória (motivo da administração)

### Alertas Automáticos

| Tipo | Severidade | Condição |
|------|------------|----------|
| Prescrição vencida | CRITICAL | `validUntil` < hoje |
| Prescrição vencendo | WARNING | `validUntil` em 5 dias |
| Controlado sem receita | CRITICAL | `type=CONTROLADO` AND `prescriptionImageUrl=null` |
| Antibiótico sem validade | WARNING | `type=ANTIBIOTICO` AND `validUntil=null` |

## Frontend - Componentes

### PrescriptionsPage (Dashboard)

**Seções:**
- **Stats Cards**: Total ativo, vencendo em 5 dias, antibióticos, controlados
- **Alertas Críticos**: Lista com severidade e ações
- **Ações do Dia**: Medicamentos por turno (manhã/tarde/noite)
- **Vencendo em 5 dias**: Lista de prescrições próximas do vencimento
- **Residentes com Controlados**: Lista com medicamentos controlados

### PrescriptionForm (Multi-Step)

**5 Steps:**
1. **Residente**: Seleção do residente com busca
2. **Prescritor**: Dados do médico, tipo de prescrição, datas
3. **Medicamentos Contínuos**: Lista de medicamentos com horários fixos
4. **Medicações SOS**: Lista de medicações se necessário
5. **Revisão**: Preview completo antes de salvar

**Validações:**
- ✅ Campos obrigatórios por tipo (CONTROLADO/ANTIBIOTICO)
- ✅ Formato de horários HH:mm
- ✅ Pelo menos 1 medicamento (contínuo OU SOS)
- ✅ Upload de receita para CONTROLADO

### PrescriptionDetails (Calendário)

**Funcionalidades:**
- ✅ Navegação por data (anterior/próximo/hoje)
- ✅ 2 tabs: Medicamentos Contínuos | Medicações SOS
- ✅ Filtros: status (todos, pendentes, administrados), ordenação
- ✅ Cards expandidos por horário programado
- ✅ Modais: Administrar, Visualizar Administração
- ✅ Indicadores visuais: verde (administrado), vermelho (não administrado), cinza (pendente)

## Tratamento de Timezone

O sistema implementa tratamento robusto de timezone usando `date-fns`:

**Backend:**
```typescript
parseISO()        // Conversão de YYYY-MM-DD
startOfDay()      // Início do dia
endOfDay()        // Fim do dia
addDays()         // Manipulação segura
```

**Frontend:**
```typescript
getCurrentDate()         // Data atual no formato local
formatDateOnlySafe()     // Formatação sem timezone shift
extractDateOnly()        // Extração segura de data
```

**Estratégia:** Datas convertidas para meio-dia (T12:00:00.000) para evitar bugs de timezone.

## Integração com Prontuário

**Tab "Prescrições" no ResidentMedicalRecord:**
- ✅ Lista de prescrições ativas
- ✅ Dados do prescritor (médico, CRM, UF)
- ✅ Medicamentos contínuos e SOS
- ✅ Datas de validade e revisão
- ✅ Receita médica anexada (se houver)

## Referências

- [CHANGELOG - 2025-10-25](../../CHANGELOG.md#2025-10-25---módulo-de-prescrições-médicas)
- [Módulo de Residentes](residents.md) - Integração com prontuário
- [Módulo de Registros Diários](daily-records.md) - Integração com MONITORAMENTO
- Portaria SVS/MS nº 344/1998 (Medicamentos Controlados)
- RDC 20/2011 ANVISA (Antibióticos)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
