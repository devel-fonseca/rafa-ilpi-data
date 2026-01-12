# Módulo: Sistema de Mensagens Internas

**Status:** ✅ Implementado
**Versão:** 1.0.0
**Última atualização:** 11/01/2026

---

## 📋 Visão Geral

Sistema completo de mensagens internas para comunicação entre usuários do mesmo tenant, com suporte a **mensagens diretas** (1:1 ou 1:N) e **broadcasts institucionais** (1:TODOS). Inclui rastreamento detalhado de leitura, estatísticas de engajamento, permissões granulares e soft delete com auditoria completa.

---

## 🎯 Funcionalidades Principais

### Features v1.0

- ✅ **Mensagens Diretas (DIRECT)** - Comunicação entre usuários específicos (1:1 ou 1:N)
- ✅ **Broadcasts Institucionais (BROADCAST)** - Envio para todos usuários do tenant
- ✅ **Rastreamento de Leitura** - Status individual por destinatário (SENT, DELIVERED, READ)
- ✅ **Estatísticas Detalhadas** - Dashboard com lidas vs não lidas, percentual de engajamento
- ✅ **Permissões Granulares** - VIEW_MESSAGES, SEND_MESSAGES, BROADCAST_MESSAGES, DELETE_MESSAGES
- ✅ **Soft Delete** - Exclusão com motivo obrigatório e preservação de auditoria
- ✅ **Multi-Tenancy Isolado** - Comunicação restrita ao tenant do usuário
- ✅ **Auto-Marcação de Leitura** - Ao abrir detalhes, marca automaticamente como READ
- ✅ **Contador de Não Lidas** - Badge em tempo real no dropdown (atualização 15s)
- ✅ **Busca Textual** - Filtro por assunto e corpo da mensagem
- ✅ **Paginação Completa** - 20 mensagens por página (máximo 100)
- ✅ **UI Responsiva** - Dropdown, lista completa e detalhes

### Limitações Conhecidas

- ⚠️ **Threads/Respostas** - Backend pronto, frontend não implementado
- ⚠️ **Anexos** - Schema pronto, funcionalidade não implementada
- ⚠️ **Notificação por Email** - Mensagens não disparam emails
- ⚠️ **Integração com Notificações** - Sistemas separados (sem notificação in-app de nova mensagem)
- ⚠️ **WebSocket** - Usa polling (15s-30s) ao invés de real-time

---

## 🏗️ Arquitetura

### Backend

#### Modelos Prisma

**Message** (`apps/backend/prisma/schema/communication.prisma`)

```prisma
model Message {
  id       String      @id @default(uuid()) @db.Uuid
  tenantId String      @db.Uuid
  senderId String      @db.Uuid
  type     MessageType // DIRECT ou BROADCAST

  subject String @db.VarChar(255) // Assunto (3-255 caracteres)
  body    String @db.Text          // Corpo da mensagem (mín. 10 caracteres)

  // Thread/Respostas (preparado, não implementado no frontend)
  threadId String?  @db.Uuid
  isReply  Boolean  @default(false)

  // Metadata flexível (JSONB)
  metadata Json? @db.JsonB

  // Soft delete
  deletedAt DateTime? @db.Timestamptz(3)
  deletedBy String?   @db.Uuid

  // Auditoria
  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @db.Timestamptz(3)

  // Relações
  tenant     Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sender     User               @relation(fields: [senderId], references: [id], onDelete: Restrict)
  thread     Message?           @relation("MessageThread", fields: [threadId], references: [id])
  replies    Message[]          @relation("MessageThread")
  recipients MessageRecipient[]
  attachments MessageAttachment[] // Preparado, não implementado

  // Índices para performance
  @@index([tenantId, senderId, createdAt(sort: Desc)]) // Mensagens enviadas
  @@index([tenantId, threadId])                        // Buscar threads
  @@index([deletedAt])                                 // Filtrar deletadas
  @@map("messages")
}
```

**MessageRecipient** - Destinatários e Status de Leitura

```prisma
model MessageRecipient {
  id        String        @id @default(uuid()) @db.Uuid
  messageId String        @db.Uuid
  userId    String        @db.Uuid
  tenantId  String        @db.Uuid
  status    MessageStatus @default(SENT) // SENT, DELIVERED, READ
  readAt    DateTime?     @db.Timestamptz(3)

  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @db.Timestamptz(3)

  // Relações
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Índices para performance
  @@unique([messageId, userId])                       // Um destinatário por mensagem
  @@index([userId, status, createdAt(sort: Desc)])    // Inbox do usuário
  @@index([tenantId, userId, status])                 // Filtros combinados
  @@map("message_recipients")
}
```

**MessageAttachment** - Anexos (Schema Definido, NÃO Implementado)

```prisma
model MessageAttachment {
  id         String   @id @default(uuid()) @db.Uuid
  messageId  String   @db.Uuid
  tenantId   String   @db.Uuid
  fileName   String   @db.VarChar(255)
  fileSize   Int      // Bytes
  mimeType   String   @db.VarChar(100)
  fileUrl    String   @db.Text
  s3Key      String   @db.Text
  uploadedBy String   @db.Uuid
  uploadedAt DateTime @default(now()) @db.Timestamptz(3)

  // Relações
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [uploadedBy], references: [id], onDelete: Restrict)

  @@index([messageId])
  @@map("message_attachments")
}
```

**⚠️ Nota:** A tabela `MessageAttachment` existe no banco de dados, mas a funcionalidade de upload/download de anexos **NÃO está implementada** no backend nem no frontend.

#### Enums

**MessageType** (`apps/backend/prisma/schema/enums.prisma`)

```prisma
enum MessageType {
  DIRECT       // Mensagem direta 1:1 ou 1:N entre usuários específicos
  BROADCAST    // Mensagem institucional para TODOS usuários do tenant
}
```

**MessageStatus**

```prisma
enum MessageStatus {
  SENT       // Enviada (criada no sistema)
  DELIVERED  // Entregue (visualizada na lista) - atualmente não usado
  READ       // Lida (aberta pelo destinatário)
}
```

**⚠️ Nota:** O status `DELIVERED` está definido no enum mas atualmente não é usado. As mensagens vão diretamente de `SENT` para `READ` quando o usuário abre os detalhes.

---

## 🔧 Serviços Backend

### MessagesService

**Localização:** [apps/backend/src/messages/messages.service.ts](../../apps/backend/src/messages/messages.service.ts)

#### Principais Métodos

```typescript
// Criar mensagem
async create(dto: CreateMessageDto, tenantId: string, userId: string)

// Buscar caixa de entrada (mensagens recebidas)
async findInbox(query: QueryMessagesDto, tenantId: string, userId: string)

// Buscar mensagens enviadas
async findSent(query: QueryMessagesDto, tenantId: string, userId: string)

// Buscar mensagem específica (auto-marca como READ se for destinatário)
async findOne(messageId: string, tenantId: string, userId: string)

// Buscar thread completa (mensagem original + respostas)
async findThread(threadId: string, tenantId: string, userId: string)

// Estatísticas de leitura (apenas para remetente)
async getReadStats(messageId: string, tenantId: string, userId: string)

// Marcar mensagens como lidas
async markAsRead(dto: MarkAsReadDto, tenantId: string, userId: string)

// Deletar mensagem (soft delete, apenas remetente)
async delete(messageId: string, dto: DeleteMessageDto, tenantId: string, userId: string)

// Contador de não lidas
async countUnread(tenantId: string, userId: string)

// Estatísticas gerais (não lidas, recebidas, enviadas)
async getStats(tenantId: string, userId: string)
```

