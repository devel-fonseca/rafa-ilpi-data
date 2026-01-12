# Módulo: Sistema de Notificações

**Status:** ✅ Implementado e Refatorado
**Versão:** 2.0.0
**Última atualização:** 10/01/2026

---

## 📋 Visão Geral

Sistema completo e robusto de notificações multi-tenant com suporte a diferentes categorias, severidades e tipos de eventos. Inclui rastreamento individual de leitura por usuário, notificações em tempo real e configuração visual centralizada.

---

## 🎯 Funcionalidades

### Principais Features

- ✅ **10 categorias** de notificações (prescrições, sinais vitais, documentos, medicações, etc.)
- ✅ **4 severidades** com cores e ícones distintos (CRITICAL, WARNING, INFO, SUCCESS)
- ✅ **40+ tipos** de notificações sistêmicas predefinidas
- ✅ **Rastreamento individual** de leitura por usuário
- ✅ **Dropdown de notificações** no header com contador de não lidas
- ✅ **Página completa** com filtros avançados, busca e paginação
- ✅ **Configuração visual centralizada** com fallback automático
- ✅ **Integração com eventos do sistema** (eventos perdidos, alertas médicos, etc.)
- ✅ **Expiração automática** de notificações

---

## 🏗️ Arquitetura

### Backend

#### Modelos Prisma

**Notification** (`apps/backend/prisma/schema/notifications.prisma`)
```prisma
model Notification {
  id         String   @id @default(uuid())
  tenantId   String
  type       SystemNotificationType
  category   NotificationCategory
  severity   NotificationSeverity
  title      String   @db.VarChar(255)
  message    String   @db.Text
  actionUrl  String?  @db.Text
  entityType String?  @db.VarChar(50)
  entityId   String?
  metadata   Json?    @db.JsonB
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  reads      NotificationRead[]
}
```

**NotificationRead** - Rastreamento individual de leitura
```prisma
model NotificationRead {
  id             String   @id @default(uuid())
  notificationId String
  userId         String
  readAt         DateTime @default(now())

  @@unique([notificationId, userId])
}
```

#### Enums

**NotificationCategory** (`apps/backend/prisma/schema/enums.prisma`)
```prisma
enum NotificationCategory {
  PRESCRIPTION          // Prescrições médicas
  VITAL_SIGN           // Sinais vitais anormais
  DOCUMENT             // Documentos institucionais
  DAILY_RECORD         // Registros diários
  MEDICATION           // Administração de medicamentos
  POP                  // Procedimentos Operacionais Padrão
  SYSTEM               // Notificações do sistema
  SCHEDULED_EVENT      // Eventos agendados
  INSTITUTIONAL_EVENT  // Eventos institucionais
  INCIDENT             // Intercorrências e Eventos Sentinela
}
```

**NotificationSeverity**
```prisma
enum NotificationSeverity {
  CRITICAL  // Requer ação imediata (vermelho)
  WARNING   // Requer atenção (amarelo/laranja)
  INFO      // Informativo (azul)
  SUCCESS   // Sucesso (verde)
}
```

**SystemNotificationType** - 40+ tipos predefinidos:
- `PRESCRIPTION_EXPIRED`, `PRESCRIPTION_EXPIRING`
- `VITAL_SIGN_ABNORMAL_BP`, `VITAL_SIGN_ABNORMAL_GLUCOSE`
- `DOCUMENT_EXPIRED`, `DOCUMENT_EXPIRING`
- `MEDICATION_ADMINISTRATION_MISSED`, `MEDICATION_ADMINISTRATION_LATE`
- `SCHEDULED_EVENT_MISSED`, `SCHEDULED_EVENT_DUE`
- `INSTITUTIONAL_EVENT_CREATED`, `INSTITUTIONAL_EVENT_UPDATED`
- E muitos outros...

### Frontend

#### Estrutura de Arquivos

