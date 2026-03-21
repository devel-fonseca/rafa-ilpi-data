# Sistema de Gestão de Leitos - RAFA ILPI Data

**Data:** 2026-01-14
**Responsável:** Dr. E. (Emanuel)
**Versão:** 2.0

---

## 1. Resumo Executivo

O **Sistema de Gestão de Leitos** é um módulo completo do RAFA ILPI Data que permite o gerenciamento hierárquico da estrutura física da instituição, o mapeamento da ocupação de leitos por residentes, e operações avançadas de gestão com auditoria completa.

### Objetivo

Mapear, controlar e auditar a ocupação de leitos organizados em uma hierarquia de 4 níveis:
- **Prédios** (Buildings)
- **Andares/Alas** (Floors)
- **Quartos** (Rooms)
- **Leitos** (Beds)

### Principais Funcionalidades

**Estrutura Física:**
- CRUD completo para Prédios, Andares, Quartos e Leitos
- Gerador automático de estrutura completa
- Hierarquia validada (não permite exclusão com dependências)

**Visualização:**
- Mapa visual hierárquico com navegação por Accordion
- Estatísticas em tempo real de ocupação
- Sistema de cores por status (verde/vermelho/laranja/roxo)
- Drag-and-drop para transferência de residentes

**Gestão de Leitos:**
- Controle de status (Disponível, Ocupado, Manutenção, Reservado)
- Operações: Reservar, Bloquear, Liberar, Transferir
- Designação e remoção de residentes
- Histórico completo de mudanças de status
- Histórico específico de transferências

**Auditoria:**
- Rastreabilidade completa em `bed_status_history`
- Registro de todas ocupações e liberações
- Motivos obrigatórios para todas operações
- Identificação do usuário responsável
- Timestamps precisos (timestamptz)

---

## 2. Arquitetura

### 2.1 Backend (NestJS)

O backend possui 5 módulos principais:

```
apps/backend/src/
├── buildings/          # Módulo de Prédios
│   ├── buildings.controller.ts
│   ├── buildings.service.ts
│   ├── buildings.module.ts
│   └── dto/
│       ├── create-building.dto.ts
│       ├── update-building.dto.ts
│       └── create-structure.dto.ts
│
├── floors/             # Módulo de Andares
│   ├── floors.controller.ts
│   ├── floors.service.ts
│   ├── floors.module.ts
│   └── dto/
│
├── rooms/              # Módulo de Quartos
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   ├── rooms.module.ts
│   └── dto/
│
├── beds/               # Módulo de Leitos
│   ├── beds.controller.ts
│   ├── beds.service.ts
│   ├── beds.module.ts
│   └── dto/
│       ├── create-bed.dto.ts
│       ├── update-bed.dto.ts
│       ├── reserve-bed.dto.ts
│       ├── block-bed.dto.ts
│       └── release-bed.dto.ts
│
└── residents/          # Transferências de Leitos
    ├── residents.controller.ts
    ├── residents.service.ts
    └── dto/
        └── transfer-bed.dto.ts
```

### 2.2 Frontend (React + TypeScript)

```
apps/frontend/src/
├── api/
│   └── beds.api.ts                    # API Client TypeScript
│
├── hooks/
│   ├── useBuildings.ts
│   ├── useFloors.ts
│   ├── useRooms.ts
│   ├── useBeds.ts
│   ├── useBedsMap.ts
│   └── useBedOperations.ts            # Hook para Reservar/Bloquear/Liberar
│
├── components/beds/
│   ├── BuildingCard.tsx
│   ├── FloorCard.tsx
│   ├── RoomCard.tsx
│   ├── BedCard.tsx
│   ├── BuildingForm.tsx
│   ├── FloorForm.tsx
│   ├── RoomForm.tsx
│   ├── BedForm.tsx
│   ├── OccupancyStats.tsx             # Estatísticas do mapa
│   ├── BedsStatsCards.tsx             # Estatísticas do hub
│   ├── BedsMapVisualization.tsx       # Mapa com drag-and-drop
│   ├── TransferBedModal.tsx           # Modal de transferência
│   ├── SelectBedModal.tsx             # Seleção de leito destino
│   ├── ReserveBedModal.tsx            # Reservar leito
│   ├── BlockBedModal.tsx              # Bloquear para manutenção
│   ├── ReleaseBedModal.tsx            # Liberar leito
│   └── BuildingStructureGenerator.tsx # Gerador automático
│
└── pages/
    ├── beds/
    │   ├── BedsStructurePage.tsx      # CRUD da estrutura
    │   └── BedsMapPage.tsx            # Mapa de ocupação
    └── beds-management/
        └── BedsManagementHub.tsx      # Hub de gestão
```

