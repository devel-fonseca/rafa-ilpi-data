# 🔔 Sistema de Notificações - Rafa ILPI

## ✅ Status: **IMPLEMENTADO E FUNCIONAL**

Sistema completo de notificações centralizadas implementado em **06/12/2024**.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Funcionalidades](#funcionalidades)
4. [Tipos de Notificações](#tipos-de-notificações)
5. [Como Usar](#como-usar)
6. [Configuração](#configuração)
7. [Próximos Passos](#próximos-passos)

---

## 🎯 Visão Geral

O sistema de notificações do Rafa ILPI é uma solução completa para alertas automáticos e gestão de notificações em tempo real, integrado ao sino já existente no header.

### Características Principais

- ✅ **Notificações Automáticas**: Cron jobs verificam prescrições, documentos e sinais vitais
- ✅ **Detecção em Tempo Real**: Alertas imediatos ao registrar sinais vitais anormais
- ✅ **Dropdown Rico**: Interface com tabs, badges e polling automático
- ✅ **Página Completa**: Gestão avançada com filtros, busca e paginação
- ✅ **Multi-tenant**: Isolamento completo por organização
- ✅ **Auditável**: Todas as ações registradas automaticamente

---

## 🏗️ Arquitetura

### Backend (NestJS)

```
notifications/
├── notifications.module.ts       # Módulo principal
├── notifications.controller.ts   # 6 endpoints REST
├── notifications.service.ts      # Lógica de negócio + helpers
├── notifications.cron.ts         # 3 cron jobs automáticos
└── dto/
    ├── create-notification.dto.ts
    └── query-notification.dto.ts
```

### Frontend (React + Vite)

```
api/
└── notifications.api.ts          # API client

hooks/
└── useNotifications.ts           # 5 hooks customizados

components/
└── notifications/
    └── NotificationsDropdown.tsx # Dropdown no sino

pages/
└── notifications/
    └── NotificationsPage.tsx     # Página completa
```

### Database (PostgreSQL + Prisma)

```prisma
model Notification {
  id          String                    @id @default(uuid())
  tenantId    String                    # Multi-tenant
  userId      String?                   # null = broadcast
  type        SystemNotificationType    # Tipo específico
  category    NotificationCategory      # Categoria geral
  severity    NotificationSeverity      # CRITICAL, WARNING, INFO, SUCCESS
  title       String
  message     String
  actionUrl   String?                   # URL para navegação
  entityType  String?                   # Ex: "PRESCRIPTION"
  entityId    String?                   # ID da entidade
  metadata    Json?                     # Dados adicionais
  read        Boolean
  readAt      DateTime?
  expiresAt   DateTime?
  createdAt   DateTime
  updatedAt   DateTime
}
```

---

## 🎯 Funcionalidades

### 1. Cron Jobs Automáticos

#### **Prescrições (Executa às 7h)**
- ❗ Prescrições vencidas → `CRITICAL`
- ⚠️ Prescrições vencendo em 5 dias → `WARNING`
- ❗ Medicamentos controlados sem receita → `CRITICAL`

#### **Documentos (Executa às 8h)**
- ❗ Documentos vencidos → `CRITICAL`
- ⚠️ Documentos vencendo em 30 dias → `WARNING`
- 📄 Institucionais + Residentes

#### **Limpeza (Executa às 3h)**
- 🗑️ Remove notificações expiradas

### 2. Sinais Vitais (Tempo Real)

Alertas criados **imediatamente** ao registrar sinal vital anormal:

| Parâmetro | Faixa Normal | WARNING | CRITICAL |
|-----------|-------------|---------|----------|
| PA Sistólica | 90-140 mmHg | <90 ou ≥140 | <80 ou ≥160 |
| Glicemia | 70-200 mg/dL | <70 ou ≥200 | <50 ou ≥250 |
| Temperatura | 35.5-37.5°C | <35.5 ou ≥37.5 | <35 ou ≥38.5 |
| FC | 60-100 bpm | <60 ou ≥100 | <50 ou ≥120 |
| SpO2 | ≥92% | <92% | <88% |

### 3. Interface do Usuário

#### **Dropdown (Sino no Header)**
- 🔴 Badge dinâmico com contador (atualiza a cada 15s)
- 📑 Tabs de categorias (Todas, Prescrições, Vitais, Documentos)
- 📜 Lista das últimas 50 não lidas
- ✅ "Marcar todas como lidas"
- 🔗 Link para página completa

#### **Página Completa (/dashboard/notificacoes)**
- 🔍 Busca por texto
- 🏷️ Filtros (categoria, severidade, apenas não lidas)
- 📄 Paginação (20 por página)
- 🗑️ Delete individual
- 🔗 Navegação ao clicar

---

## 📊 Tipos de Notificações

### Enums

#### `SystemNotificationType`
```typescript
// Prescrições
PRESCRIPTION_EXPIRED
PRESCRIPTION_EXPIRING
PRESCRIPTION_MISSING_RECEIPT
PRESCRIPTION_CONTROLLED_NO_RECEIPT

// Sinais Vitais
VITAL_SIGN_ABNORMAL_BP
VITAL_SIGN_ABNORMAL_GLUCOSE
VITAL_SIGN_ABNORMAL_TEMPERATURE
VITAL_SIGN_ABNORMAL_HEART_RATE
VITAL_SIGN_ABNORMAL_RESPIRATORY_RATE

// Documentos
DOCUMENT_EXPIRED
DOCUMENT_EXPIRING

// Registro Diário
DAILY_RECORD_MISSING

// Medicação
MEDICATION_ADMINISTRATION_MISSED
MEDICATION_ADMINISTRATION_LATE

// Sistema
SYSTEM_UPDATE
SYSTEM_MAINTENANCE
USER_MENTION
```

#### `NotificationCategory`
```typescript
PRESCRIPTION
VITAL_SIGN
DOCUMENT
DAILY_RECORD
MEDICATION
SYSTEM
```

#### `NotificationSeverity`
```typescript
CRITICAL  // 🔴 Vermelho - Requer ação imediata
WARNING   // 🟠 Laranja - Requer atenção
INFO      // 🔵 Azul - Informativo
SUCCESS   // 🟢 Verde - Sucesso
```

---

## 🚀 Como Usar

### Backend - Criar Notificação Programaticamente

```typescript
// Injetar NotificationsService
constructor(
  private readonly notificationsService: NotificationsService
) {}

// Criar notificação
await this.notificationsService.create(tenantId, {
  type: 'PRESCRIPTION_EXPIRED',
  category: 'PRESCRIPTION',
  severity: 'CRITICAL',
  title: 'Prescrição Vencida',
  message: `A prescrição do residente ${residentName} está vencida.`,
  actionUrl: `/dashboard/prescricoes/${prescriptionId}`,
  entityType: 'PRESCRIPTION',
  entityId: prescriptionId,
  metadata: { residentName },
})

// Ou usar helper
await this.notificationsService.createPrescriptionExpiredNotification(
  tenantId,
  prescriptionId,
  residentName
)
```

### Frontend - Consumir Notificações

```typescript
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications'

function MyComponent() {
  // Buscar notificações
  const { data, isLoading } = useNotifications({
    page: 1,
    limit: 20,
    category: 'PRESCRIPTION',
    read: false,
  })

  // Contador não lidas
  const { data: unreadCount } = useUnreadCount()

  // Marcar como lida
  const markAsRead = useMarkAsRead()
  markAsRead.mutate(notificationId)

  return (
    <div>
      <p>Não lidas: {unreadCount?.count}</p>
      {data?.data.map(notification => (
        <div key={notification.id}>{notification.title}</div>
      ))}
    </div>
  )
}
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Nenhuma variável adicional necessária. O sistema usa as configurações existentes:
- PostgreSQL (já configurado)
- Redis (já configurado)
- @nestjs/schedule (instalado automaticamente)

### Horários dos Cron Jobs

Configurados em `notifications.cron.ts`:

```typescript
// Prescrições - 7h (America/Sao_Paulo)
@Cron('0 7 * * *')

// Documentos - 8h
@Cron('0 8 * * *')

// Limpeza - 3h
@Cron('0 3 * * *')
```

Para alterar, edite o arquivo e reinicie o backend.

---

## 📈 Próximos Passos (Roadmap)

### Fase 6 - Real-Time (WebSocket)
- [ ] Substituir polling por WebSocket
- [ ] Notificações push instantâneas
- [ ] Contador atualiza em <1s

### Fase 7 - Email Notifications
- [ ] Integração com Resend
- [ ] Templates de email customizados
- [ ] Preferências de email por usuário

### Fase 8 - Push Notifications (PWA)
- [ ] Service Worker
- [ ] Web Push API
- [ ] Notificações no desktop

### Fase 9 - Preferências
- [ ] Escolher quais notificações receber
- [ ] Silenciar categorias
- [ ] Horário de silêncio

### Fase 10 - Melhorias UX
- [ ] Som/vibração em notificações críticas
- [ ] Agrupamento de notificações similares
- [ ] Snooze (adiar notificação)

---

## 📝 Endpoints da API

### GET `/notifications`
Listar notificações com filtros e paginação

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `category` (NotificationCategory)
- `severity` (NotificationSeverity)
- `read` (boolean)
- `type` (SystemNotificationType)
- `search` (string)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "PRESCRIPTION_EXPIRED",
      "category": "PRESCRIPTION",
      "severity": "CRITICAL",
      "title": "Prescrição Vencida",
      "message": "...",
      "actionUrl": "/dashboard/prescricoes/uuid",
      "read": false,
      "createdAt": "2024-12-06T10:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### GET `/notifications/unread/count`
Contar notificações não lidas

**Response:**
```json
{ "count": 6 }
```

### PATCH `/notifications/:id/read`
Marcar notificação como lida

### PATCH `/notifications/read-all`
Marcar todas como lidas

**Response:**
```json
{ "count": 6 }
```

### DELETE `/notifications/:id`
Deletar notificação

### POST `/notifications`
Criar notificação (uso interno)

---

## 🔍 Troubleshooting

### Notificações não aparecem
1. Verificar cron jobs: `docker logs backend | grep "Running cron"`
2. Verificar database: `SELECT COUNT(*) FROM notifications;`
3. Verificar polling: DevTools > Network > `/notifications/unread/count`

### Contador não atualiza
1. Verificar console do browser (erros de API)
2. Verificar TanStack Query DevTools
3. Verificar `useUnreadCount` hook (refetchInterval: 15s)

### Cron jobs não executam
1. Verificar `@nestjs/schedule` instalado
2. Verificar `ScheduleModule.forRoot()` no app.module
3. Verificar logs: `grep "cron" backend.log`

---

## 📚 Referências

- [NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)
- [TanStack Query](https://tanstack.com/query/latest)
- [Prisma](https://www.prisma.io/docs)
- [Shadcn/ui](https://ui.shadcn.com)

---

## 👨‍💻 Desenvolvido por

**Rafa Labs Desenvolvimento e Tecnologia**
Dr. Emanuel - CEO / Product Owner

**Data de Implementação:** 06/12/2024
**Versão:** 1.0.0
**Status:** ✅ Production Ready

---

## 📄 Licença

Propriedade de Rafa Labs - Todos os direitos reservados.