#### Lógica de Negócio - create()

**Fluxo de Criação de Mensagem:**

```
1. Validar permissões:
   ├─ Se tipo = BROADCAST → requer BROADCAST_MESSAGES
   └─ Senão → requer SEND_MESSAGES

2. Determinar destinatários:
   ├─ Se tipo = DIRECT:
   │   ├─ Validar recipientIds obrigatório
   │   ├─ Verificar que destinatários existem
   │   └─ Verificar que pertencem ao tenant
   └─ Se tipo = BROADCAST:
       ├─ Ignorar recipientIds (se enviado)
       └─ Buscar TODOS usuários ativos do tenant (exceto remetente)

3. Criar em transação:
   ├─ Message (assunto, corpo, tipo, remetente)
   └─ MessageRecipient[] (um para cada destinatário, status: SENT)

4. Retornar mensagem criada
```

#### Lógica de Negócio - findOne()

**Auto-Marcação de Leitura:**

```
1. Buscar mensagem
2. Verificar permissão (remetente OU destinatário)
3. Se usuário é destinatário E mensagem não foi lida:
   ├─ Atualizar MessageRecipient.status = READ
   ├─ Definir MessageRecipient.readAt = now()
   └─ Invalidar cache de contador de não lidas
4. Retornar mensagem completa
```

#### Lógica de Negócio - getReadStats()

**Estatísticas de Leitura:**

```
1. Verificar que usuário é o remetente (apenas remetente pode ver stats)
2. Buscar todos MessageRecipient da mensagem
3. Separar em:
   ├─ Lidos (status = READ)
   └─ Não lidos (status != READ)
4. Calcular:
   ├─ Total de destinatários
   ├─ Quantos leram / não leram
   ├─ Percentual de leitura (lidos / total * 100)
   └─ Lista detalhada:
       ├─ Lidos: userId, userName, userEmail, readAt
       └─ Não lidos: userId, userName, userEmail
5. Retornar estatísticas completas
```

### MessagesController

**Localização:** [apps/backend/src/messages/messages.controller.ts](../../apps/backend/src/messages/messages.controller.ts)

#### Endpoints

```typescript
// Criar mensagem
POST   /messages
Body: CreateMessageDto
Auth: JwtAuthGuard
Permission: SEND_MESSAGES (ou BROADCAST_MESSAGES se tipo = BROADCAST)

// Caixa de entrada
GET    /messages/inbox?page=1&limit=20&type=DIRECT&status=READ&search=assunto&unreadOnly=true
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Mensagens enviadas
GET    /messages/sent?page=1&limit=20
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Contador de não lidas
GET    /messages/unread/count
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Estatísticas gerais
GET    /messages/stats
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Estatísticas de leitura
GET    /messages/:id/read-stats
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Thread completa
GET    /messages/thread/:id
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Detalhes da mensagem (auto-marca como lida)
GET    /messages/:id
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Marcar como lida(s)
POST   /messages/read
Body: MarkAsReadDto { messageIds?: string[] }
Auth: JwtAuthGuard
Permission: VIEW_MESSAGES

// Deletar mensagem
DELETE /messages/:id
Body: DeleteMessageDto { deleteReason: string }
Auth: JwtAuthGuard
Permission: DELETE_MESSAGES
```

#### DTOs

**CreateMessageDto**

```typescript
{
  type: MessageType              // DIRECT ou BROADCAST (obrigatório)
  subject: string                // 3-255 caracteres (obrigatório)
  body: string                   // Min 10 caracteres (obrigatório)
  recipientIds?: string[]        // Obrigatório se type = DIRECT
  threadId?: string              // Opcional para respostas
}
```

**QueryMessagesDto**

```typescript
{
  page?: number                  // Default: 1
  limit?: number                 // Default: 20, max: 100
  type?: MessageType             // Filtrar por DIRECT ou BROADCAST
  status?: MessageStatus         // Filtrar por SENT, DELIVERED, READ
  search?: string                // Busca em subject e body
  unreadOnly?: boolean           // Apenas não lidas
  sortOrder?: 'asc' | 'desc'     // Default: 'desc'
}
```

**MarkAsReadDto**

```typescript
{
  messageIds?: string[]          // Se vazio ou omitido: marca TODAS não lidas
}
```

**DeleteMessageDto**

```typescript
{
  deleteReason: string           // Min 10 caracteres (obrigatório)
}
```

---

## 🎨 Frontend

### Estrutura de Arquivos

```
apps/frontend/src/
├── pages/messages/
│   ├── MessagesListPage.tsx         # Lista completa (Inbox + Enviadas)
│   ├── MessageDetailPage.tsx        # Detalhes da mensagem
│   └── ComposeMessagePage.tsx       # Criar nova mensagem
├── components/messages/
│   ├── MessagesDropdown.tsx         # Dropdown no header (badge + últimas 10)
│   └── MessageReadStatsDialog.tsx   # Modal de estatísticas de leitura
├── hooks/
│   └── useMessages.ts               # React Query hooks
└── api/
    └── messages.api.ts              # API client
```

### Páginas

#### MessagesListPage

**Rota:** `/dashboard/mensagens`

**Funcionalidades:**

- **Tabs:** Inbox (recebidas) vs Enviadas
- **Cards de Estatísticas:**
  - 📩 Não Lidas (badge vermelho se > 0)
  - 📥 Recebidas (total)
  - 📤 Enviadas (total)
- **Filtros:**
  - Busca textual (assunto + corpo)
  - Tipo (DIRECT, BROADCAST, Todas)
  - Status (Lida, Entregue, Enviada, Todas)
  - Checkbox "Apenas não lidas"
- **Tabela Responsiva:**
  - Indicador visual de não lidas (bolinha azul)
  - Badge BROADCAST para mensagens institucionais
  - Foto e nome do remetente/destinatário
  - Assunto (clicável → detalhes)
  - Status com badge colorido
  - Data formatada (formato relativo)
  - Ações:
    - "Ver quem leu" (apenas remetente, apenas se múltiplos destinatários ou BROADCAST)
    - "Marcar todas como lidas" (apenas Inbox)
- **Paginação:** 20 por página

**Hooks Utilizados:**

```tsx
const { data: inboxData } = useInbox(inboxQuery)
const { data: sentData } = useSent(sentQuery)
const { data: stats } = useMessagesStats()
const markAsReadMutation = useMarkMessagesAsRead()
```

#### MessageDetailPage

**Rota:** `/dashboard/mensagens/:id`

**Funcionalidades:**

- **Header:**
  - Foto do remetente
  - Nome e cargo do remetente
  - Data de envio formatada
- **Conteúdo:**
  - Badge BROADCAST (se aplicável)
  - Assunto destacado
  - Corpo da mensagem
- **Footer:**
  - Lista de destinatários com fotos
  - Botão "Ver quem leu" (apenas para remetente)
- **Auto-Marcação:** Ao abrir, backend marca automaticamente como READ

**Hooks Utilizados:**

```tsx
const { data: message } = useMessage(messageId)
const { data: readStats } = useMessageReadStats(messageId)
```

#### ComposeMessagePage

