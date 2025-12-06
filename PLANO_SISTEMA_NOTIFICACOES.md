# 🔔 Plano de Implementação - Sistema Completo de Notificações

**Data:** 06/12/2024
**Autor:** Claude (Sonnet 4.5) + Dr. Emanuel Fonseca
**Projeto:** Rafa ILPI - Sistema Multi-Tenant para Gestão de ILPIs

---

## 📋 Sumário Executivo

**Objetivo:** Implementar sistema completo de notificações centralizadas no sino do header, consolidando alertas críticos de prescrições, sinais vitais, documentos e registros diários.

**Arquitetura:** Usar o sino existente no header (linhas 156-183 de `DashboardLayout.tsx`) como centralizador de todas as notificações, com dropdown rico e página completa de gestão.

**Estimativa Total:** 12-16 horas de desenvolvimento
**Complexidade:** Média-Alta
**Prioridade:** Alta (melhora significativa de UX e segurança do paciente)

---

## 🎯 Objetivos e Benefícios

### Objetivos:
1. ✅ Centralizar todos os alertas no sino do header
2. ✅ Implementar sistema de notificações persistentes em banco de dados
3. ✅ Criar alertas automáticos para prescrições, sinais vitais e documentos
4. ✅ Fornecer interface visual moderna com categorização
5. ✅ Permitir gestão completa (marcar como lida, filtros, histórico)

### Benefícios:
- **UX:** Ponto único e familiar para todas as notificações
- **Segurança do Paciente:** Alertas proativos de situações críticas
- **Conformidade:** Rastreabilidade de alertas para ANVISA/LGPD
- **Produtividade:** Equipe notificada automaticamente de pendências
- **Escalabilidade:** Fácil adicionar novos tipos de alertas

---

## 🏗️ Arquitetura do Sistema

### 1. Backend - Módulo de Notificações

```
apps/backend/src/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── notifications.gateway.ts          # WebSocket (opcional Fase 5)
├── dto/
│   ├── create-notification.dto.ts
│   ├── query-notification.dto.ts
│   └── update-notification.dto.ts
├── types/
│   └── notification.types.ts
└── __tests__/
    └── notifications.service.spec.ts
```

### 2. Banco de Dados - Nova Tabela

```prisma
model Notification {
  id          String              @id @default(uuid()) @db.Uuid
  tenantId    String              @db.Uuid
  userId      String?             @db.Uuid  // null = todos os usuários
  type        NotificationType
  category    NotificationCategory
  severity    NotificationSeverity
  title       String              @db.VarChar(255)
  message     String              @db.Text
  actionUrl   String?             @db.Text
  entityType  String?             @db.VarChar(50)
  entityId    String?             @db.Uuid
  metadata    Json?
  read        Boolean             @default(false)
  readAt      DateTime?           @db.Timestamptz(3)
  expiresAt   DateTime?           @db.Timestamptz(3)
  createdAt   DateTime            @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime            @updatedAt @db.Timestamptz(3)

  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User?               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId, read, createdAt(sort: Desc)])
  @@index([type])
  @@index([category])
  @@index([severity])
  @@index([expiresAt])
  @@map("notifications")
}

enum NotificationType {
  PRESCRIPTION_EXPIRED
  PRESCRIPTION_EXPIRING
  PRESCRIPTION_MISSING_RECEIPT
  VITAL_SIGN_ABNORMAL
  DOCUMENT_EXPIRED
  DOCUMENT_EXPIRING
  DAILY_RECORD_MISSING
  MEDICATION_ADMINISTRATION_MISSED
  SYSTEM_UPDATE
  USER_MENTION
}

enum NotificationCategory {
  PRESCRIPTION
  VITAL_SIGN
  DOCUMENT
  DAILY_RECORD
  SYSTEM
}

enum NotificationSeverity {
  CRITICAL   // Vermelho - Ação imediata
  WARNING    // Laranja - Atenção necessária
  INFO       // Azul - Informativo
  SUCCESS    // Verde - Positivo
}
```

### 3. Frontend - Componentes

```
apps/frontend/src/components/notifications/
├── NotificationsDropdown.tsx      # Dropdown do sino
├── NotificationItem.tsx           # Item individual
├── NotificationCategories.tsx     # Tabs de categorias
├── NotificationBadge.tsx          # Badge com contador
└── EmptyNotifications.tsx         # Estado vazio
```

