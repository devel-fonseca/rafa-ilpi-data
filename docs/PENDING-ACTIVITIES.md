# Atividades Pendentes - Dashboard

## 📋 Visão Geral

O componente **PendingActivities** exibe tarefas e alertas pendentes no Dashboard, lado a lado com as Atividades Recentes.

**Status**: 🚧 Placeholder com dados mockados (aguardando implementação do backend)

---

## 🎨 Interface Atual

### Localização
- **Frontend**: [`apps/frontend/src/components/dashboard/PendingActivities.tsx`](../apps/frontend/src/components/dashboard/PendingActivities.tsx)
- **Uso**: [`apps/frontend/src/pages/Dashboard.tsx`](../apps/frontend/src/pages/Dashboard.tsx:179-182)

### Layout
- Grid responsivo 2 colunas no desktop (`lg:grid-cols-2`)
- Empilhamento vertical no mobile
- Mesmo estilo visual das Atividades Recentes

---

## 📊 Tipos de Atividades Pendentes

### 1. **Prescrições Expirando** 🔴 HIGH
```typescript
{
  type: 'PRESCRIPTION_EXPIRING',
  title: 'Prescrição expirando em breve',
  description: 'Losartana 50mg - Residente: Maria Silva',
  priority: 'HIGH',
  dueDate: '2025-12-08T12:00:00.000Z'
}
```

### 2. **Registros Diários Faltando** 🟡 MEDIUM
```typescript
{
  type: 'DAILY_RECORD_MISSING',
  title: 'Registros diários pendentes',
  description: '3 residentes sem registro de alimentação hoje',
  priority: 'MEDIUM'
}
```

### 3. **Sinais Vitais Atrasados** 🟡 MEDIUM
```typescript
{
  type: 'VITAL_SIGNS_DUE',
  title: 'Sinais vitais atrasados',
  description: 'Pressão arterial - João Santos',
  priority: 'MEDIUM',
  dueDate: '2025-12-08T10:00:00.000Z'
}
```

### 4. **Notificações Não Lidas** 🔵 LOW
```typescript
{
  type: 'NOTIFICATION_UNREAD',
  title: '5 notificações não lidas',
  description: 'Atualizações do sistema e lembretes',
  priority: 'LOW'
}
```

---

## 🔌 Endpoint Backend (A Implementar)

### GET `/api/dashboard/pending-activities`

**Response:**
```typescript
interface PendingItem {
  id: string
  type: 'PRESCRIPTION_EXPIRING' | 'DAILY_RECORD_MISSING' | 'NOTIFICATION_UNREAD' | 'VITAL_SIGNS_DUE'
  title: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  dueDate?: string // ISO 8601
  relatedEntity?: {
    id: string
    name: string
  }
}
```

**Exemplo:**
```json
[
  {
    "id": "pending-1",
    "type": "PRESCRIPTION_EXPIRING",
    "title": "Prescrição expirando em breve",
    "description": "Losartana 50mg - Residente: Maria Silva",
    "priority": "HIGH",
    "dueDate": "2025-12-10T12:00:00.000Z",
    "relatedEntity": {
      "id": "prescription-123",
      "name": "Maria Silva"
    }
  },
  {
    "id": "pending-2",
    "type": "DAILY_RECORD_MISSING",
    "title": "Registros diários pendentes",
    "description": "3 residentes sem registro de alimentação hoje",
    "priority": "MEDIUM",
    "relatedEntity": {
      "id": "residents-group",
      "name": "Diversos residentes"
    }
  }
]
```

---

## 🛠️ Implementação Backend Sugerida

### 1. Controller
```typescript
// apps/backend/src/dashboard/dashboard.controller.ts

@Get('pending-activities')
@UseGuards(JwtAuthGuard, TenantGuard)
async getPendingActivities(@TenantId() tenantId: string) {
  return this.dashboardService.getPendingActivities(tenantId)
}
```