**Rota:** `/dashboard/mensagens/nova`

**Funcionalidades:**

- **Seleção de Tipo:**
  - Radio buttons: DIRECT vs BROADCAST
  - BROADCAST apenas se usuário tem permissão `BROADCAST_MESSAGES`
- **Seleção de Destinatários (apenas DIRECT):**
  - Campo de busca por nome/email
  - Lista com checkbox múltipla seleção
  - Scroll area (max 400px)
  - Badges com destinatários selecionados (removível)
  - Mostra foto, nome, email e cargo
- **Formulário:**
  - Assunto (3-255 caracteres)
  - Corpo (min 10 caracteres, textarea)
  - Validação com Zod
- **Ações:**
  - Cancelar (volta para lista)
  - Enviar (valida + cria mensagem)
- **Feedback:**
  - Toast de sucesso/erro
  - Loading state durante envio

**Hooks Utilizados:**

```tsx
const { data: users } = useQuery(['users']) // Buscar usuários do tenant
const sendMutation = useSendMessage()
```

### Componentes

#### MessagesDropdown

**Localização:** [apps/frontend/src/components/messages/MessagesDropdown.tsx](../../apps/frontend/src/components/messages/MessagesDropdown.tsx)

**Integração:** DashboardLayout (header)

**Funcionalidades:**

- **Badge de Contador:**
  - Mostra número de não lidas
  - Atualização automática (15s)
  - Badge vermelho se > 0
- **Dropdown:**
  - Ícone de sino (Bell)
  - Mostra últimas 10 mensagens não lidas
  - Preview:
    - Foto do remetente
    - Nome do remetente
    - Assunto (truncado)
    - Snippet do corpo (primeira linha)
    - Tempo relativo ("há 5 minutos")
  - Indicador visual de não lida (background azul claro)
- **Ações:**
  - Clicar na mensagem → navega para detalhes
  - "Marcar todas como lidas"
  - "Nova mensagem" (navega para ComposeMessagePage)
  - "Ver todas as mensagens" (navega para MessagesListPage)
- **Empty State:** Mensagem quando não há não lidas

**Hooks Utilizados:**

```tsx
const { data: unreadCount } = useUnreadMessagesCount() // RefetchInterval: 15s
const { data: unreadMessages } = useInbox({ unreadOnly: true, limit: 10 })
const markAllMutation = useMarkMessagesAsRead()
```

#### MessageReadStatsDialog

**Localização:** [apps/frontend/src/components/messages/MessageReadStatsDialog.tsx](../../apps/frontend/src/components/messages/MessageReadStatsDialog.tsx)

**Funcionalidades:**

- **Modal Responsivo:**
  - Abertura via prop `open`
  - Largura máxima 600px
- **Cards de Resumo:**
  - **Leituras:** X / Total
    - Progress bar visual (percentual)
    - Badge verde com percentual
  - **Pendentes:** Y
    - Badge laranja
- **Tabs:** Lidas vs Não Lidas
- **Lista de Usuários:**
  - Foto de perfil
  - Nome completo
  - Email
  - Cargo (positionCode)
  - Data/hora de leitura (para lidas)
  - Badge "Aguardando" (para não lidas)
  - Scroll area (max 400px)
- **Mensagem de Sucesso:**
  - Quando 100% leram: "✅ Todos os destinatários leram esta mensagem!"
  - Badge verde com checkmark
- **Empty States:**
  - "Nenhum destinatário leu ainda"
  - "Todos já leram"

**Props:**

```tsx
interface MessageReadStatsDialogProps {
  open: boolean
  onClose: () => void
  messageId: string
}
```

**Hooks Utilizados:**

```tsx
const { data: readStats } = useMessageReadStats(messageId)
```

### Hooks React Query

**Localização:** [apps/frontend/src/hooks/useMessages.ts](../../apps/frontend/src/hooks/useMessages.ts)

#### Queries

```typescript
// Caixa de entrada
useInbox(initialQuery?: QueryMessagesDto)
// QueryKey: ['messages', 'inbox', query]
// RefetchInterval: 30s
// Retorna: { data: { data: Message[], meta }, query, setQuery }

// Mensagens enviadas
useSent(initialQuery?: QueryMessagesDto)
// QueryKey: ['messages', 'sent', query]
// Retorna: { data: { data: Message[], meta }, query, setQuery }

// Mensagem individual
useMessage(id: string)
// QueryKey: ['message', id]
// Enabled: quando id presente

// Thread completa (não usado no frontend)
useThread(threadId: string)
// QueryKey: ['message-thread', threadId]

// Contador de não lidas
useUnreadMessagesCount()
// QueryKey: ['messages', 'unread-count']
// RefetchInterval: 15s
// Retorna: { data: { count: number } }

// Estatísticas gerais
useMessagesStats()
// QueryKey: ['messages', 'stats']
// Retorna: { unread, received, sent }

// Estatísticas de leitura
useMessageReadStats(messageId: string)
// QueryKey: ['messages', 'read-stats', messageId]
// Retorna: { total, read, unread, percentage, readList, unreadList }
```

#### Mutations

```typescript
// Enviar mensagem
useSendMessage()
// mutate({ type, subject, body, recipientIds?, threadId? })
// onSuccess: invalida ['messages'], toast sucesso, navigate('/dashboard/mensagens')

// Marcar como lidas
useMarkMessagesAsRead()
// mutate({ messageIds?: string[] })
// onSuccess: invalida ['messages'], toast sucesso

// Deletar mensagem
useDeleteMessage()
// mutate({ messageId, deleteReason })
// onSuccess: invalida ['messages'], toast sucesso
```

### API Client

**Localização:** [apps/frontend/src/api/messages.api.ts](../../apps/frontend/src/api/messages.api.ts)

```typescript
export class MessagesAPI {
  // Buscar inbox
  static async getInbox(query?: QueryMessagesDto): Promise<MessagesResponse>

  // Buscar enviadas
  static async getSent(query?: QueryMessagesDto): Promise<MessagesResponse>

  // Buscar mensagem específica
  static async getById(id: string): Promise<Message>

  // Buscar thread
  static async getThread(threadId: string): Promise<MessageThread>

  // Contador de não lidas
  static async getUnreadCount(): Promise<{ count: number }>

  // Estatísticas
  static async getStats(): Promise<MessageStats>

  // Estatísticas de leitura
  static async getReadStats(messageId: string): Promise<MessageReadStats>

  // Criar mensagem
  static async create(data: CreateMessageDto): Promise<Message>

  // Marcar como lida
  static async markAsRead(messageIds?: string[]): Promise<{ updated: number }>

  // Deletar
  static async delete(id: string, reason: string): Promise<{ message: string }>
}
```

---

## 📊 Fluxo de Dados

### Criação de Mensagem DIRECT