```
apps/frontend/src/
├── api/
│   └── notifications.api.ts              # API client e tipos TypeScript
├── components/
│   └── notifications/
│       └── NotificationsDropdown.tsx     # Dropdown no header
├── config/
│   └── notifications.config.tsx          # ⭐ Configuração centralizada
├── hooks/
│   └── useNotifications.ts               # React Query hooks
└── pages/
    └── notifications/
        └── NotificationsPage.tsx         # Página completa de notificações
```

#### Configuração Centralizada

**`apps/frontend/src/config/notifications.config.tsx`** - Single Source of Truth

```tsx
export const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  [NotificationCategory.PRESCRIPTION]: {
    label: 'Prescrições',
    icon: Pill,
  },
  [NotificationCategory.INCIDENT]: {
    label: 'Intercorrências',
    icon: AlertTriangle,
  },
  // ... todas as categorias
}

// Helpers com fallback automático
export function getCategoryConfig(category: NotificationCategory): CategoryConfig
export function getSeverityIcon(severity: NotificationSeverity): LucideIcon
export function getSeverityLabel(severity: NotificationSeverity): string
```

**Vantagens:**
- ✅ Zero duplicação de código
- ✅ Consistência visual garantida
- ✅ Fallback automático para categorias desconhecidas
- ✅ Type-safe com TypeScript
- ✅ Fácil manutenção

---

## 🎨 Componentes

### NotificationsDropdown

**Localização:** `apps/frontend/src/components/notifications/NotificationsDropdown.tsx`

**Funcionalidades:**
- Badge com contador de não lidas
- Tabs para filtrar por categoria (Todas, Prescrições, Sinais Vitais, Documentos)
- Marcar todas como lidas
- Navegação para página completa
- Integração com MissedEventActionsModal para eventos perdidos

**Exemplo de Uso:**
```tsx
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'

function Header() {
  return (
    <header>
      {/* ... */}
      <NotificationsDropdown />
    </header>
  )
}
```

### NotificationsPage

**Localização:** `apps/frontend/src/pages/notifications/NotificationsPage.tsx`

**Funcionalidades:**
- Busca por texto
- Filtros por categoria e severidade
- Toggle "Apenas não lidas"
- Paginação (20 por página)
- Ações individuais (marcar como lida, deletar)
- Marcar todas como lidas
- Integração com MissedEventActionsModal

**Rota:** `/dashboard/notificacoes`

---

## 🔧 API e Hooks

### React Query Hooks

**`apps/frontend/src/hooks/useNotifications.ts`**

```tsx
// Buscar notificações com filtros
const { data, isLoading } = useNotifications({
  page: 1,
  limit: 20,
  category: NotificationCategory.PRESCRIPTION,
  severity: NotificationSeverity.WARNING,
  read: false,
  search: 'prescrição'
})

// Contador de não lidas
const { data: unreadCount } = useUnreadCount()

// Marcar como lida
const markAsReadMutation = useMarkAsRead()
markAsReadMutation.mutate(notificationId)

// Marcar todas como lidas
const markAllMutation = useMarkAllAsRead()
markAllMutation.mutate()

// Deletar notificação
const deleteMutation = useDeleteNotification()
deleteMutation.mutate(notificationId)
```

### Endpoints Backend

```
GET    /api/notifications              # Listar com filtros
GET    /api/notifications/unread/count # Contador
POST   /api/notifications/:id/read     # Marcar como lida
POST   /api/notifications/read-all     # Marcar todas como lidas
DELETE /api/notifications/:id          # Deletar
POST   /api/notifications              # Criar (uso interno)
```

---

## 📊 Fluxo de Dados

### Criação de Notificação

1. **Evento dispara** no sistema (ex: prescrição expirando)
2. **Service cria notificação** usando `NotificationsService.create()`
3. **Backend persiste** no banco de dados
4. **Frontend consulta** via React Query com polling/refetch automático
5. **Usuário visualiza** no dropdown ou página

