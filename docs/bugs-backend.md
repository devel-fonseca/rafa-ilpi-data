# Bugs Backend - Rafa ILPI Data

## 1. getCriticalAlerts retorna apenas contagens, não detalhes de prescrições ✅ RESOLVIDO

**Data de Identificação**: 22 de novembro de 2025
**Data de Resolução**: 24 de novembro de 2025
**Status**: Resolvido
**Severidade**: Alta
**Afetado**: Dashboard de Prescrições

### Problema

A função `getCriticalAlerts()` no arquivo `apps/backend/src/prescriptions/prescriptions.service.ts` (linha 446) retornava apenas alertas agregados com contagens, não os detalhes individuais das prescrições:

```json
{
  "type": "expired",
  "message": "Residentes com prescrição vencida (1)",
  "count": 1,
  "severity": "high"
}
```

### Impacto

O componente frontend `CriticalAlerts.tsx` esperava receber um array de alertas com `prescriptionId` para cada alerta, permitindo que o usuário clique no botão "Ver" e navegue para os detalhes da prescrição.

Como o `prescriptionId` não era retornado, a URL ficava `dashboard/prescricoes/undefined`, resultando em erro "Prescrição não encontrada".

### Solução Implementada

A função `getCriticalAlerts()` foi completamente refatorada para retornar detalhes completos de cada prescrição com alerta:

#### Backend Changes (prescriptions.service.ts)

1. **Substituição de `.count()` por `.findMany()`**: Todas as três consultas (prescrições vencidas, controlados sem receita, antibióticos sem validade) agora usam `.findMany()` para obter dados completos

2. **Inclusão de relacionamento com resident**: Adicionado `include: { resident: { select: { id, fullName } } }` para obter o nome do residente

3. **Criação de objetos de alerta detalhados**: Para cada prescrição encontrada, um objeto completo é criado com:
   - `prescriptionId`
   - `residentName` (do relacionamento)
   - `doctorName`
   - `message` (customizada para cada tipo)
   - `type` (EXPIRED, MISSING_RECEIPT, MISSING_VALIDITY)
   - `severity` (CRITICAL ou WARNING)
   - `daysUntilExpiry` (calculado para prescrições vencidas)

4. **Ordenação por severidade**: Alertas são ordenados com CRITICAL primeiro, depois WARNING

#### Frontend Changes (prescriptions.api.ts)

Interface `CriticalAlert` atualizada de:

```typescript
export interface CriticalAlert {
  type: string
  message: string
  count: number
  severity: 'high' | 'medium' | 'low'
}
```

Para:

```typescript
export interface CriticalAlert {
  prescriptionId: string
  residentName: string
  doctorName: string
  message: string
  type: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  daysUntilExpiry?: number
}
```

### Resultado

Agora o endpoint retorna alertas completos, permitindo navegação funcional no componente `CriticalAlerts.tsx`:

```json
[
  {
    "prescriptionId": "8b7ef825-4c4b-4b00-a3a4-f846f79856c9",
    "residentName": "Nome do Residente",
    "doctorName": "Dr. Fernando Silva",
    "message": "Prescrição vencida há 7 dias",
    "type": "EXPIRED",
    "severity": "CRITICAL",
    "daysUntilExpiry": -7
  }
]
```

### Arquivos Modificados

- [apps/backend/src/prescriptions/prescriptions.service.ts](apps/backend/src/prescriptions/prescriptions.service.ts) - método `getCriticalAlerts()` completamente refatorado
- [apps/frontend/src/api/prescriptions.api.ts](apps/frontend/src/api/prescriptions.api.ts) - interface `CriticalAlert` atualizada