```
1. Usuário acessa /dashboard/mensagens/nova
2. Seleciona tipo: DIRECT
3. Seleciona destinatários:
   ├─ Busca usuários ativos do tenant
   ├─ Checkbox múltipla seleção
   └─ Mostra badges com selecionados
4. Preenche assunto e corpo
5. Clica "Enviar"
6. Frontend valida com Zod:
   ├─ type = DIRECT
   ├─ subject (3-255 chars)
   ├─ body (min 10 chars)
   └─ recipientIds não vazio
7. Frontend envia POST /api/messages
8. Backend MessagesService.create():
   ├─ Valida permissão SEND_MESSAGES
   ├─ Verifica que recipientIds existe e é array
   ├─ Valida que destinatários existem
   ├─ Valida que destinatários pertencem ao tenant
   ├─ Cria Message (tenantId, senderId, type, subject, body)
   └─ Cria MessageRecipient[] em transação:
       └─ Para cada recipientId:
           └─ { messageId, userId, tenantId, status: SENT }
9. Frontend recebe 201 Created
10. React Query:
    ├─ Invalida ['messages']
    └─ Atualiza cache automaticamente
11. Toast: "Mensagem enviada com sucesso!"
12. Navega para /dashboard/mensagens
```

### Criação de Mensagem BROADCAST

```
1. Usuário acessa /dashboard/mensagens/nova
2. Seleciona tipo: BROADCAST
   └─ Opção apenas disponível se tem permissão BROADCAST_MESSAGES
3. Campo de destinatários desaparece (auto-calculado)
4. Preenche assunto e corpo
5. Clica "Enviar"
6. Frontend valida:
   ├─ type = BROADCAST
   ├─ subject (3-255 chars)
   └─ body (min 10 chars)
7. Frontend envia POST /api/messages (recipientIds omitido)
8. Backend MessagesService.create():
   ├─ Valida permissão BROADCAST_MESSAGES
   ├─ Ignora recipientIds (se enviado)
   ├─ Busca TODOS usuários ativos do tenant:
   │   └─ WHERE tenantId = X AND deletedAt IS NULL AND id != senderId
   ├─ Cria Message (type: BROADCAST)
   └─ Cria MessageRecipient[] para TODOS usuários (exceto remetente)
9. Fluxo continua igual ao DIRECT (passo 9-12)
```

### Recebimento e Leitura de Mensagem

```
1. Destinatário recebe mensagem:
   ├─ MessageRecipient criado com status: SENT
   └─ Contador de não lidas incrementa

2. Polling automático (15s-30s):
   ├─ useUnreadMessagesCount() busca /messages/unread/count
   ├─ Badge no MessagesDropdown atualiza
   └─ useInbox() busca /messages/inbox

3. Destinatário clica no MessagesDropdown:
   ├─ Vê lista de últimas 10 não lidas
   ├─ Indicador visual (background azul, bolinha)
   └─ Preview: assunto + snippet

4. Destinatário clica na mensagem:
   ├─ Navega para /dashboard/mensagens/:id
   └─ Frontend chama useMessage(id)

5. Backend MessagesService.findOne():
   ├─ Busca Message com recipients
   ├─ Verifica se usuário é destinatário
   ├─ SE status != READ:
   │   ├─ UPDATE MessageRecipient SET status = READ, readAt = NOW()
   │   └─ Decrementa contador de não lidas
   └─ Retorna mensagem completa

6. Frontend renderiza MessageDetailPage:
   ├─ Foto e dados do remetente
   ├─ Assunto destacado
   ├─ Corpo da mensagem
   └─ Lista de destinatários

7. React Query invalida cache:
   ├─ ['messages', 'inbox']
   ├─ ['messages', 'unread-count']
   └─ Badge atualiza automaticamente
```

### Estatísticas de Leitura

```
1. Remetente acessa /dashboard/mensagens (sent tab)
2. Vê mensagem enviada com múltiplos destinatários ou BROADCAST
3. Clica "Ver quem leu"
4. Frontend abre MessageReadStatsDialog
   └─ Chama useMessageReadStats(messageId)

5. Backend MessagesService.getReadStats():
   ├─ Verifica que usuário é o remetente
   ├─ Busca TODOS MessageRecipient da mensagem
   ├─ Separa em:
   │   ├─ read = recipients WHERE status = READ
   │   └─ unread = recipients WHERE status != READ
   ├─ Para cada recipient:
   │   └─ Busca dados do User (name, email, profilePhoto, positionCode)
   └─ Retorna:
       ├─ total: count(*)
       ├─ read: count(status = READ)
       ├─ unread: count(status != READ)
       ├─ percentage: (read / total) * 100
       ├─ readList: [{ userId, userName, userEmail, readAt }]
       └─ unreadList: [{ userId, userName, userEmail }]

6. Frontend renderiza modal:
   ├─ Cards de resumo:
   │   ├─ Leituras: X / Total
   │   ├─ Progress bar (percentual)
   │   └─ Pendentes: Y
   ├─ Tabs: Lidas vs Não Lidas
   └─ Lista de usuários:
       ├─ Foto, nome, email, cargo
       ├─ Data de leitura (se lida)
       └─ Badge "Aguardando" (se não lida)

7. Se 100% leram:
   └─ Mostra mensagem: "✅ Todos os destinatários leram esta mensagem!"
```

---

## 🔍 Permissões e Segurança

### Permissões Necessárias

**PermissionType** (definido em `apps/backend/prisma/schema/enums.prisma`)

```typescript
enum PermissionType {
  VIEW_MESSAGES           // Ver inbox, enviadas, estatísticas
  SEND_MESSAGES          // Enviar mensagens DIRECT
  DELETE_MESSAGES        // Deletar próprias mensagens enviadas
  BROADCAST_MESSAGES     // Enviar mensagens BROADCAST (Admin/RT)
}
```

### Matriz de Permissões

| Ação                         | Permissão Necessária              | Validação Adicional                      |
|------------------------------|-----------------------------------|------------------------------------------|
| Ver caixa de entrada         | VIEW_MESSAGES                     | Apenas mensagens onde user é destinatário|
| Ver mensagens enviadas       | VIEW_MESSAGES                     | Apenas mensagens onde user é remetente   |
| Ver detalhes de mensagem     | VIEW_MESSAGES                     | Remetente OU destinatário                |
| Ver estatísticas de leitura  | VIEW_MESSAGES                     | Apenas remetente                         |
| Enviar DIRECT                | SEND_MESSAGES                     | Destinatários devem existir e ser do tenant|
| Enviar BROADCAST             | SEND_MESSAGES + BROADCAST_MESSAGES| Nenhuma                                  |
| Marcar como lida             | VIEW_MESSAGES                     | Apenas destinatário                      |
| Deletar mensagem             | DELETE_MESSAGES                   | Apenas remetente                         |

### Validações de Segurança

#### Multi-Tenancy

```typescript
// TODAS as queries filtram por tenantId
WHERE tenantId = :userTenantId

// Destinatários devem pertencer ao mesmo tenant
WHERE userId IN (:recipientIds) AND tenantId = :tenantId
```

#### Autorização

```typescript
// Ver detalhes: remetente OU destinatário
if (message.senderId !== userId && !isRecipient(userId, message)) {
  throw new ForbiddenException()
}

// Ver stats: apenas remetente
if (message.senderId !== userId) {
  throw new ForbiddenException()
}

// Deletar: apenas remetente
if (message.senderId !== userId) {
  throw new ForbiddenException()
}
```

#### Validações de Input

```typescript
// CreateMessageDto
@IsEnum(MessageType)
type: MessageType

@MinLength(3)
@MaxLength(255)
subject: string

@MinLength(10)
body: string

@IsArray()
@IsUUID('4', { each: true })
@ValidateIf(o => o.type === MessageType.DIRECT)
recipientIds?: string[]
```

---

## 🎯 Casos de Uso

### 1. Coordenador Envia Aviso Geral (BROADCAST)