### 2.3 Banco de Dados (Prisma)

Schema atualizado com tabelas de auditoria:

```prisma
model Building {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  name        String    @db.VarChar(100)
  code        String?   @db.VarChar(50)
  description String?   @db.Text
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt   DateTime? @db.Timestamptz(3)

  tenant Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  floors Floor[]

  // Unicidade entre registros ativos via partial unique index na migration
  @@index([tenantId])
  @@map("building")
}

model Floor {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  buildingId  String    @db.Uuid
  name        String    @db.VarChar(100)
  code        String?   @db.VarChar(50)
  orderIndex  Int       // Ordenação crescente
  description String?   @db.Text
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt   DateTime? @db.Timestamptz(3)

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  rooms    Room[]

  // Unicidade entre registros ativos via partial unique index na migration
  @@index([tenantId])
  @@index([buildingId])
  @@map("floor")
}

model Room {
  id                    String             @id @default(uuid()) @db.Uuid
  tenantId              String             @db.Uuid
  floorId               String             @db.Uuid
  name                  String             @db.VarChar(100)
  code                  String?            @db.VarChar(50)
  roomNumber            String?            @db.VarChar(20)
  capacity              Int                @default(0) // Calculado automaticamente
  roomType              RoomType?
  genderRestriction     String?            @db.VarChar(1) // "M", "F", ou null
  hasBathroom           Boolean            @default(false)
  hasPrivateBathroom    Boolean            @default(false)
  accessible            Boolean            @default(false)
  observations          String?            @db.Text
  notes                 String?            @db.Text
  isActive              Boolean            @default(true)
  createdAt             DateTime           @default(now()) @db.Timestamptz(3)
  updatedAt             DateTime           @updatedAt @db.Timestamptz(3)
  deletedAt             DateTime?          @db.Timestamptz(3)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  floor  Floor  @relation(fields: [floorId], references: [id], onDelete: Cascade)
  beds   Bed[]

  // Unicidade entre registros ativos via partial unique index na migration
  @@index([tenantId])
  @@index([floorId])
  @@map("room")
}

model Bed {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  roomId    String    @db.Uuid
  code      String    @db.VarChar(50)
  status    String    @default("Disponível") @db.VarChar(50)
  notes     String?   @db.Text
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  tenant             Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  room               Room                  @relation(fields: [roomId], references: [id], onDelete: Cascade)
  resident           Resident?             @relation("BedResident")
  transfersFrom      BedTransferHistory[]  @relation("FromBed")
  transfersTo        BedTransferHistory[]  @relation("ToBed")
  statusHistory      BedStatusHistory[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([roomId])
  @@index([status])
  @@map("bed")
}

> Observação: para `Building`, `Floor` e `Room`, a implementação final usa índices únicos parciais em SQL (`deletedAt IS NULL`) para preservar o comportamento de soft delete. Para `Bed`, a unicidade global por tenant foi mantida, e o schema hardening adicional adiciona check constraint para `status`.

model BedTransferHistory {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  residentId    String   @db.Uuid
  fromBedId     String   @db.Uuid
  toBedId       String   @db.Uuid
  reason        String   @db.Text
  transferredAt DateTime @default(now()) @db.Timestamptz(3)
  transferredBy String   @db.Uuid
  createdAt     DateTime @default(now()) @db.Timestamptz(3)
  deletedAt     DateTime? @db.Timestamptz(3)

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  fromBed  Bed      @relation("FromBed", fields: [fromBedId], references: [id], onDelete: Cascade)
  toBed    Bed      @relation("ToBed", fields: [toBedId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [transferredBy], references: [id], onDelete: Restrict)

  @@index([residentId, transferredAt(sort: Desc)])
  @@index([fromBedId, transferredAt(sort: Desc)])
  @@index([toBedId, transferredAt(sort: Desc)])
  @@index([tenantId, transferredAt(sort: Desc)])
  @@map("bed_transfer_history")
}

model BedStatusHistory {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @db.Uuid
  bedId          String   @db.Uuid
  previousStatus String   @db.VarChar(50)
  newStatus      String   @db.VarChar(50)
  reason         String?  @db.Text
  metadata       Json?
  changedBy      String   @db.Uuid
  changedAt      DateTime @default(now()) @db.Timestamptz(3)
  createdAt      DateTime @default(now()) @db.Timestamptz(3)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  bed    Bed    @relation(fields: [bedId], references: [id], onDelete: Cascade)

  @@index([bedId, changedAt(sort: Desc)])
  @@index([tenantId, changedAt(sort: Desc)])
  @@index([tenantId, bedId])
  @@map("bed_status_history")
}

enum RoomType {
  Coletivo
  Suite
  Enfermaria
  Individual
  Duplo
  Triplo
}
```