```
apps/frontend/src/pages/notifications/
├── NotificationsPage.tsx          # Página completa
├── NotificationsFilters.tsx       # Filtros e busca
└── NotificationsTable.tsx         # Tabela com paginação
```

```
apps/frontend/src/hooks/
├── useNotifications.ts            # Hook principal
├── useNotificationCount.ts        # Contador não lidas
└── useMarkAsRead.ts               # Marcar como lida
```

```
apps/frontend/src/api/
└── notifications.api.ts           # Cliente da API
```

---

## 📊 Estrutura de Dados

### Tipos de Notificações por Categoria:

| Categoria | Tipos | Severidade | Origem |
|-----------|-------|------------|---------|
| **PRESCRIPTION** | EXPIRED, EXPIRING, MISSING_RECEIPT | CRITICAL, WARNING | Cron Job diário |
| **VITAL_SIGN** | ABNORMAL (PA, glicemia, temp) | CRITICAL, WARNING | Trigger ao registrar |
| **DOCUMENT** | EXPIRED, EXPIRING | WARNING, INFO | Cron Job diário |
| **DAILY_RECORD** | MISSING (sem registro no dia) | INFO | Cron Job noturno |
| **SYSTEM** | UPDATE, MAINTENANCE | INFO | Manual/Admin |

### Metadata (JSON):

```typescript
// PRESCRIPTION
{
  prescriptionId: string
  residentId: string
  residentName: string
  doctorName: string
  daysExpired?: number
  daysUntilExpiry?: number
}

// VITAL_SIGN
{
  vitalSignId: string
  residentId: string
  residentName: string
  type: 'PA' | 'GLICEMIA' | 'TEMPERATURA' | 'FC' | 'SPO2'
  value: string
  normalRange: string
}

// DOCUMENT
{
  documentId: string
  documentType: string
  documentName: string
  expiryDate: string
  daysUntilExpiry: number
}

// DAILY_RECORD
{
  residentId: string
  residentName: string
  date: string
  missingTypes: string[]
}
```

---

## 🚀 Plano de Implementação - 5 Fases

---

### **FASE 1: Infraestrutura Backend (3-4h)**

**Objetivo:** Criar módulo de notificações e tabela no banco de dados

#### 1.1 Schema Prisma
- [ ] Adicionar modelo `Notification` ao `schema.prisma`
- [ ] Adicionar enums `NotificationType`, `NotificationCategory`, `NotificationSeverity`
- [ ] Criar migration: `npx prisma migrate dev --name add_notifications_table`
- [ ] Gerar Prisma Client: `npx prisma generate`

#### 1.2 Módulo Backend
- [ ] Criar módulo: `nest g module notifications`
- [ ] Criar controller: `nest g controller notifications`
- [ ] Criar service: `nest g service notifications`

#### 1.3 DTOs
**`create-notification.dto.ts`:**
```typescript
export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType

  @IsEnum(NotificationCategory)
  category: NotificationCategory

  @IsEnum(NotificationSeverity)
  severity: NotificationSeverity

  @IsString()
  @MaxLength(255)
  title: string

  @IsString()
  message: string

  @IsOptional()
  @IsString()
  actionUrl?: string

  @IsOptional()
  @IsUUID()
  userId?: string

  @IsOptional()
  @IsString()
  entityType?: string

  @IsOptional()
  @IsUUID()
  entityId?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>

  @IsOptional()
  @IsDate()
  expiresAt?: Date
}
```

**`query-notification.dto.ts`:**
```typescript
export class QueryNotificationDto {
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory

  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  read?: boolean

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 20
}
```