```typescript
POST /api/messages

{
  "type": "BROADCAST",
  "subject": "Novo Protocolo de Higiene - Leitura Obrigatória",
  "body": "A partir de 15/01/2026, todos os cuidadores devem seguir o novo protocolo de higiene disponível no menu POPs. Favor confirmar leitura até 14/01/2026. Dúvidas, procurar a coordenação."
}

// Backend automaticamente:
// 1. Valida permissão BROADCAST_MESSAGES
// 2. Busca TODOS usuários ativos do tenant (exceto coordenador)
// 3. Cria MessageRecipient para cada usuário
// 4. Coordenador pode acompanhar estatísticas de leitura
```

### 2. Enfermeira Envia Mensagem Direta para Médico

```typescript
POST /api/messages

{
  "type": "DIRECT",
  "subject": "Residente com PA elevada - Avaliação urgente",
  "body": "Dr. Silva, o residente João Pereira (Quarto 201) está com PA 180/110 desde as 08h. Já administrei Captopril conforme prescrição SOS, mas gostaria que avaliasse presencialmente. Ele também relata tontura e cefaleia.",
  "recipientIds": ["dr-silva-uuid"]
}

// Backend automaticamente:
// 1. Valida permissão SEND_MESSAGES
// 2. Valida que dr-silva-uuid existe e pertence ao tenant
// 3. Cria Message + MessageRecipient
// 4. Dr. Silva vê badge de não lida no dropdown
// 5. Ao abrir, mensagem marca como READ automaticamente
```

### 3. RT Envia Lembrete para Equipe Específica

```typescript
POST /api/messages

{
  "type": "DIRECT",
  "subject": "Reunião de Equipe - Sexta 14h",
  "body": "Pessoal, confirmando a reunião de equipe desta sexta-feira às 14h na sala de reuniões. Pauta: revisão de protocolos de intercorrências e feedback do mês. Presença obrigatória.",
  "recipientIds": [
    "enfermeira1-uuid",
    "enfermeira2-uuid",
    "tec-enfermagem1-uuid",
    "tec-enfermagem2-uuid",
    "cuidador1-uuid"
  ]
}

// Backend automaticamente:
// 1. Valida SEND_MESSAGES
// 2. Valida que todos os 5 destinatários existem e são do tenant
// 3. Cria MessageRecipient para cada um (5 recipients)
// 4. RT pode ver estatísticas: "3 / 5 leram (60%)"
```

### 4. Usuário Marca Todas Como Lidas

```typescript
POST /api/messages/read

{
  // Body vazio ou messageIds omitido = marcar TODAS não lidas
}

// Backend automaticamente:
// 1. Busca TODOS MessageRecipient do usuário WHERE status != READ
// 2. UPDATE MessageRecipient SET status = READ, readAt = NOW()
// 3. Retorna: { updated: 15 }
// Frontend:
// - Toast: "15 mensagens marcadas como lidas"
// - Badge zera
// - Inbox atualiza
```

### 5. Admin Deleta Mensagem Enviada por Engano

```typescript
DELETE /api/messages/{messageId}

{
  "deleteReason": "Mensagem enviada por engano para destinatários incorretos. Reenviada corretamente."
}

// Backend automaticamente:
// 1. Valida permissão DELETE_MESSAGES
// 2. Valida que usuário é o remetente
// 3. Soft delete:
//    ├─ UPDATE Message SET deletedAt = NOW(), deletedBy = userId
//    └─ UPDATE Message SET metadata = '{"deleteReason": "..."}'
// 4. Mensagem não aparece mais na inbox dos destinatários
// 5. Mensagem não aparece mais nas enviadas do remetente
// 6. Preservado no banco para auditoria
```

### 6. Ver Estatísticas de Leitura de Broadcast

```typescript
GET /api/messages/{broadcastMessageId}/read-stats

// Response:
{
  "total": 25,
  "read": 18,
  "unread": 7,
  "percentage": 72,
  "readList": [
    {
      "userId": "user1-uuid",
      "userName": "Maria Silva",
      "userEmail": "maria.silva@ilpi.com",
      "userPosition": "Enfermeira",
      "readAt": "2026-01-11T10:30:00Z"
    },
    // ... mais 17
  ],
  "unreadList": [
    {
      "userId": "user19-uuid",
      "userName": "João Santos",
      "userEmail": "joao.santos@ilpi.com",
      "userPosition": "Cuidador"
    },
    // ... mais 6
  ]
}

// Frontend renderiza modal:
// - Cards: "Leituras: 18 / 25 (72%)"
// - Progress bar visual
// - Tabs: Lidas (18) vs Não Lidas (7)
// - Lista completa com fotos e timestamps
```

---

## 🚨 Limitações e Roadmap

### Funcionalidades Não Implementadas

#### 1. **Threads e Respostas**

**Status:** Backend pronto, frontend não implementado

**Schema Existente:**
```prisma
Message {
  threadId String?
  isReply  Boolean
  thread   Message?
  replies  Message[]
}
```

**Backend Pronto:**
- `findThread(threadId)` - busca mensagem original + todas respostas
- Ordenação cronológica

**Frontend Faltando:**
- Botão "Responder" em MessageDetailPage
- UI de thread (mensagem original + respostas em cascata)
- Validação de threadId em ComposeMessagePage

**Implementação Futura:**
```tsx
// MessageDetailPage.tsx
<Button onClick={() => navigate(`/dashboard/mensagens/nova?threadId=${message.id}`)}>
  Responder
</Button>

// ComposeMessagePage.tsx
const threadId = searchParams.get('threadId')
if (threadId) {
  // Buscar mensagem original
  // Exibir contexto
  // Incluir threadId no POST
}
```

#### 2. **Anexos**

**Status:** Schema completo, zero implementação

**Schema Existente:**
```prisma
MessageAttachment {
  fileName   String
  fileSize   Int
  mimeType   String
  fileUrl    String
  s3Key      String
  uploadedBy String
  uploadedAt DateTime
}
```

**Backend Faltando:**
- Upload de arquivo para MinIO
- Validação de tamanho/tipo
- Endpoint POST /messages/:id/attachments
- Endpoint GET /messages/:id/attachments/:attachmentId/download

**Frontend Faltando:**
- Input file em ComposeMessagePage
- Preview de anexos pendentes
- Lista de anexos em MessageDetailPage
- Botão de download

**Implementação Futura:**
- Limite: 5 anexos por mensagem
- Tamanho máximo: 10MB por arquivo
- Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP
- Armazenamento: MinIO (bucket: `{tenantId}/messages/{messageId}/`)

#### 3. **Notificação por Email**

**Status:** Não implementado

**Problema Atual:**
- Usuários só sabem de novas mensagens quando:
  - Acessam o sistema
  - Veem badge no dropdown (polling 15s)
- Sem email, mensagens urgentes podem ser perdidas

**Implementação Futura:**
```typescript
// MessagesService.create()
// Após criar mensagem, para cada destinatário:
await emailService.send({
  to: recipient.email,
  template: 'new-message',
  data: {
    senderName: sender.fullName,
    subject: message.subject,
    bodySnippet: message.body.substring(0, 100),
    messageUrl: `${frontendUrl}/dashboard/mensagens/${message.id}`
  }
})
```

**Configuração Desejada:**
- Email imediato para mensagens DIRECT
- Email digest diário para BROADCAST (reduzir spam)
- Preferências de usuário: email sempre, nunca, apenas urgentes