---

## 3. Módulos e Páginas

### 3.1 Estrutura de Leitos
**URL:** `/dashboard/beds/structure`

**Funcionalidades:**
- CRUD completo em tabs (Prédios, Andares, Quartos, Leitos)
- Filtros por hierarquia
- Busca por nome/código
- Gerador automático de estrutura
- Cards com estatísticas individuais
- Validação de cascata (não permite deletar com dependências)

**Permissões:**
- `VIEW_BEDS` - Visualizar
- `MANAGE_INFRASTRUCTURE` - Criar/Editar/Deletar

### 3.2 Mapa de Ocupação
**URL:** `/dashboard/beds/map`

**Funcionalidades:**
- Visualização hierárquica completa (Building → Floor → Room → Bed)
- Estatísticas de ocupação em tempo real
- **Drag-and-drop** para transferência de residentes
- Status visual de cada leito
- Expansão automática durante drag
- Modal de confirmação com motivo obrigatório (min 10 chars)

**Status de Leitos:**
- 🟢 **Disponível** - Livre para ocupação
- 🔵 **Ocupado** - Com residente atribuído
- 🟠 **Manutenção** - Bloqueado para reparos
- 🟣 **Reservado** - Reservado para futuro residente

**Permissões:**
- `VIEW_BEDS` - Visualizar mapa
- `UPDATE_RESIDENTS` - Transferir residentes

### 3.3 Hub de Gestão de Leitos
**URL:** `/dashboard/beds-management`

**Funcionalidades:**
- **Cards de Estatísticas:**
  - Total de Leitos
  - Ocupados
  - Disponíveis
  - Em Manutenção
  - Reservados

- **Ações Rápidas:**
  - 🔄 **Transferir Leito** - Mover residente entre leitos
  - 📅 **Reservar Leito** - Reservar para futuro residente
  - 🔧 **Bloquear para Manutenção** - Indisponibilizar leito
  - ✅ **Liberar Leito** - Disponibilizar leito bloqueado/reservado

- **Histórico Recente:**
  - Últimas 10 movimentações
  - Status, datas, usuários responsáveis

**Permissões:**
- `VIEW_BEDS` - Visualizar hub
- `MANAGE_INFRASTRUCTURE` - Executar operações

---

## 4. Operações de Gestão

### 4.1 Reserva de Leito

**Endpoint:** `POST /beds/:id/reserve`

**DTO:**
```typescript
{
  futureResidentName?: string,      // Opcional
  expectedAdmissionDate?: string,   // Opcional (ISO 8601)
  notes?: string                    // Opcional, min 10 chars se fornecido
}
```

**Fluxo:**
1. Validar que leito está Disponível
2. Atualizar `bed.status` → "Reservado"
3. Atualizar `bed.notes` com informações
4. Criar registro em `bed_status_history`:
   - `previousStatus`: "Disponível"
   - `newStatus`: "Reservado"
   - `reason`: Motivo gerado automaticamente
   - `metadata`: `{ futureResidentName, expectedAdmissionDate }`

**Auditoria:** ✅ Registrado em `bed_status_history`

### 4.2 Bloqueio para Manutenção

**Endpoint:** `POST /beds/:id/block`

**DTO:**
```typescript
{
  reason: string,                 // Obrigatório, min 10 chars
  expectedReleaseDate?: string    // Opcional (ISO 8601)
}
```

**Fluxo:**
1. Validar que leito NÃO está Ocupado
2. Atualizar `bed.status` → "Manutenção"
3. Atualizar `bed.notes` com motivo e previsão
4. Criar registro em `bed_status_history`

**Restrição:** ❌ Não pode bloquear leito ocupado

**Auditoria:** ✅ Registrado em `bed_status_history`

### 4.3 Liberação de Leito

**Endpoint:** `POST /beds/:id/release`