### 2. Service - Lógica de Negócio
```typescript
// apps/backend/src/dashboard/dashboard.service.ts

async getPendingActivities(tenantId: string): Promise<PendingItem[]> {
  const pendingItems: PendingItem[] = []

  // 1. Prescrições expirando nos próximos 7 dias
  const expiringPrescriptions = await this.prisma.prescription.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      validUntil: {
        gte: new Date(),
        lte: addDays(new Date(), 7),
      },
    },
    include: {
      resident: { select: { id: true, fullName: true } },
    },
  })

  expiringPrescriptions.forEach((prescription) => {
    pendingItems.push({
      id: `prescription-expiring-${prescription.id}`,
      type: 'PRESCRIPTION_EXPIRING',
      title: 'Prescrição expirando em breve',
      description: `${prescription.resident.fullName}`,
      priority: 'HIGH',
      dueDate: prescription.validUntil.toISOString(),
      relatedEntity: {
        id: prescription.id,
        name: prescription.resident.fullName,
      },
    })
  })

  // 2. Registros diários faltando hoje
  const today = startOfDay(new Date())
  const endToday = endOfDay(new Date())

  const residentsWithoutRecords = await this.prisma.resident.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      dailyRecords: {
        none: {
          date: {
            gte: today,
            lte: endToday,
          },
          type: 'ALIMENTACAO',
        },
      },
    },
  })

  if (residentsWithoutRecords.length > 0) {
    pendingItems.push({
      id: 'daily-records-missing',
      type: 'DAILY_RECORD_MISSING',
      title: 'Registros diários pendentes',
      description: `${residentsWithoutRecords.length} residentes sem registro de alimentação hoje`,
      priority: 'MEDIUM',
    })
  }

  // 3. Sinais vitais atrasados
  // TODO: Implementar lógica de sinais vitais atrasados

  // 4. Notificações não lidas
  const unreadNotifications = await this.prisma.notification.count({
    where: {
      tenantId,
      read: false,
    },
  })

  if (unreadNotifications > 0) {
    pendingItems.push({
      id: 'notifications-unread',
      type: 'NOTIFICATION_UNREAD',
      title: `${unreadNotifications} notificações não lidas`,
      description: 'Atualizações do sistema e lembretes',
      priority: 'LOW',
    })
  }

  // Ordenar por prioridade (HIGH > MEDIUM > LOW) e data
  return pendingItems.sort((a, b) => {
    const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]

    if (priorityDiff !== 0) return priorityDiff

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }

    return 0
  })
}
```

---

## 🎯 Regras de Negócio

### Prioridades

| Prioridade | Cor | Casos de Uso |
|------------|-----|--------------|
| **HIGH** 🔴 | Vermelho | Prescrições expirando em ≤7 dias, Medicações atrasadas >2h |
| **MEDIUM** 🟡 | Amarelo | Registros diários faltando, Sinais vitais atrasados |
| **LOW** 🔵 | Azul | Notificações não lidas, Lembretes gerais |

### Critérios de Alerta

1. **Prescrições Expirando**: `validUntil` entre hoje e +7 dias
2. **Registros Diários**: Sem registro de `ALIMENTACAO` hoje
3. **Sinais Vitais**: Última medição >24h (para residentes com protocolo ativo)
4. **Notificações**: `read = false`

---

## 🔄 Atualização dos Dados

### Frontend
```typescript
// Query com cache e refetch automático
const { data: pendingItems } = useQuery({
  queryKey: ['pending-activities'],
  queryFn: async () => {
    const response = await api.get('/dashboard/pending-activities')
    return response.data
  },
  refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
})
```

### Backend
- Cache de 5 minutos (Redis ou memória)
- Invalidar cache ao:
  - Criar/atualizar prescrição
  - Criar registro diário
  - Marcar notificação como lida

---

## 📝 Tarefas Pendentes (Backend)

- [ ] Criar controller `DashboardController`
- [ ] Criar service `DashboardService`
- [ ] Implementar lógica de prescrições expirando
- [ ] Implementar lógica de registros diários faltando
- [ ] Implementar lógica de sinais vitais atrasados
- [ ] Implementar lógica de notificações não lidas
- [ ] Adicionar cache (Redis) com TTL de 5 minutos
- [ ] Adicionar testes unitários
- [ ] Documentar endpoint no Swagger

---

## 🧪 Dados de Teste (Mock Atual)

```typescript
const mockData: PendingItem[] = [
  {
    id: '1',
    type: 'PRESCRIPTION_EXPIRING',
    title: 'Prescrição expirando em breve',
    description: 'Losartana 50mg - Residente: Maria Silva',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'DAILY_RECORD_MISSING',
    title: 'Registros diários pendentes',
    description: '3 residentes sem registro de alimentação hoje',
    priority: 'MEDIUM',
  },
  {
    id: '3',
    type: 'VITAL_SIGNS_DUE',
    title: 'Sinais vitais atrasados',
    description: 'Pressão arterial - João Santos',
    priority: 'MEDIUM',
    dueDate: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'NOTIFICATION_UNREAD',
    title: '5 notificações não lidas',
    description: 'Atualizações do sistema e lembretes',
    priority: 'LOW',
  },
]
```

---

## 🎨 Melhorias Futuras

1. **Ações Rápidas**: Botões para resolver pendências diretamente do card
2. **Filtros**: Filtrar por tipo ou prioridade
3. **Notificações Push**: Alertar usuário quando surgirem novos itens HIGH
4. **Badges**: Contador de pendências no menu lateral
5. **Histórico**: Log de pendências resolvidas

---

**Última atualização**: 2025-12-08
**Status**: 🚧 Em desenvolvimento
**Responsável**: Backend Team