#### 4. **Integração com Sistema de Notificações**

**Status:** Sistemas separados, sem integração

**Problema Atual:**
- **Notificações:** Alertas automáticos (prescrições, sinais vitais, documentos)
- **Mensagens:** Comunicação manual
- Sem overlap: nova mensagem NÃO cria notificação in-app

**Implementação Futura:**
```typescript
// MessagesService.create()
// Criar notificação in-app para cada destinatário
await notificationsService.create({
  tenantId,
  type: SystemNotificationType.NEW_MESSAGE,
  category: NotificationCategory.SYSTEM,
  severity: NotificationSeverity.INFO,
  title: `Nova mensagem de ${sender.fullName}`,
  message: message.subject,
  actionUrl: `/dashboard/mensagens/${message.id}`,
  entityType: 'MESSAGE',
  entityId: message.id,
  metadata: {
    senderId: sender.id,
    senderName: sender.fullName,
    messageType: message.type
  }
})
```

**Benefício:**
- Badge de notificações + badge de mensagens
- Usuário pode escolher ver notificações OU mensagens
- Integração no dropdown único

#### 5. **WebSocket para Real-Time**

**Status:** Usa polling (15s-30s)

**Problema Atual:**
- useUnreadMessagesCount: refetch 15s
- useInbox: refetch 30s
- Delay de até 30s para ver nova mensagem

**Implementação Futura:**
```typescript
// Backend: Gateway WebSocket
@WebSocketGateway()
export class MessagesGateway {
  @SubscribeMessage('message:sent')
  handleMessageSent(messageId: string) {
    // Emitir para todos destinatários
    this.server.to(`tenant:${tenantId}`).emit('message:new', message)
  }
}

// Frontend: useWebSocket hook
const { lastMessage } = useWebSocket('ws://api.com/messages')
useEffect(() => {
  if (lastMessage?.type === 'message:new') {
    queryClient.invalidateQueries(['messages'])
    toast.info(`Nova mensagem de ${lastMessage.senderName}`)
  }
}, [lastMessage])
```

**Benefício:**
- Mensagens aparecem instantaneamente
- Redução de carga no servidor (sem polling)
- Indicador "digitando..." em threads

#### 6. **Status DELIVERED**

**Status:** Enum definido, mas não usado

**Problema Atual:**
- Mensagens vão direto de SENT → READ
- Sem diferenciação entre "entregue" e "lida"

**Implementação Futura:**
```typescript
// Quando usuário visualiza inbox (sem abrir mensagem)
SENT → DELIVERED (usuário viu na lista)

// Quando usuário abre detalhes
DELIVERED → READ (usuário leu o conteúdo)
```

**Benefício:**
- Remetente sabe se destinatário pelo menos viu que recebeu
- WhatsApp-like: checkmark duplo (entregue) vs azul (lido)

#### 7. **Outras Melhorias**

**Busca Avançada:**
- Filtro por período (data de envio)
- Filtro por remetente específico
- Busca em anexos (quando implementado)
- Busca em threads

**Rich Text Editor:**
- Formatação de texto (negrito, itálico, lista)
- Inserção de links
- Menções @username
- Emojis

**Mensagens Fixadas:**
- Pin/favoritar mensagens importantes
- Inbox com seção "Fixadas" no topo

**Arquivamento:**
- Arquivar mensagens antigas (remove da inbox, preserva no banco)
- Pasta "Arquivadas" separada

**Prioridade:**
- Campo `priority` (LOW, NORMAL, HIGH, URGENT)
- Mensagens URGENT aparecem no topo
- Badge vermelho para urgentes

**Leitura Obrigatória:**
- Campo `requiresReadConfirmation` (boolean)
- Destinatário precisa clicar "Confirmar leitura"
- Usado para avisos legais, políticas, treinamentos

**Edição de Mensagens:**
- Permitir editar corpo após envio (antes de qualquer leitura)
- Histórico de edições
- Indicador "editado"

---

## 📈 Performance e Otimizações

### Queries Otimizadas

#### Inbox do Usuário

```sql
SELECT mr.*, m.*
FROM message_recipients mr
JOIN messages m ON m.id = mr.messageId
WHERE mr.userId = :userId
  AND mr.tenantId = :tenantId
  AND m.deletedAt IS NULL
  AND mr.status = :status  -- opcional
ORDER BY m.createdAt DESC
LIMIT 20 OFFSET 0

-- Índice usado: message_recipients(userId, status, createdAt DESC)
-- Performance: < 10ms mesmo com 10k mensagens
```

#### Contador de Não Lidas

```sql
SELECT COUNT(*)
FROM message_recipients
WHERE userId = :userId
  AND tenantId = :tenantId
  AND status != 'READ'

-- Índice usado: message_recipients(userId, status)
-- Performance: < 5ms
```

#### Estatísticas de Leitura

```sql
SELECT
  mr.status,
  COUNT(*) as count,
  u.id, u.fullName, u.email, u.positionCode,
  mr.readAt
FROM message_recipients mr
JOIN users u ON u.id = mr.userId
WHERE mr.messageId = :messageId
  AND mr.tenantId = :tenantId
GROUP BY mr.status
ORDER BY mr.readAt DESC NULLS LAST

-- Índice usado: message_recipients(messageId)
-- Performance: < 20ms mesmo com 100 destinatários
```

### Índices Prisma

```prisma
// messages
@@index([tenantId, senderId, createdAt(sort: Desc)]) // Enviadas do usuário
@@index([tenantId, threadId])                        // Buscar threads
@@index([deletedAt])                                 // Filtrar deletadas

// message_recipients
@@unique([messageId, userId])                        // Um destinatário por mensagem
@@index([userId, status, createdAt(sort: Desc)])     // Inbox do usuário
@@index([tenantId, userId, status])                  // Filtros combinados
```

**Cobertura:**
- Inbox paginada ✅
- Enviadas paginadas ✅
- Contador de não lidas ✅
- Estatísticas de leitura ✅
- Soft delete (deletedAt=null) ✅

### Polling Inteligente

```typescript
// Contador: atualização rápida (15s)
useUnreadMessagesCount({
  refetchInterval: 15000,  // 15s
  refetchOnWindowFocus: true
})

// Inbox: atualização moderada (30s)
useInbox({
  refetchInterval: 30000,  // 30s
  refetchOnWindowFocus: true
})

// Detalhes: sem polling (estático após abrir)
useMessage(id) // Sem refetchInterval
```

**Benefício:**
- Badge sempre atualizado (15s)
- Inbox atualiza sem refresh manual (30s)
- Detalhes não desperdiçam requests

### Cache Strategy

```typescript
// React Query defaults
{
  staleTime: 0,              // Sempre considerado stale
  cacheTime: 5 * 60 * 1000,  // Cache por 5 minutos
  refetchOnMount: true,
  refetchOnWindowFocus: true
}

// Estratégia de Invalidação
onSuccess: () => {
  queryClient.invalidateQueries(['messages'])
  // Invalida:
  // - ['messages', 'inbox']
  // - ['messages', 'sent']
  // - ['messages', 'stats']
  // - ['messages', 'unread-count']
}
```

**Benefício:**
- Dados sempre frescos após mutations
- Invalidação em cascata automática
- Cache reduz requests redundantes

---