**DTO:**
```typescript
{
  reason?: string  // Opcional
}
```

**Fluxo:**
1. Validar que leito está em "Manutenção" ou "Reservado"
2. Atualizar `bed.status` → "Disponível"
3. Limpar `bed.notes`
4. Criar registro em `bed_status_history`

**Auditoria:** ✅ Registrado em `bed_status_history`

### 4.4 Designação de Leito (Cadastro/Edição de Residente)

**Cenários:**

#### A. Cadastro Inicial com Leito
**Endpoint:** `POST /residents`

**Fluxo:**
1. Criar residente com `bedId` opcional
2. Se `bedId` fornecido:
   - Atualizar `bed.status` → "Ocupado"
   - Criar registro em `bed_status_history`:
     - `reason`: "Designação inicial de leito no cadastro do residente [Nome]"
3. Criar `resident_history` (tipo CREATE)

**Auditoria:**
- ✅ `bed_status_history` (mudança de status)
- ✅ `resident_history` (criação do residente)

#### B. Edição: Designar Leito
**Endpoint:** `PATCH /residents/:id`

**Fluxo:**
1. Validar `changeReason` (obrigatório, min 10 chars)
2. Atualizar `resident.bedId`
3. Atualizar `bed.status` → "Ocupado"
4. Criar registro em `bed_status_history`:
   - `reason`: "Residente [Nome] designado ao leito (editado por usuário). Motivo: [changeReason]"
5. Criar `resident_history` (tipo UPDATE, campo `bedId` alterado)

**Auditoria:**
- ✅ `bed_status_history`
- ✅ `resident_history`

#### C. Edição: Remover Leito
**Fluxo:**
1. Atualizar `resident.bedId` → null
2. Atualizar `bed.status` → "Disponível"
3. Criar registro em `bed_status_history`:
   - `reason`: "Residente [Nome] removido do leito (editado por usuário). Motivo: [changeReason]"

**Auditoria:**
- ✅ `bed_status_history`
- ✅ `resident_history`

#### D. Edição: Mudar Leito
**Fluxo:**
1. Liberar leito antigo → "Disponível"
2. Ocupar leito novo → "Ocupado"
3. Criar **2 registros** em `bed_status_history`
4. Criar `resident_history`

**Auditoria:**
- ✅ 2x `bed_status_history` (origem + destino)
- ✅ `resident_history`

### 4.5 Transferência de Leito (Drag-and-Drop)

**Endpoint:** `POST /residents/:id/transfer-bed`

**DTO:**
```typescript
{
  toBedId: string,           // Obrigatório (UUID)
  reason: string,            // Obrigatório, min 10 chars
  transferredAt?: string     // Opcional (ISO 8601)
}
```

**Fluxo (Transação Atômica):**
1. Validar que residente está em leito
2. Validar que leito destino está Disponível
3. Validar que não é o mesmo leito
4. **Atualizar leito origem:**
   - `bed.status` → "Disponível"
   - Criar registro em `bed_status_history`:
     - `reason`: "Residente [Nome] transferido para outro leito. Motivo da transferência: [reason]"
5. **Atualizar leito destino:**
   - `bed.status` → "Ocupado"
   - Criar registro em `bed_status_history`:
     - `reason`: "Residente [Nome] transferido para este leito. Motivo da transferência: [reason]"
6. Atualizar `resident.bedId`
7. Criar registro em `bed_transfer_history`

**Auditoria Completa:**
- ✅ 2x `bed_status_history` (origem + destino)
- ✅ 1x `bed_transfer_history` (transferência específica)

**Validações:**
- ❌ Não pode transferir para o mesmo leito
- ❌ Não pode transferir para leito Ocupado
- ❌ Não pode transferir para leito em Manutenção
- ✅ Pode transferir de/para leito Reservado (libera a reserva)

---

## 5. Auditoria e Rastreabilidade

### 5.1 Tabela bed_status_history

**Propósito:** Registrar TODAS as mudanças de status de leitos

**Campos:**
- `id` - UUID único
- `tenantId` - Isolamento multi-tenant
- `bedId` - Leito afetado
- `previousStatus` - Status anterior
- `newStatus` - Novo status
- `reason` - Motivo detalhado da mudança
- `metadata` - JSON com dados adicionais (opcional)
- `changedBy` - UUID do usuário responsável
- `changedAt` - Timestamp da mudança (timestamptz)

