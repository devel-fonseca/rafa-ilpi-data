# Bugs Backend - Rafa ILPI Data

## 1. getCriticalAlerts retorna apenas contagens, não detalhes de prescrições

**Data de Identificação**: 22 de novembro de 2025
**Status**: Pendente de correção
**Severidade**: Alta
**Afetado**: Dashboard de Prescrições

### Problema

A função `getCriticalAlerts()` no arquivo `apps/backend/src/prescriptions/prescriptions.service.ts` (linha 446) retorna apenas alertas agregados com contagens, não os detalhes individuais das prescrições:

```json
{
  "type": "expired",
  "message": "Residentes com prescrição vencida (1)",
  "count": 1,
  "severity": "high"
}
```

### Impacto

O componente frontend `CriticalAlerts.tsx` espera receber um array de alertas com `prescriptionId` para cada alerta, permitindo que o usuário clique no botão "Ver" e navegue para os detalhes da prescrição.

Como o `prescriptionId` não é retornado, a URL fica `dashboard/prescricoes/undefined`, resultando em erro "Prescrição não encontrada".

### Solução Necessária

Modificar a função `getCriticalAlerts()` para retornar detalhes completos de cada prescrição com alerta, incluindo:
- `prescriptionId`
- `residentName`
- `doctorName`
- `message`
- `type`
- `severity`
- `daysUntilExpiry`

Exemplo de retorno esperado:

```json
[
  {
    "prescriptionId": "8b7ef825-4c4b-4b00-a3a4-f846f79856c9",
    "residentName": "Nome do Residente",
    "doctorName": "Dr. Fernando Silva",
    "message": "Prescrição vencida",
    "type": "EXPIRED",
    "severity": "CRITICAL",
    "daysUntilExpiry": -7
  }
]
```

### Arquivos Afetados

- `apps/backend/src/prescriptions/prescriptions.service.ts` - método `getCriticalAlerts()`
- `apps/frontend/src/pages/prescriptions/components/CriticalAlerts.tsx` - componente que consome a API
- `apps/frontend/src/api/prescriptions.api.ts` - type `CriticalAlert`