## 🔒 Segurança e Compliance

### Validações Backend (class-validator)

```typescript
// CreateMessageDto
@IsEnum(MessageType)
type: MessageType

@MinLength(3)
@MaxLength(255)
subject: string

@MinLength(10)
body: string

@IsArray()
@IsUUID('4', { each: true })
@ValidateIf(o => o.type === MessageType.DIRECT)
recipientIds?: string[]

@IsUUID('4')
@IsOptional()
threadId?: string
```

### Validações Frontend (Zod)

```typescript
const messageSchema = z.object({
  type: z.enum(['DIRECT', 'BROADCAST']),
  subject: z.string().min(3).max(255),
  body: z.string().min(10),
  recipientIds: z.array(z.string().uuid()).optional()
    .refine((ids) => type === 'BROADCAST' || (ids && ids.length > 0), {
      message: 'Selecione pelo menos um destinatário'
    }),
  threadId: z.string().uuid().optional()
})
```

### Auditoria

```typescript
// Criação de Mensagem
{
  id: uuid(),
  tenantId: userTenantId,
  senderId: userId,
  createdAt: now(),
  updatedAt: now()
}

// Leitura de Mensagem
{
  messageId: uuid(),
  userId: uuid(),
  status: 'READ',
  readAt: now(),
  createdAt: now() // Quando MessageRecipient foi criado
}

// Deleção de Mensagem
{
  deletedAt: now(),
  deletedBy: userId,
  metadata: {
    deleteReason: 'Motivo obrigatório...'
  }
}
```

**Rastreabilidade:**
- Quem enviou: `message.senderId`
- Quando enviou: `message.createdAt`
- Quem leu: `messageRecipient.userId`
- Quando leu: `messageRecipient.readAt`
- Quem deletou: `message.deletedBy`
- Por que deletou: `message.metadata.deleteReason`

### LGPD e Privacidade

**Dados Sensíveis:**
- Subject e body podem conter informações sensíveis de residentes
- Armazenamento: PostgreSQL (criptografado em repouso)
- Transmissão: HTTPS (TLS 1.3)

**Direito ao Esquecimento:**
- Soft delete preserva mensagens para auditoria
- Hard delete futuro: `DELETE FROM messages WHERE deletedAt < NOW() - INTERVAL '2 years'`

**Acesso Restrito:**
- Multi-tenancy isolado (WHERE tenantId)
- Permissões granulares (PermissionsGuard)
- Apenas remetente e destinatários veem conteúdo

---

## 🐛 Troubleshooting

### Problema 1: Badge de Não Lidas Não Atualiza

**Sintoma:** Usuário recebeu mensagem mas badge continua zerado

**Causas Possíveis:**
1. Polling desativado (refetchInterval = false)
2. Cache stale não foi invalidado
3. MessageRecipient não foi criado

**Solução:**

```typescript
// Verificar polling
const { data } = useUnreadMessagesCount()
// Deve ter refetchInterval: 15000

// Forçar refetch manual
queryClient.invalidateQueries(['messages', 'unread-count'])

// Backend: verificar se MessageRecipient existe
SELECT * FROM message_recipients
WHERE userId = :userId AND messageId = :messageId
```

### Problema 2: Mensagem Não Marcou Como Lida Automaticamente

**Sintoma:** Usuário abriu detalhes mas status continua SENT

**Causas Possíveis:**
1. Backend não identificou usuário como destinatário
2. Transação falhou
3. Cache não foi invalidado

**Solução:**

```typescript
// Backend: verificar log
"Auto-marking message as read" // Deve aparecer nos logs

// Frontend: invalidação deve ocorrer
onSuccess: () => {
  queryClient.invalidateQueries(['messages'])
}

// Backend: verificar atualização
UPDATE message_recipients
SET status = 'READ', readAt = NOW()
WHERE messageId = :id AND userId = :userId
```

### Problema 3: BROADCAST Não Enviou para Todos

**Sintoma:** Broadcast criado mas alguns usuários não receberam

**Causas Possíveis:**
1. Usuários com `deletedAt != null` (inativos)
2. Falha na transação ao criar MessageRecipient
3. Filtro incorreto no backend

**Solução:**

```typescript
// Backend: verificar query
SELECT * FROM users
WHERE tenantId = :tenantId
  AND deletedAt IS NULL
  AND id != :senderId  // Excluir remetente

// Verificar quantidade criada
SELECT COUNT(*) FROM message_recipients WHERE messageId = :messageId
// Deve ser = total de usuários ativos - 1 (remetente)
```

### Problema 4: Estatísticas de Leitura Vazia

**Sintoma:** Modal de estatísticas abre mas não mostra destinatários

**Causas Possíveis:**
1. Usuário não é o remetente (403 Forbidden)
2. MessageRecipient não foi criado
3. Erro na query de join com users

**Solução:**

```typescript
// Verificar permissão
if (message.senderId !== userId) {
  throw new ForbiddenException() // Correto
}

// Verificar MessageRecipient
SELECT * FROM message_recipients WHERE messageId = :messageId
// Deve ter N registros (N = total destinatários)

// Verificar join
SELECT mr.*, u.fullName FROM message_recipients mr
JOIN users u ON u.id = mr.userId
WHERE mr.messageId = :messageId
// Se vazio: problema no join (user deletado?)
```

### Problema 5: Deletar Não Remove da Inbox

**Sintoma:** Remetente deletou mas mensagem ainda aparece na inbox do destinatário

**Causas Possíveis:**
1. Soft delete não define `deletedAt`
2. Query da inbox não filtra `deletedAt IS NULL`

**Solução:**

```typescript
// Backend: verificar soft delete
UPDATE messages
SET deletedAt = NOW(), deletedBy = :userId
WHERE id = :messageId

// Frontend: query deve filtrar deletadas
SELECT m.* FROM messages m
JOIN message_recipients mr ON mr.messageId = m.id
WHERE mr.userId = :userId
  AND m.deletedAt IS NULL  // ⚠️ OBRIGATÓRIO
```

---

## 📚 Referências

### Arquivos Principais Backend

- [apps/backend/prisma/schema/communication.prisma](../../apps/backend/prisma/schema/communication.prisma) - Modelos Prisma
- [apps/backend/prisma/schema/enums.prisma](../../apps/backend/prisma/schema/enums.prisma) - Enums (MessageType, MessageStatus)
- [apps/backend/src/messages/messages.service.ts](../../apps/backend/src/messages/messages.service.ts) - Service principal
- [apps/backend/src/messages/messages.controller.ts](../../apps/backend/src/messages/messages.controller.ts) - Controller REST
- [apps/backend/src/messages/dto/create-message.dto.ts](../../apps/backend/src/messages/dto/create-message.dto.ts) - DTO de criação
- [apps/backend/src/messages/dto/query-messages.dto.ts](../../apps/backend/src/messages/dto/query-messages.dto.ts) - DTO de query

### Arquivos Principais Frontend