**Eventos Registrados:**
1. ✅ Reserva (Disponível → Reservado)
2. ✅ Bloqueio (Disponível/Reservado → Manutenção)
3. ✅ Liberação (Manutenção/Reservado → Disponível)
4. ✅ Ocupação por cadastro (Disponível → Ocupado)
5. ✅ Ocupação por edição (Disponível → Ocupado)
6. ✅ Liberação por remoção (Ocupado → Disponível)
7. ✅ Transferência origem (Ocupado → Disponível)
8. ✅ Transferência destino (Disponível → Ocupado)

**Query Exemplo:**
```sql
SELECT
  bsh.changed_at,
  b.code as leito,
  bsh.previous_status as "de",
  bsh.new_status as "para",
  bsh.reason as motivo,
  u.name as usuario
FROM bed_status_history bsh
JOIN bed b ON b.id = bsh.bed_id
LEFT JOIN "user" u ON u.id = bsh.changed_by
WHERE bsh.tenant_id = 'TENANT_ID'
  AND bsh.bed_id = 'BED_ID'
ORDER BY bsh.changed_at DESC;
```

### 5.2 Tabela bed_transfer_history

**Propósito:** Registro específico de transferências de residentes

**Campos:**
- `residentId` - Residente transferido
- `fromBedId` - Leito de origem
- `toBedId` - Leito de destino
- `reason` - Motivo da transferência
- `transferredBy` - Usuário que executou
- `transferredAt` - Timestamp da transferência

**Complementariedade:**
- `bed_status_history` registra a mudança de STATUS dos leitos
- `bed_transfer_history` registra o CONTEXTO completo da transferência

### 5.3 Tabela resident_history

**Propósito:** Versionamento completo de dados do residente

**Quando o campo `bedId` muda:**
- Registra em `changedFields`: `["bedId"]`
- Inclui `previousData.bedId` e `newData.bedId`
- Requer `changeReason` obrigatório (min 10 chars)

---

## 6. Endpoints da API

### 6.1 Buildings
```http
GET    /buildings                    # Listar todos
GET    /buildings/:id                # Buscar por ID
POST   /buildings                    # Criar
PATCH  /buildings/:id                # Atualizar
DELETE /buildings/:id                # Deletar (soft delete)
GET    /buildings/stats/summary      # Estatísticas
POST   /buildings/structure          # Gerador automático
```

### 6.2 Floors
```http
GET    /floors                       # Listar todos
GET    /floors?buildingId=...        # Filtrar por prédio
GET    /floors/:id                   # Buscar por ID
POST   /floors                       # Criar
PATCH  /floors/:id                   # Atualizar
DELETE /floors/:id                   # Deletar
GET    /floors/stats/summary         # Estatísticas
```

### 6.3 Rooms
```http
GET    /rooms                        # Listar todos
GET    /rooms?floorId=...            # Filtrar por andar
GET    /rooms/:id                    # Buscar por ID
POST   /rooms                        # Criar
PATCH  /rooms/:id                    # Atualizar
DELETE /rooms/:id                    # Deletar
```

### 6.4 Beds
```http
# CRUD Básico
GET    /beds?roomId=...&status=...   # Listar com filtros
GET    /beds/:id                     # Buscar por ID
POST   /beds                         # Criar
PATCH  /beds/:id                     # Atualizar
DELETE /beds/:id                     # Deletar

# Estatísticas e Mapa
GET    /beds/stats/occupancy         # Estatísticas de ocupação
GET    /beds/map/full?buildingId=... # Mapa hierárquico completo

# Operações de Gestão
POST   /beds/:id/reserve             # Reservar leito
POST   /beds/:id/block               # Bloquear para manutenção
POST   /beds/:id/release             # Liberar leito

# Histórico
GET    /beds/status-history?bedId=...&skip=0&take=50  # Histórico de status
```

### 6.5 Residents (Transferências)
```http
POST   /residents/:id/transfer-bed   # Transferir residente
```

---

## 7. Componentes Frontend

### 7.1 Modais de Operação

#### TransferBedModal
- **Props:** `residentName`, `fromBedCode`, `toBedCode`, `fromLocation`, `toLocation`, `onConfirm`
- **Validação:** Motivo obrigatório (min 10 chars)
- **Visual:** Setas indicando origem → destino, badges de leitos

#### ReserveBedModal
- **Seleção:** Lista apenas leitos Disponíveis
- **Campos:** Nome futuro residente, data prevista admissão, observações
- **Validação:** Observações min 10 chars (se fornecidas)