#### 1.4 Service
**`notifications.service.ts`:**
```typescript
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Criar notificação
  async create(tenantId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        ...dto,
      },
    })
  }

  // Listar notificações do usuário
  async findAll(
    tenantId: string,
    userId: string,
    query: QueryNotificationDto
  ) {
    const { category, severity, read, page = 1, limit = 20 } = query
    const skip = (page - 1) * limit

    const where: any = {
      tenantId,
      OR: [
        { userId },
        { userId: null }, // Notificações globais
      ],
      AND: [],
    }

    if (category) where.AND.push({ category })
    if (severity) where.AND.push({ severity })
    if (read !== undefined) where.AND.push({ read })

    // Não exibir notificações expiradas
    where.AND.push({
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    })

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [
          { read: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ])

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // Contar não lidas
  async countUnread(tenantId: string, userId: string) {
    return this.prisma.notification.count({
      where: {
        tenantId,
        OR: [
          { userId },
          { userId: null },
        ],
        read: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
    })
  }

  // Marcar como lida
  async markAsRead(id: string, tenantId: string, userId: string) {
    return this.prisma.notification.update({
      where: {
        id,
        tenantId,
        OR: [
          { userId },
          { userId: null },
        ],
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
  }

  // Marcar todas como lidas
  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId,
        OR: [
          { userId },
          { userId: null },
        ],
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
  }

  // Deletar notificação
  async remove(id: string, tenantId: string) {
    return this.prisma.notification.delete({
      where: {
        id,
        tenantId,
      },
    })
  }
}
```

#### 1.5 Controller
**`notifications.controller.ts`:**
```typescript
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryNotificationDto
  ) {
    return this.notificationsService.findAll(
      user.tenantId,
      user.id,
      query
    )
  }

  @Get('count')
  async countUnread(@CurrentUser() user: any) {
    const count = await this.notificationsService.countUnread(
      user.tenantId,
      user.id
    )
    return { count }
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.notificationsService.markAsRead(
      id,
      user.tenantId,
      user.id
    )
  }

  @Patch('mark-all-read')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(
      user.tenantId,
      user.id
    )
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.notificationsService.remove(id, user.tenantId)
  }
}
```

#### 1.6 Registrar no App Module
- [ ] Adicionar `NotificationsModule` ao `app.module.ts`

**Checklist Fase 1:**
- [ ] Schema Prisma criado
- [ ] Migration executada
- [ ] Módulo, Controller, Service criados
- [ ] DTOs implementados
- [ ] Endpoints testados com Postman/Insomnia
- [ ] Testes unitários básicos

---

### **FASE 2: Frontend - Dropdown do Sino (3-4h)**

**Objetivo:** Implementar dropdown rico no sino do header com tabs e lista de notificações

#### 2.1 API Client
**`apps/frontend/src/api/notifications.api.ts`:**
```typescript
export interface Notification {
  id: string
  type: NotificationType
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  message: string
  actionUrl?: string
  metadata?: any
  read: boolean
  readAt?: string
  createdAt: string
}

export const notificationsApi = {
  findAll: (params?: any) =>
    api.get<{ data: Notification[]; meta: any }>('/notifications', { params }),

  countUnread: () =>
    api.get<{ count: number }>('/notifications/count'),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
}
```

#### 2.2 Hooks
**`apps/frontend/src/hooks/useNotifications.ts`:**
```typescript
export function useNotifications(params?: any) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.findAll(params),
    refetchInterval: 30000, // 30 segundos
  })
}

export function useNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => notificationsApi.countUnread(),
    refetchInterval: 15000, // 15 segundos
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
```

#### 2.3 Componente NotificationsDropdown
**`apps/frontend/src/components/notifications/NotificationsDropdown.tsx`:**
```tsx
export function NotificationsDropdown() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const { data: notifications } = useNotifications({ category: selectedCategory !== 'all' ? selectedCategory : undefined })
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const navigate = useNavigate()

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }

    // Navegar se tiver URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  const categories = [
    { value: 'all', label: 'Todas', count: notifications?.data?.length || 0 },
    { value: 'PRESCRIPTION', label: 'Prescrições', count: 0 },
    { value: 'VITAL_SIGN', label: 'Sinais Vitais', count: 0 },
    { value: 'DOCUMENT', label: 'Documentos', count: 0 },
  ]

  return (
    <DropdownMenuContent className="w-96 max-h-[600px]" align="end">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notificações</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllAsRead.mutate()}
        >
          Marcar todas como lidas
        </Button>
      </div>

      {/* Categories Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full">
          {categories.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
              {cat.count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {cat.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      <ScrollArea className="h-96">
        {notifications?.data?.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="p-2 space-y-2">
            {notifications?.data?.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate('/dashboard/notifications')}
        >
          Ver todas as notificações
        </Button>
      </div>
    </DropdownMenuContent>
  )
}
```