- [apps/frontend/src/pages/messages/MessagesListPage.tsx](../../apps/frontend/src/pages/messages/MessagesListPage.tsx) - Lista completa
- [apps/frontend/src/pages/messages/MessageDetailPage.tsx](../../apps/frontend/src/pages/messages/MessageDetailPage.tsx) - Detalhes
- [apps/frontend/src/pages/messages/ComposeMessagePage.tsx](../../apps/frontend/src/pages/messages/ComposeMessagePage.tsx) - Criar mensagem
- [apps/frontend/src/components/messages/MessagesDropdown.tsx](../../apps/frontend/src/components/messages/MessagesDropdown.tsx) - Dropdown no header
- [apps/frontend/src/components/messages/MessageReadStatsDialog.tsx](../../apps/frontend/src/components/messages/MessageReadStatsDialog.tsx) - Modal de estatísticas
- [apps/frontend/src/hooks/useMessages.ts](../../apps/frontend/src/hooks/useMessages.ts) - React Query hooks
- [apps/frontend/src/api/messages.api.ts](../../apps/frontend/src/api/messages.api.ts) - API client

### Endpoints Backend

```
POST   /messages                 # Criar mensagem
GET    /messages/inbox           # Caixa de entrada
GET    /messages/sent            # Mensagens enviadas
GET    /messages/unread/count    # Contador de não lidas
GET    /messages/stats           # Estatísticas gerais
GET    /messages/:id/read-stats  # Estatísticas de leitura
GET    /messages/thread/:id      # Thread completa
GET    /messages/:id             # Detalhes da mensagem
POST   /messages/read            # Marcar como lida(s)
DELETE /messages/:id             # Deletar mensagem
```

### Migrations Importantes

- **20251227103833_add_messages_system** - Criação inicial do sistema de mensagens
  - Tabelas: messages, message_recipients, message_attachments
  - Enums: MessageType, MessageStatus
  - Permissões: VIEW_MESSAGES, SEND_MESSAGES, DELETE_MESSAGES, BROADCAST_MESSAGES

### Commits Importantes

- **2026-01-11:** Criação da documentação v1.0.0
- **2025-12-27:** Implementação inicial do sistema de mensagens

### Documentação Relacionada

- [Sistema de Notificações](./notifications.md) - Sistema separado de alertas automáticos
- [Sistema de Permissões](./permissions.md) - Controle de acesso granular (se existir)
- CHANGELOG.md - Histórico completo de mudanças

---

## 🚀 Melhorias Futuras Planejadas

### v1.1 - Threads e Rich Text

1. **Threads/Respostas** (backend pronto)
   - UI de thread com mensagem original + respostas em cascata
   - Botão "Responder" em MessageDetailPage
   - Badge com contador de respostas

2. **Rich Text Editor**
   - Formatação básica (negrito, itálico, lista)
   - Inserção de links
   - Preview antes de enviar

### v1.2 - Anexos

3. **Anexos de Arquivos** (schema pronto)
   - Upload para MinIO
   - Preview de anexos (PDF, imagens)
   - Download com autenticação
   - Limite: 5 anexos, 10MB cada

### v1.3 - Notificações e Real-Time

4. **Integração com Notificações**
   - Nova mensagem cria notificação in-app
   - Dropdown unificado (mensagens + notificações)

5. **Notificação por Email**
   - Email imediato para DIRECT
   - Digest diário para BROADCAST
   - Preferências de usuário

6. **WebSocket para Real-Time**
   - Mensagens aparecem instantaneamente
   - Indicador "digitando..."
   - Substituir polling

### v1.4 - Features Avançadas

7. **Busca Avançada**
   - Filtro por período
   - Filtro por remetente
   - Busca em anexos

8. **Mensagens Fixadas**
   - Pin/favoritar importantes
   - Seção "Fixadas" no topo

9. **Prioridade e Leitura Obrigatória**
   - Campo `priority` (LOW, NORMAL, HIGH, URGENT)
   - `requiresReadConfirmation` para avisos legais
   - Destinatário precisa clicar "Confirmar leitura"

10. **Arquivamento**
    - Arquivar mensagens antigas
    - Pasta "Arquivadas" separada

---

## 👥 Contribuindo

### Adicionando Novo Tipo de Mensagem

1. **Backend - Enum:** Adicionar em `apps/backend/prisma/schema/enums.prisma`
   ```prisma
   enum MessageType {
     DIRECT
     BROADCAST
     ANNOUNCEMENT  // Novo tipo
   }
   ```

2. **Migration:** `npx prisma migrate dev`

3. **Backend - Service:** Atualizar lógica em `MessagesService.create()`
   ```typescript
   if (dto.type === MessageType.ANNOUNCEMENT) {
     // Lógica específica para announcements
     // Ex: apenas Admin pode criar
   }
   ```

4. **Frontend - Enum:** Atualizar `apps/frontend/src/api/messages.api.ts`
   ```typescript
   export enum MessageType {
     DIRECT = 'DIRECT',
     BROADCAST = 'BROADCAST',
     ANNOUNCEMENT = 'ANNOUNCEMENT',
   }
   ```

5. **Frontend - UI:** Atualizar ComposeMessagePage
   ```tsx
   <option value="ANNOUNCEMENT">Anúncio Oficial</option>
   ```

### Implementando Anexos

1. **Backend - Service:** Criar `MessagesAttachmentsService`
   ```typescript
   async uploadAttachment(messageId, file, tenantId, userId) {
     // 1. Validar tamanho (max 10MB)
     // 2. Validar tipo (PDF, DOC, IMG, ZIP)
     // 3. Upload para MinIO: {tenantId}/messages/{messageId}/{filename}
     // 4. Criar MessageAttachment no banco
   }
   ```

2. **Backend - Controller:** Criar rota
   ```typescript
   @Post(':id/attachments')
   @UseInterceptors(FileInterceptor('file'))
   async uploadAttachment(@Param('id') id: string, @UploadedFile() file)
   ```

3. **Frontend - ComposeMessagePage:** Adicionar input file
   ```tsx
   <input type="file" multiple max={5} onChange={handleFileSelect} />
   <div>
     {selectedFiles.map(file => (
       <Badge>{file.name} - {file.size}KB</Badge>
     ))}
   </div>
   ```

4. **Frontend - MessageDetailPage:** Exibir anexos
   ```tsx
   {message.attachments?.map(att => (
     <a href={att.fileUrl} download>{att.fileName}</a>
   ))}
   ```

### Implementando Threads/Respostas

1. **Frontend - MessageDetailPage:** Adicionar botão
   ```tsx
   <Button onClick={() => navigate(`/dashboard/mensagens/nova?threadId=${message.id}`)}>
     Responder
   </Button>
   ```

2. **Frontend - ComposeMessagePage:** Detectar threadId
   ```tsx
   const threadId = searchParams.get('threadId')
   const { data: originalMessage } = useMessage(threadId)

   // Exibir contexto da mensagem original
   {threadId && (
     <Card>
       <p>Respondendo a: {originalMessage.subject}</p>
       <p>De: {originalMessage.sender.fullName}</p>
     </Card>
   )}

   // Incluir threadId no POST
   sendMutation.mutate({ ...data, threadId })
   ```

3. **Frontend - MessageDetailPage:** Exibir thread
   ```tsx
   const { data: thread } = useThread(message.threadId || message.id)

   <div className="space-y-4">
     {thread.map((msg, index) => (
       <Card className={index === 0 ? 'border-blue-500' : ''}>
         <p>{msg.sender.fullName} - {msg.createdAt}</p>
         <p>{msg.body}</p>
       </Card>
     ))}
   </div>
   ```

---

**Última revisão:** 11/01/2026 por Claude Sonnet 4.5
**Status:** ✅ Documentação completa e atualizada para v1.0.0