#### BlockBedModal
- **Seleção:** Lista leitos não Ocupados
- **Campos:** Motivo (obrigatório, min 10 chars), data prevista liberação
- **Restrição:** Não permite bloquear leito Ocupado

#### ReleaseBedModal
- **Seleção:** Lista leitos em Manutenção ou Reservado
- **Campos:** Motivo (opcional)
- **Ação:** Volta status para Disponível

#### SelectBedModal
- **Uso:** Durante drag-and-drop
- **Filtro:** Mostra apenas leitos Disponíveis
- **Visual:** Hierarquia Building → Floor → Room → Bed

### 7.2 Drag-and-Drop no Mapa

**Implementação:**
- HTML5 Drag API nativa
- `dataTransfer` com `residentId` e `fromBedId`
- Expansão automática de accordions durante drag (`expandAll: true`)
- Indicador visual "⬇ Solte aqui" em leitos disponíveis
- Drop inválido em leitos Ocupados ou Manutenção
- Modal de confirmação após drop válido

**Eventos:**
```typescript
onDragStart={(e) => {
  e.dataTransfer.setData('residentId', resident.id)
  e.dataTransfer.setData('fromBedId', bed.id)
  setExpandAll(true) // Expandir tudo
}}

onDragOver={(e) => {
  if (bedIsAvailable) e.preventDefault()
}}

onDrop={(e) => {
  const residentId = e.dataTransfer.getData('residentId')
  const fromBedId = e.dataTransfer.getData('fromBedId')
  // Abrir TransferBedModal
}}
```

### 7.3 Cards de Estatísticas

#### OccupancyStats (Mapa)
- Estrutura (Prédios, Andares, Quartos)
- Total de Leitos
- Taxa de Ocupação (barra de progresso)
- Status dos Leitos (Disponíveis, Ocupados, Manutenção, Reservados)

#### BedsStatsCards (Hub)
- Cards clicáveis que filtram a lista
- Cores por status
- Números grandes e destacados
- Ícones contextuais

---

## 8. Regras de Negócio

### 8.1 Validações de Hierarquia
1. ❌ Não pode criar Andar sem Prédio
2. ❌ Não pode criar Quarto sem Andar
3. ❌ Não pode criar Leito sem Quarto
4. ❌ Não pode deletar Prédio com Andares
5. ❌ Não pode deletar Andar com Quartos
6. ❌ Não pode deletar Quarto com Leitos
7. ❌ Não pode deletar Leito Ocupado

### 8.2 Status de Leitos

**Transições Permitidas:**

```
Disponível → Reservado (reserva)
Disponível → Manutenção (bloqueio)
Disponível → Ocupado (designação/transferência)

Reservado → Disponível (liberação)
Reservado → Manutenção (bloqueio)

Manutenção → Disponível (liberação)

Ocupado → Disponível (remoção/transferência origem)
```

**Transições Bloqueadas:**
- ❌ Ocupado → Reservado
- ❌ Ocupado → Manutenção
- ❌ Manutenção → Ocupado (direto)
- ❌ Reservado → Ocupado (direto)

### 8.3 Motivos Obrigatórios

**Quando é obrigatório:**
- ✅ Bloqueio para Manutenção (min 10 chars)
- ✅ Transferência de Leito (min 10 chars)
- ✅ Edição de Residente com mudança de `bedId` (min 10 chars)

**Quando é opcional:**
- 🔹 Reserva de Leito
- 🔹 Liberação de Leito

### 8.4 Multi-tenancy

- Todos os registros isolados por `tenantId`
- Queries automáticas com filtro por tenant
- Índices otimizados com `tenantId`
- Validações de pertencimento antes de operações

---

## 9. Tecnologias Utilizadas

### Backend
- NestJS 10+
- Prisma ORM
- PostgreSQL 14+
- TypeScript 5+
- class-validator / class-transformer
- Winston Logger

### Frontend
- React 18+
- TypeScript (Strict Mode)
- TailwindCSS 3+
- shadcn/ui
- React Query (TanStack Query v5)
- React Hook Form
- Zod
- Lucide React (ícones)
- Axios
- Sonner (toasts)

---

## 10. Próximas Melhorias