### Rastreamento de Leitura

1. **Usuário clica** em notificação
2. **Frontend chama** `useMarkAsRead.mutate(notificationId)`
3. **Backend cria** registro em `NotificationRead` com `userId` e `notificationId`
4. **React Query invalida** cache automaticamente
5. **UI atualiza** removendo badge "não lida"

---

## 🎯 Casos de Uso

### 1. Alerta de Prescrição Expirando

```tsx
await notificationsService.create({
  tenantId,
  type: SystemNotificationType.PRESCRIPTION_EXPIRING,
  category: NotificationCategory.PRESCRIPTION,
  severity: NotificationSeverity.WARNING,
  title: 'Prescrição expirando em breve',
  message: `A prescrição de ${medication} para ${resident} expira em 3 dias`,
  actionUrl: `/dashboard/residents/${residentId}/prescriptions`,
  entityType: 'PRESCRIPTION',
  entityId: prescriptionId,
  metadata: {
    residentName: 'João Silva',
    medicationName: 'Enalapril 10mg',
    expirationDate: '2026-01-15'
  }
})
```

### 2. Sinal Vital Anormal

```tsx
await notificationsService.create({
  type: SystemNotificationType.VITAL_SIGN_ABNORMAL_BP,
  category: NotificationCategory.VITAL_SIGN,
  severity: NotificationSeverity.CRITICAL,
  title: 'Pressão arterial crítica',
  message: `PA de ${resident}: 180/110 mmHg (muito alta)`,
  actionUrl: `/dashboard/residents/${residentId}/vital-signs`,
  metadata: {
    systolic: 180,
    diastolic: 110,
    measuredAt: new Date().toISOString()
  }
})
```

### 3. Evento Perdido

```tsx
await notificationsService.create({
  type: SystemNotificationType.SCHEDULED_EVENT_MISSED,
  category: NotificationCategory.SCHEDULED_EVENT,
  severity: NotificationSeverity.WARNING,
  title: 'Evento não realizado',
  message: 'Banho de João Silva às 14:00 não foi registrado',
  entityType: 'SCHEDULED_EVENT',
  entityId: eventId,
  metadata: {
    eventTitle: 'Banho',
    scheduledDate: '2026-01-10',
    scheduledTime: '14:00',
    residentName: 'João Silva'
  }
})
```

---

## 🔍 Validação e Testes

### Checklist de Validação

- [x] TypeScript sem erros
- [x] ESLint sem erros críticos
- [x] Imports/exports corretos
- [x] Configuração centralizada funcionando
- [x] Fallback para categorias desconhecidas
- [x] Todas as 10 categorias mapeadas
- [x] Dropdown renderiza corretamente
- [x] Página renderiza corretamente
- [x] Filtros funcionam
- [x] Marcar como lida funciona
- [x] Deletar funciona
- [x] Integração com MissedEventActionsModal funciona

### Testes Manuais Realizados (2026-01-10)

✅ Navegação entre dropdown e página
✅ Filtros por categoria e severidade
✅ Busca por texto
✅ Marcar como lida individual
✅ Marcar todas como lidas
✅ Deletar notificação
✅ Badge de contador atualiza
✅ Paginação funciona
✅ Modal de evento perdido abre corretamente

---

## 🚨 Troubleshooting

### Problema: Notificação quebra com erro "cannot read property 'icon' of undefined"

**Causa:** Categoria não mapeada em `NOTIFICATION_CATEGORY_CONFIG`

**Solução:**
1. Adicionar categoria em `apps/frontend/src/api/notifications.api.ts`
2. Adicionar configuração em `apps/frontend/src/config/notifications.config.tsx`
3. O helper `getCategoryConfig()` já fornece fallback automático

### Problema: Badge não atualiza após marcar como lida

**Causa:** Cache do React Query não foi invalidado

**Solução:** Verificar se `queryClient.invalidateQueries(['notifications'])` está sendo chamado no mutation