#### 2.4 Atualizar DashboardLayout
- [ ] Substituir `notificationCount` hardcoded por `useNotificationCount()`
- [ ] Substituir `onClick` do sino por `NotificationsDropdown`
- [ ] Remover toast "em desenvolvimento"

**Checklist Fase 2:**
- [ ] API client criado
- [ ] Hooks implementados
- [ ] NotificationsDropdown funcional
- [ ] Tabs de categorias
- [ ] Lista de notificações com scroll
- [ ] Marcar como lida ao clicar
- [ ] Badge com contador atualizado
- [ ] Responsivo (mobile + desktop)

---

### **FASE 3: Alertas Automáticos - Prescrições (2-3h)**

**Objetivo:** Integrar criação automática de notificações com sistema existente de prescrições

#### 3.1 Integrar no PrescriptionsService

**Adicionar ao `prescriptions.service.ts`:**
```typescript
constructor(
  private prisma: PrismaService,
  private notificationsService: NotificationsService,  // Injetar
) {}

// Método auxiliar para criar notificações de prescrições
private async createPrescriptionNotification(
  prescription: any,
  type: NotificationType,
  severity: NotificationSeverity
) {
  const titles = {
    PRESCRIPTION_EXPIRED: 'Prescrição Vencida',
    PRESCRIPTION_EXPIRING: 'Prescrição Vencendo',
    PRESCRIPTION_MISSING_RECEIPT: 'Receita Não Anexada',
  }

  const messages = {
    PRESCRIPTION_EXPIRED: `A prescrição de ${prescription.resident.fullName} está vencida`,
    PRESCRIPTION_EXPIRING: `A prescrição de ${prescription.resident.fullName} vence em breve`,
    PRESCRIPTION_MISSING_RECEIPT: `Prescrição de controlado sem receita anexada para ${prescription.resident.fullName}`,
  }

  await this.notificationsService.create(prescription.tenantId, {
    type,
    category: 'PRESCRIPTION',
    severity,
    title: titles[type],
    message: messages[type],
    actionUrl: `/dashboard/prescricoes/${prescription.id}`,
    entityType: 'PRESCRIPTION',
    entityId: prescription.id,
    metadata: {
      prescriptionId: prescription.id,
      residentId: prescription.residentId,
      residentName: prescription.resident.fullName,
      doctorName: prescription.doctorName,
    },
  })
}
```

#### 3.2 Criar Cron Job para Verificação Diária

**`apps/backend/src/notifications/notifications.cron.ts`:**
```typescript
@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name)

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  // Executar todo dia às 7h
  @Cron('0 7 * * *')
  async checkExpiredPrescriptions() {
    this.logger.log('Verificando prescrições vencidas...')

    const tenants = await this.prisma.tenant.findMany()

    for (const tenant of tenants) {
      const now = new Date()

      // Prescrições vencidas
      const expired = await this.prisma.prescription.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          validUntil: { lt: now },
          deletedAt: null,
        },
        include: {
          resident: { select: { fullName: true } },
        },
      })

      // Prescrições vencendo em 5 dias
      const fiveDaysFromNow = new Date()
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

      const expiring = await this.prisma.prescription.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          validUntil: {
            gte: now,
            lte: fiveDaysFromNow,
          },
          deletedAt: null,
        },
        include: {
          resident: { select: { fullName: true } },
        },
      })

      // Criar notificações
      for (const prescription of expired) {
        await this.createPrescriptionNotification(
          prescription,
          'PRESCRIPTION_EXPIRED',
          'CRITICAL'
        )
      }

      for (const prescription of expiring) {
        await this.createPrescriptionNotification(
          prescription,
          'PRESCRIPTION_EXPIRING',
          'WARNING'
        )
      }
    }

    this.logger.log('Verificação de prescrições concluída')
  }
}
```

#### 3.3 Registrar Cron no Módulo
- [ ] Adicionar `@nestjs/schedule` ao projeto
- [ ] Configurar `ScheduleModule.forRoot()` no `app.module.ts`
- [ ] Registrar `NotificationsCronService` no `notifications.module.ts`