### Funcionalidades Planejadas
- [ ] Relatórios de ocupação (PDF/Excel)
- [ ] Dashboards com gráficos (Chart.js/Recharts)
- [ ] Notificações de vagas disponíveis
- [ ] Integração com agenda de manutenção
- [ ] QR Code nos leitos
- [ ] App mobile para visualização
- [ ] Previsão de disponibilidade (IA)
- [ ] Histórico visual com timeline

### Melhorias Técnicas
- [ ] Testes E2E com Playwright
- [ ] Testes unitários (Jest + React Testing Library)
- [ ] Cache Redis para estatísticas
- [ ] WebSockets para atualizações em tempo real
- [ ] Documentação Swagger/OpenAPI completa

---

## 11. Testes

### 11.1 Checklist de Testes Manuais

**Estrutura:**
- [ ] Criar hierarquia completa (Prédio → Andar → Quarto → Leito)
- [ ] Editar cada nível
- [ ] Deletar com validação de cascata
- [ ] Usar gerador automático de estrutura

**Mapa:**
- [ ] Visualizar mapa hierárquico
- [ ] Verificar estatísticas em tempo real
- [ ] Testar filtros (prédio, andar, status)
- [ ] Expandir/colapsar accordions

**Operações de Gestão:**
- [ ] Reservar leito disponível
- [ ] Bloquear leito para manutenção
- [ ] Liberar leito (reservado e manutenção)
- [ ] Verificar que não pode bloquear leito ocupado

**Designação e Transferência:**
- [ ] Cadastrar residente com leito
- [ ] Editar residente: designar leito
- [ ] Editar residente: remover leito
- [ ] Editar residente: mudar leito
- [ ] Transferir via drag-and-drop no mapa
- [ ] Verificar modal de confirmação
- [ ] Testar validações (motivo min 10 chars)

**Auditoria:**
- [ ] Consultar `bed_status_history` após cada operação
- [ ] Verificar 2 registros após transferência
- [ ] Verificar `reason` detalhado em cada registro
- [ ] Verificar `changedBy` correto
- [ ] Consultar `bed_transfer_history` após transferência

**Performance:**
- [ ] Testar com 100+ leitos
- [ ] Verificar tempo de carregamento do mapa
- [ ] Testar drag-and-drop em estrutura grande

### 11.2 Queries de Validação

**Verificar histórico completo de um leito:**
```sql
SELECT
  bsh.changed_at,
  bsh.previous_status,
  bsh.new_status,
  bsh.reason,
  u.name as usuario
FROM bed_status_history bsh
LEFT JOIN "user" u ON u.id = bsh.changed_by
WHERE bsh.bed_id = 'BED_UUID'
ORDER BY bsh.changed_at DESC;
```

**Verificar transferências de um residente:**
```sql
SELECT
  bth.transferred_at,
  fb.code as de_leito,
  tb.code as para_leito,
  bth.reason,
  u.name as usuario
FROM bed_transfer_history bth
JOIN bed fb ON fb.id = bth.from_bed_id
JOIN bed tb ON tb.id = bth.to_bed_id
LEFT JOIN "user" u ON u.id = bth.transferred_by
WHERE bth.resident_id = 'RESIDENT_UUID'
ORDER BY bth.transferred_at DESC;
```

---

## 12. Suporte

### Documentação Relacionada
- [Prisma Schema](../../apps/backend/prisma/schema/infrastructure.prisma)
- [Permissões do Sistema](./PERMISSIONS_GUIDE.md)
- [Versionamento de Residentes](./modules/residents.md)
- [Multi-tenancy](./architecture/multi-tenancy.md)

### Arquivos Principais

**Backend:**
- `apps/backend/src/beds/beds.service.ts` - Lógica de negócio
- `apps/backend/src/residents/residents.service.ts` - Transferências
- `apps/backend/prisma/schema/infrastructure.prisma` - Schema

**Frontend:**
- `apps/frontend/src/pages/beds-management/BedsManagementHub.tsx` - Hub
- `apps/frontend/src/pages/beds/BedsMapPage.tsx` - Mapa
- `apps/frontend/src/pages/beds/BedsStructurePage.tsx` - Estrutura
- `apps/frontend/src/components/beds/BedsMapVisualization.tsx` - Drag-and-drop

### Contato
**Dr. E. (Emanuel)**
CEO - Rafa Labs Desenvolvimento e Tecnologia
emanuel@rafalabs.com.br

---

**Última atualização:** 2026-01-14
**Versão do sistema:** 2.0
**Status:** ✅ Implementação completa com auditoria
