# Módulo: Indicadores Mensais RDC 502/2021

**Status:** ✅ Implementado  
**Última atualização:** 22/02/2026  
**Diretório:** `apps/backend/src/rdc-indicators`

## Visão Geral

Módulo responsável pelo ciclo mensal dos indicadores obrigatórios da RDC 502/2021 (Arts. 58, 59, 60 e Anexo), incluindo:

- cálculo mensal dos 6 indicadores;
- revisão de casos candidatos (confirmar/descartar);
- inclusão manual de caso confirmado tardiamente;
- fechamento e reabertura de mês para auditoria;
- consolidado anual para envio à Vigilância Sanitária.

## Indicadores Cobertos

Ordem fixa (`RDC_INDICATOR_ORDER`):

1. `MORTALIDADE`
2. `DIARREIA_AGUDA`
3. `ESCABIOSE`
4. `DESIDRATACAO`
5. `ULCERA_DECUBITO`
6. `DESNUTRICAO`

## Regras de Cálculo

### Denominador (população exposta)

- Regra do Anexo da RDC: residentes do dia 15 do mês.
- Implementação: `getPopulationOnReferenceDate()`.
- Critério:
  - `admissionDate <= data de referência`;
  - `dischargeDate IS NULL` ou `dischargeDate >= data de referência`;
  - `deletedAt IS NULL`.

### Numerador

- Mortalidade: número de casos (não deduplica por residente).
- Demais indicadores: número de residentes únicos no período.

### Janela mensal

- Período: `YYYY-MM-01` até último dia do mês.
- Armazenamento/cálculo com padrão date-only em `@db.Date`, usando conversão segura para meio-dia (`T12:00:00.000`) para evitar drift de timezone.

## Fluxo Operacional

1. **Calcular** (`POST /rdc-indicators/calculate`)
   - gera/atualiza `incident_monthly_indicators`.
2. **Revisar casos** (`GET/POST /rdc-indicators/review-cases`)
   - decisões: `CONFIRMED`, `DISCARDED`, `PENDING`.
   - descarte exige motivo (>= 5 caracteres).
3. **Fechar mês** (`POST /rdc-indicators/close-month`)
   - só permite fechar sem pendências.
4. **Reabrir mês** (`POST /rdc-indicators/reopen-month`)
   - exige motivo de auditoria.
5. **Consolidado anual** (`GET /rdc-indicators/annual-consolidated`)
   - referência padrão: ano anterior.

## Inclusão Manual de Caso (RT/Admin)

Endpoint: `POST /rdc-indicators/manual-case`

Objetivo: registrar caso confirmado depois do evento original, sem perder o fechamento mensal da métrica.

Comportamento:

- cria `DailyRecord` do tipo `INTERCORRENCIA` com:
  - subtype clínico compatível com o indicador;
  - `rdcIndicators` preenchido;
  - `data.origem = "RDC_MANUAL_CASE"`;
- recalcula o mês;
- confirma automaticamente o caso na revisão (`CONFIRMED`).

Bloqueio:

- se mês fechado, rejeita inclusão manual até reabertura.

## Modelo de Dados

### `IncidentMonthlyIndicator`

Campos operacionais usados no ciclo:

- `year`, `month`, `indicatorType`
- `denominator`, `numerator`, `rate`
- `provisionalNumerator`
- `totalCandidates`, `pendingCount`, `confirmedCount`, `discardedCount`
- `incidentIds`
- `populationReferenceDate`
- `periodStatus` (`OPEN`/`CLOSED`)
- `periodClosedAt`, `periodClosedBy`, `periodClosedByName`, `periodCloseNote`
- `metadata`

### `IncidentMonthlyIndicatorReview`

Registro de decisão por candidato:

- `indicatorId`, `incidentId`
- `decision`
- `reason`
- `decidedAt`, `decidedBy`, `decidedByName`

## Endpoints HTTP

Base: `/rdc-indicators`

- `GET /` - indicadores do mês
- `GET /history` - histórico mensal
- `POST /calculate` - recálculo manual
- `GET /review-cases` - listar candidatos de um indicador
- `POST /review-cases` - salvar decisões
- `POST /manual-case` - inclusão manual + confirmação
- `POST /close-month` - fechamento do mês
- `POST /reopen-month` - reabertura do mês
- `GET /annual-consolidated` - consolidado anual

## Segurança e Permissões

- Guardas: `JwtAuthGuard`, `PermissionsGuard`, `FeatureGuard`
- Feature flag: `indicadores_mensais`
- Permissão: `VIEW_COMPLIANCE_DASHBOARD`
- Perfil de uso esperado: Admin e Responsável Técnico.

## Regras de Integridade

- mês fechado bloqueia:
  - recálculo;
  - revisão de casos;
  - inclusão manual.
- fechamento bloqueado enquanto houver `pendingCount > 0`.
- revisão só aceita `incidentId` existente em `incidentIds` do indicador.

## Integrações

- `daily-records`: origem dos casos `INTERCORRENCIA` com subtype clínico.
- `compliance dashboard` (frontend): consumo dos endpoints para operação mensal.
- `audit`: rastreabilidade de fechamento/reabertura/decisão.

## Referências de Código

- `apps/backend/src/rdc-indicators/rdc-indicators.controller.ts`
- `apps/backend/src/rdc-indicators/rdc-indicators.service.ts`
- `apps/backend/src/rdc-indicators/rdc-indicators-cron.service.ts`
- `apps/backend/src/rdc-indicators/dto/create-manual-rdc-case.dto.ts`
- `apps/backend/src/rdc-indicators/dto/review-indicator-cases.dto.ts`