**Checklist Fase 3:**
- [ ] Cron job implementado
- [ ] Notificações criadas automaticamente
- [ ] Testado manualmente (criar prescrição vencida e verificar notificação)
- [ ] Logs funcionando

---

### **FASE 4: Alertas de Sinais Vitais e Documentos (2-3h)**

**Objetivo:** Implementar detecção de sinais vitais anormais e documentos vencidos

#### 4.1 Sinais Vitais Anormais

**Adicionar ao `vital-signs.service.ts`:**
```typescript
async create(tenantId: string, dto: CreateVitalSignDto) {
  const vitalSign = await this.prisma.vitalSign.create({
    data: { tenantId, ...dto },
    include: {
      resident: { select: { fullName: true } },
    },
  })

  // Verificar valores anormais
  await this.checkAbnormalVitalSigns(vitalSign)

  return vitalSign
}

private async checkAbnormalVitalSigns(vitalSign: any) {
  const alerts = []

  // Pressão Arterial
  if (vitalSign.systolicPressure && vitalSign.diastolicPressure) {
    if (vitalSign.systolicPressure > 140 || vitalSign.systolicPressure < 90) {
      alerts.push({
        type: 'VITAL_SIGN_ABNORMAL',
        severity: vitalSign.systolicPressure > 160 ? 'CRITICAL' : 'WARNING',
        title: 'Pressão Arterial Anormal',
        message: `PA ${vitalSign.systolicPressure}/${vitalSign.diastolicPressure} mmHg em ${vitalSign.resident.fullName}`,
        metadata: {
          type: 'PA',
          value: `${vitalSign.systolicPressure}/${vitalSign.diastolicPressure}`,
          normalRange: '90-140 / 60-90 mmHg',
        },
      })
    }
  }

  // Glicemia
  if (vitalSign.bloodGlucose) {
    if (vitalSign.bloodGlucose > 200 || vitalSign.bloodGlucose < 70) {
      alerts.push({
        type: 'VITAL_SIGN_ABNORMAL',
        severity: 'CRITICAL',
        title: 'Glicemia Anormal',
        message: `Glicemia ${vitalSign.bloodGlucose} mg/dL em ${vitalSign.resident.fullName}`,
        metadata: {
          type: 'GLICEMIA',
          value: vitalSign.bloodGlucose,
          normalRange: '70-100 mg/dL (jejum)',
        },
      })
    }
  }

  // Temperatura
  if (vitalSign.temperature) {
    if (vitalSign.temperature > 37.5 || vitalSign.temperature < 35.5) {
      alerts.push({
        type: 'VITAL_SIGN_ABNORMAL',
        severity: vitalSign.temperature > 38.5 ? 'CRITICAL' : 'WARNING',
        title: 'Temperatura Anormal',
        message: `Temperatura ${vitalSign.temperature}°C em ${vitalSign.resident.fullName}`,
        metadata: {
          type: 'TEMPERATURA',
          value: vitalSign.temperature,
          normalRange: '35.5-37.5°C',
        },
      })
    }
  }

  // Criar notificações
  for (const alert of alerts) {
    await this.notificationsService.create(vitalSign.tenantId, {
      category: 'VITAL_SIGN',
      actionUrl: `/dashboard/residentes/${vitalSign.residentId}`,
      entityType: 'VITAL_SIGN',
      entityId: vitalSign.id,
      ...alert,
    })
  }
}
```

#### 4.2 Documentos Vencidos

**Criar Cron Job para Documentos:**
```typescript
@Cron('0 8 * * *')
async checkExpiringDocuments() {
  this.logger.log('Verificando documentos vencidos...')

  const tenants = await this.prisma.tenant.findMany()

  for (const tenant of tenants) {
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    // Documentos institucionais vencendo
    const expiringDocs = await this.prisma.tenantDocument.findMany({
      where: {
        tenantId: tenant.id,
        expiryDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
    })

    for (const doc of expiringDocs) {
      const daysUntilExpiry = Math.ceil(
        (new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      await this.notificationsService.create(tenant.id, {
        type: 'DOCUMENT_EXPIRING',
        category: 'DOCUMENT',
        severity: daysUntilExpiry <= 7 ? 'WARNING' : 'INFO',
        title: 'Documento Vencendo',
        message: `${doc.documentName} vence em ${daysUntilExpiry} dias`,
        actionUrl: '/dashboard/perfil-institucional',
        entityType: 'TENANT_DOCUMENT',
        entityId: doc.id,
        metadata: {
          documentId: doc.id,
          documentName: doc.documentName,
          documentType: doc.documentType,
          expiryDate: doc.expiryDate,
          daysUntilExpiry,
        },
      })
    }
  }

  this.logger.log('Verificação de documentos concluída')
}
```