### Problema: Notificação não aparece após criação

**Causa:** Falta de refetch ou polling

**Solução:**
- Frontend usa polling automático (`refetchInterval: 60000`)
- Ou implementar WebSockets para real-time (futuro)

---

## 📈 Melhorias Futuras

### Planejadas

1. **WebSockets/Server-Sent Events**
   - Notificações em tempo real sem polling
   - Redução de carga no servidor

2. **Preferências de Notificação**
   - Usuário escolhe quais categorias deseja receber
   - Configuração de horários (não incomodar)

3. **Notificações Push**
   - Integração com Web Push API
   - Notificações mesmo com app fechado

4. **Templates de Notificação**
   - Sistema de templates configuráveis
   - Suporte a i18n (internacionalização)

5. **Analytics**
   - Taxa de leitura por categoria
   - Tempo médio para leitura
   - Notificações mais ignoradas

### Sugestões de Testes

1. **Testes Unitários**
   - `getCategoryConfig()` retorna fallback correto
   - `getSeverityIcon()` retorna ícone correto
   - Helpers funcionam com valores inválidos

2. **Testes de Integração**
   - Criar notificação → aparece no dropdown
   - Marcar como lida → contador diminui
   - Deletar → remove da lista

3. **Testes E2E**
   - Fluxo completo de notificação
   - Navegação entre páginas
   - Ações em massa

---

## 📚 Referências

### Arquivos Principais

- **Backend:**
  - `apps/backend/prisma/schema/notifications.prisma`
  - `apps/backend/prisma/schema/enums.prisma`
  - `apps/backend/src/notifications/notifications.service.ts`
  - `apps/backend/src/notifications/notifications.controller.ts`

- **Frontend:**
  - `apps/frontend/src/config/notifications.config.tsx` ⭐
  - `apps/frontend/src/api/notifications.api.ts`
  - `apps/frontend/src/hooks/useNotifications.ts`
  - `apps/frontend/src/components/notifications/NotificationsDropdown.tsx`
  - `apps/frontend/src/pages/notifications/NotificationsPage.tsx`

### Commits Importantes

- **2026-01-10:** Padronização e refatoração completa
  - Criada configuração centralizada
  - Sincronizadas categorias frontend/backend
  - Adicionadas categorias INCIDENT e POP
  - Corrigido crash em NotificationsPage
  - Eliminada duplicação de código

- **2025-12-06:** Implementação inicial do sistema

### CHANGELOG

- [CHANGELOG - 2026-01-10](../../CHANGELOG.md#2026-01-10)
- [CHANGELOG - 2025-12-06](../../CHANGELOG.md#2025-12-06)

---

## 👥 Contribuindo

### Adicionando Nova Categoria

1. **Backend:** Adicionar em `apps/backend/prisma/schema/enums.prisma`
   ```prisma
   enum NotificationCategory {
     // ...
     NEW_CATEGORY
   }
   ```

2. **Migration:** `npx prisma migrate dev`

3. **Frontend - Enum:** Adicionar em `apps/frontend/src/api/notifications.api.ts`
   ```ts
   export enum NotificationCategory {
     // ...
     NEW_CATEGORY = 'NEW_CATEGORY',
   }
   ```

4. **Frontend - Config:** Adicionar em `apps/frontend/src/config/notifications.config.tsx`
   ```tsx
   [NotificationCategory.NEW_CATEGORY]: {
     label: 'Nova Categoria',
     icon: IconComponent,
   },
   ```

### Adicionando Novo Tipo de Notificação

1. Adicionar em `SystemNotificationType` enum (backend e frontend)
2. Criar service method para gerar notificação daquele tipo
3. Definir categoria, severidade e metadata padrões
4. Documentar caso de uso neste arquivo

---

**Última revisão:** 10/01/2026 por Claude Sonnet 4.5
**Status:** ✅ Documentação completa e atualizada