**Checklist Fase 4:**
- [ ] Alertas de sinais vitais implementados
- [ ] Cron job de documentos implementado
- [ ] Notificações criadas automaticamente
- [ ] Testado com dados reais

---

### **FASE 5: Página Completa de Notificações (2-3h)**

**Objetivo:** Criar página completa com filtros, busca e histórico

#### 5.1 Página NotificationsPage
**`apps/frontend/src/pages/notifications/NotificationsPage.tsx`:**
```tsx
export function NotificationsPage() {
  const [filters, setFilters] = useState({
    category: undefined,
    severity: undefined,
    read: undefined,
    page: 1,
  })

  const { data: notifications } = useNotifications(filters)
  const markAllAsRead = useMarkAllAsRead()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notificações</h1>
        <Button onClick={() => markAllAsRead.mutate()}>
          Marcar todas como lidas
        </Button>
      </div>

      <NotificationsFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      <NotificationsTable
        notifications={notifications?.data || []}
        meta={notifications?.meta}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />
    </div>
  )
}
```

#### 5.2 Adicionar Rota
- [ ] Adicionar rota `/dashboard/notifications` ao router
- [ ] Adicionar permissão (todos podem ver suas notificações)

**Checklist Fase 5:**
- [ ] Página criada e roteada
- [ ] Filtros funcionais
- [ ] Paginação implementada
- [ ] Busca por texto
- [ ] Ações em massa

---

## ✅ Checklist Geral

### Backend:
- [ ] Tabela `notifications` criada no banco
- [ ] Módulo de notificações implementado
- [ ] Endpoints REST funcionais
- [ ] Cron jobs configurados
- [ ] Integração com prescrições
- [ ] Integração com sinais vitais
- [ ] Integração com documentos

### Frontend:
- [ ] API client criado
- [ ] Hooks implementados
- [ ] Dropdown do sino funcional
- [ ] Badge com contador dinâmico
- [ ] Página completa de notificações
- [ ] Responsividade (mobile + desktop)

### Testes:
- [ ] Testes unitários backend
- [ ] Testes E2E frontend
- [ ] Teste manual de cada tipo de notificação
- [ ] Performance (consultas otimizadas)

---

## 📈 Métricas de Sucesso

1. ✅ Contador de notificações atualizado em tempo real
2. ✅ Alertas críticos exibidos em <1 minuto após detecção
3. ✅ Dropdown carrega em <500ms
4. ✅ Cron jobs executam sem erros
5. ✅ 100% das notificações são rastreáveis (auditoria)
6. ✅ Zero notificações duplicadas

---

## 🎯 Próximos Passos (Pós-Implementação)

### Fase 6 (Futuro):
- [ ] WebSocket para notificações em tempo real
- [ ] Notificações por email (integração com Resend)
- [ ] Preferências de notificação por usuário
- [ ] Sons e vibrações (mobile)
- [ ] Notificações push (PWA)

---

## 📝 Notas de Implementação

**Padrões a seguir:**
- Usar mesma estrutura de DTOs existente (class-validator)
- Seguir padrão de hooks do frontend (TanStack Query)
- Manter nomenclatura snake_case no banco, camelCase no código
- Auditoria automática via interceptor existente
- Logs estruturados com Winston

**Decisões Arquiteturais:**
1. **Por que tabela separada?** Escalabilidade e performance (vs. coluna em audit_logs)
2. **Por que cron jobs?** Confiabilidade e baixo acoplamento
3. **Por que polling?** Simplicidade (WebSocket é Fase 6)
4. **Por que 30s de refetch?** Balanço entre real-time e performance

---

**Fim do Plano** 🎉
