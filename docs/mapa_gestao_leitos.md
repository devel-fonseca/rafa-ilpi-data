# Sistema de Estrutura de Leitos - RAFA ILPI Data

**Data:** 2025-11-20
**Responsável:** Dr. E. (Emanuel)
**Versão:** 1.0

---

## 1. Resumo Executivo

O **Sistema de Estrutura de Leitos** é um módulo completo do RAFA ILPI Data que permite o gerenciamento hierárquico da estrutura física da instituição e o mapeamento da ocupação de leitos por residentes.

### Objetivo

Mapear e controlar a ocupação de leitos organizados em uma hierarquia de 4 níveis:
- **Prédios** (Buildings)
- **Andares** (Floors)
- **Quartos** (Rooms)
- **Leitos** (Beds)

### Principais Funcionalidades

- CRUD completo para Prédios, Andares, Quartos e Leitos
- Mapa visual hierárquico com navegação por Accordion
- Estatísticas em tempo real de ocupação
- Sistema de cores semáforo (verde/vermelho/amarelo)
- Integração com cadastro de residentes
- Controle de status dos leitos (Disponível, Ocupado, Manutenção, Reservado)
- Atribuição e desvinculação de residentes aos leitos

---

## 2. Arquitetura

### 2.1 Backend (NestJS)

O backend foi desenvolvido em 4 módulos NestJS independentes:

```
apps/backend/src/
├── buildings/          # Módulo de Prédios
│   ├── buildings.controller.ts
│   ├── buildings.service.ts
│   ├── buildings.module.ts
│   └── dto/
│       ├── create-building.dto.ts
│       └── update-building.dto.ts
│
├── floors/             # Módulo de Andares
│   ├── floors.controller.ts
│   ├── floors.service.ts
│   ├── floors.module.ts
│   └── dto/
│       ├── create-floor.dto.ts
│       └── update-floor.dto.ts
│
├── rooms/              # Módulo de Quartos
│   ├── rooms.controller.ts
│   ├── rooms.service.ts
│   ├── rooms.module.ts
│   └── dto/
│       ├── create-room.dto.ts
│       └── update-room.dto.ts
│
└── beds/               # Módulo de Leitos
    ├── beds.controller.ts
    ├── beds.service.ts
    ├── beds.module.ts
    └── dto/
        ├── create-bed.dto.ts
        ├── update-bed.dto.ts
        └── assign-bed.dto.ts
```

### 2.2 Frontend (React + TypeScript)

Frontend desenvolvido com arquitetura modular:

```
apps/frontend/src/
├── api/
│   └── beds.api.ts                # API Client com tipos TypeScript
│
├── hooks/
│   ├── useBuildings.ts            # React Query hooks
│   ├── useFloors.ts
│   ├── useRooms.ts
│   ├── useBeds.ts
│   └── useBedsMap.ts
│
├── components/beds/
│   ├── BuildingCard.tsx           # Cards visuais
│   ├── FloorCard.tsx
│   ├── RoomCard.tsx
│   ├── BedCard.tsx
│   ├── BuildingForm.tsx           # Formulários (Modals)
│   ├── FloorForm.tsx
│   ├── RoomForm.tsx
│   ├── BedForm.tsx
│   ├── OccupancyStats.tsx         # Dashboard estatísticas
│   └── BedsMapVisualization.tsx   # Mapa hierárquico
│
└── pages/beds/
    ├── BedsStructurePage.tsx      # Página de Gestão
    └── BedsMapPage.tsx            # Página de Mapa Visual
```

### 2.3 Banco de Dados (Prisma)

Schema Prisma com relacionamentos:

```prisma
model Building {
  id        String   @id @default(uuid())
  name      String
  code      String?  @unique
  address   String?
  isActive  Boolean  @default(true)
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  floors Floor[]
  tenant Tenant  @relation(fields: [tenantId], references: [id])
}

model Floor {
  id          String   @id @default(uuid())
  name        String
  orderIndex  Int
  buildingId  String
  isActive    Boolean  @default(true)
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  building Building @relation(fields: [buildingId], references: [id])
  rooms    Room[]
  tenant   Tenant   @relation(fields: [tenantId], references: [id])
}

model Room {
  id                 String   @id @default(uuid())
  name               String
  floorId            String
  capacity           Int      @default(2)
  roomType           RoomType?
  genderRestriction  GenderRestriction?
  hasBathroom        Boolean  @default(false)
  isAccessible       Boolean  @default(false)
  notes              String?
  tenantId           String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  floor  Floor      @relation(fields: [floorId], references: [id])
  beds   Bed[]
  tenant Tenant     @relation(fields: [tenantId], references: [id])
}

model Bed {
  id         String    @id @default(uuid())
  code       String    @unique
  roomId     String
  status     BedStatus @default(DISPONIVEL)
  notes      String?
  residentId String?   @unique
  tenantId   String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  room     Room      @relation(fields: [roomId], references: [id])
  resident Resident? @relation(fields: [residentId], references: [id])
  tenant   Tenant    @relation(fields: [tenantId], references: [id])
}

enum RoomType {
  INDIVIDUAL
  DUPLO
  TRIPLO
  COLETIVO
}

enum GenderRestriction {
  MASCULINO
  FEMININO
  SEM_RESTRICAO
}

enum BedStatus {
  DISPONIVEL
  OCUPADO
  MANUTENCAO
  RESERVADO
}
```

---

## 3. Como Usar

### 3.1 Cadastro da Estrutura Física

1. **Acessar "Estrutura de Leitos"** (`/dashboard/beds/structure`)
2. **Criar Prédio**
   - Clicar em "Novo Prédio"
   - Preencher nome e código (opcional)
   - Salvar
3. **Criar Andar**
   - Selecionar aba "Andares"
   - Clicar em "Novo Andar"
   - Selecionar prédio
   - Definir número do andar
   - Salvar
4. **Criar Quarto**
   - Selecionar aba "Quartos"
   - Clicar em "Novo Quarto"
   - Selecionar andar
   - Definir tipo, capacidade, acessibilidade
   - Salvar
5. **Criar Leito**
   - Selecionar aba "Leitos"
   - Clicar em "Novo Leito"
   - Selecionar quarto
   - Definir código único do leito
   - Salvar

### 3.2 Visualização do Mapa de Ocupação

1. **Acessar "Mapa de Ocupação"** (`/dashboard/beds/map`)
2. **Visualizar hierarquia**
   - Accordion com 4 níveis
   - Cores de status em tempo real
   - Estatísticas no painel lateral
3. **Filtrar**
   - Por prédio
   - Por andar
   - Por status

### 3.3 Atribuir Residente a Leito

1. **Acessar cadastro de residente** (`/dashboard/residentes/new` ou `/dashboard/residentes/:id/edit`)
2. **Aba "Acomodação"**
3. **Selecionar Quarto** (dropdown com lista de quartos)
4. **Selecionar Leito** (dropdown com leitos disponíveis do quarto selecionado)
5. **Salvar**

### 3.4 Transferir Residente entre Leitos

1. **Editar residente**
2. **Aba "Acomodação"**
3. **Selecionar novo quarto**
4. **Selecionar novo leito**
5. **Salvar** (o sistema automaticamente libera o leito anterior)

---

## 4. Endpoints da API

### 4.1 Buildings (Prédios)

```http
GET    /buildings                 # Listar todos
GET    /buildings/:id             # Buscar por ID
POST   /buildings                 # Criar
PATCH  /buildings/:id             # Atualizar
DELETE /buildings/:id             # Deletar
GET    /buildings/:id/stats       # Estatísticas
```

### 4.2 Floors (Andares)

```http
GET    /floors                    # Listar todos
GET    /floors?buildingId=:id     # Filtrar por prédio
GET    /floors/:id                # Buscar por ID
POST   /floors                    # Criar
PATCH  /floors/:id                # Atualizar
DELETE /floors/:id                # Deletar
GET    /floors/:id/stats          # Estatísticas
```

### 4.3 Rooms (Quartos)

```http
GET    /rooms                     # Listar todos
GET    /rooms?floorId=:id         # Filtrar por andar
GET    /rooms/:id                 # Buscar por ID
POST   /rooms                     # Criar
PATCH  /rooms/:id                 # Atualizar
DELETE /rooms/:id                 # Deletar
GET    /rooms/:id/stats           # Estatísticas
```

### 4.4 Beds (Leitos)

```http
GET    /beds                      # Listar todos
GET    /beds?roomId=:id           # Filtrar por quarto
GET    /beds?status=DISPONIVEL    # Filtrar por status
GET    /beds/:id                  # Buscar por ID
POST   /beds                      # Criar
PATCH  /beds/:id                  # Atualizar
DELETE /beds/:id                  # Deletar
POST   /beds/:id/assign           # Atribuir residente
POST   /beds/:id/unassign         # Liberar leito
GET    /beds/map/hierarchy        # Mapa hierárquico completo
GET    /beds/stats                # Estatísticas gerais
```

---

## 5. Componentes Frontend

### 5.1 Cards Visuais

#### BuildingCard
- **Props:** `building`, `onEdit`, `onDelete`, `onClick`
- **Visual:** Ícone Building2, nome, contador de andares
- **Ações:** Dropdown com Editar/Deletar

#### FloorCard
- **Props:** `floor`, `onEdit`, `onDelete`, `onClick`
- **Visual:** Ícone Layers, nome do andar, prédio, contador de quartos
- **Ações:** Dropdown com Editar/Deletar

#### RoomCard
- **Props:** `room`, `onEdit`, `onDelete`, `onClick`
- **Visual:** Ícone DoorOpen, nome, badges (tipo, banheiro, acessível)
- **Ocupação:** Barra de progresso
- **Ações:** Dropdown com Editar/Deletar

#### BedCard
- **Props:** `bed`, `onEdit`, `onDelete`, `onClick`
- **Visual:** Ícone Bed, código do leito
- **Status:** Cores semáforo
  - Verde: Disponível
  - Vermelho: Ocupado (com avatar do residente)
  - Amarelo: Manutenção
  - Azul: Reservado
- **Ações:** Dropdown com Editar/Deletar

### 5.2 Formulários (Modals)

Todos os formulários usam:
- **shadcn/ui Dialog**
- **React Hook Form**
- **Zod** para validação
- **Toast** para feedback

#### BuildingForm
- Nome (obrigatório)
- Código (opcional)
- Descrição (opcional)

#### FloorForm
- Nome (obrigatório)
- Prédio (Select, obrigatório)
- Número do andar (obrigatório)
- Descrição (opcional)

#### RoomForm
- Nome (obrigatório)
- Andar (Select, obrigatório)
- Tipo (Select: Individual, Duplo, Triplo, Coletivo)
- Capacidade (número)
- Possui banheiro? (checkbox)
- É acessível? (checkbox)
- Observações (textarea)

#### BedForm
- Código (obrigatório, único)
- Quarto (Select, obrigatório)
- Status (Select: Disponível, Ocupado, Manutenção, Reservado)
- Observações (textarea)

### 5.3 Componentes Especializados

#### OccupancyStats
Dashboard com 4 cards:
1. **Estrutura**
   - Total de prédios
   - Total de andares
   - Total de quartos
2. **Total de Leitos**
3. **Taxa de Ocupação** (%)
4. **Por Status**
   - Disponíveis
   - Ocupados
   - Manutenção
   - Reservados

#### BedsMapVisualization
- **Accordion 4 níveis**
  - Nível 1: Prédios
  - Nível 2: Andares
  - Nível 3: Quartos
  - Nível 4: Leitos (cards com cores)
- **Navegação hierárquica**
- **Exibição de residentes ocupando leitos**
- **Avatar e nome do residente**

### 5.4 Páginas

#### BedsStructurePage
- **URL:** `/dashboard/beds/structure`
- **Layout:** Tabs com 4 abas (Prédios, Andares, Quartos, Leitos)
- **Funcionalidade:** CRUD completo com tabelas e paginação
- **Ações:** Criar, Editar, Deletar (com confirmação)

#### BedsMapPage
- **URL:** `/dashboard/beds/map`
- **Layout:** 2 colunas (Mapa + Estatísticas)
- **Funcionalidade:** Visualização hierárquica em tempo real
- **Filtros:** Prédio, Andar, Status

---

## 6. Hooks React Query

Todos os hooks implementam:
- Cache de 5 minutos (staleTime)
- Invalidação automática em cascata
- Loading states
- Error handling
- Retry automático (3x)

### useBuildings()
```typescript
const {
  data: buildings,
  isLoading,
  error,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} = useBuildings()
```

### useFloors(buildingId?)
```typescript
const {
  data: floors,
  isLoading,
  error,
  createFloor,
  updateFloor,
  deleteFloor,
} = useFloors(buildingId)
```

### useRooms(floorId?)
```typescript
const {
  data: rooms,
  isLoading,
  error,
  createRoom,
  updateRoom,
  deleteRoom,
} = useRooms(floorId)
```

### useBeds({ roomId?, status? })
```typescript
const {
  data: beds,
  isLoading,
  error,
  createBed,
  updateBed,
  deleteBed,
  assignResident,
  unassignResident,
} = useBeds({ roomId, status })
```

### useBedsMap()
```typescript
const {
  data: hierarchy,
  isLoading,
  error,
} = useBedsMap()
```

---

## 7. Regras de Negócio

### 7.1 Hierarquia Obrigatória

1. **Não pode criar andar sem prédio**
2. **Não pode criar quarto sem andar**
3. **Não pode criar leito sem quarto**

### 7.2 Validações

- **Código de leito:** Único em toda a base
- **Capacidade de quarto:** Mínimo 1
- **Status de leito:** Apenas valores do enum
- **Exclusão:**
  - Não pode deletar prédio com andares
  - Não pode deletar andar com quartos
  - Não pode deletar quarto com leitos
  - Não pode deletar leito ocupado

### 7.3 Atribuição de Residentes

- Residente pode ocupar apenas 1 leito por vez
- Ao atribuir novo leito, o anterior é automaticamente liberado
- Leito ocupado muda status para OCUPADO
- Leito liberado muda status para DISPONIVEL

### 7.4 Multi-tenancy

Todos os registros são isolados por tenant (tenantId)

---

## 8. Tecnologias Utilizadas

### Backend
- NestJS 10+
- Prisma ORM
- PostgreSQL
- TypeScript
- class-validator
- class-transformer

### Frontend
- React 18+
- TypeScript (Strict Mode)
- TailwindCSS
- shadcn/ui
- React Query (TanStack Query)
- React Hook Form
- Zod
- Lucide React (ícones)
- Axios

---

## 9. Próximas Melhorias

### Fase 2 (Futuro)
- [ ] Histórico de movimentações de residentes
- [ ] Relatórios de ocupação (PDF/Excel)
- [ ] Dashboards com gráficos (Chart.js)
- [ ] Filtros avançados no mapa
- [ ] Drag & drop para transferir residentes
- [ ] Notificações de vagas disponíveis
- [ ] Reserva de leitos
- [ ] Integração com agenda de manutenção
- [ ] QR Code nos leitos
- [ ] App mobile para visualização

---

## 10. Testes

### 10.1 Build
```bash
cd apps/frontend
npm run build
```
**Status:** ✅ Compilado com sucesso (0 erros TypeScript)

### 10.2 Testes Manuais Recomendados
1. Criar hierarquia completa (Prédio > Andar > Quarto > Leito)
2. Editar cada nível
3. Deletar com validação de cascata
4. Atribuir residente a leito
5. Transferir residente entre leitos
6. Visualizar mapa hierárquico
7. Verificar estatísticas em tempo real
8. Testar filtros
9. Testar paginação
10. Testar responsividade mobile

---

## 11. Suporte

### Documentação Adicional
- Prisma Schema: `/apps/backend/prisma/schema.prisma`
- API Endpoints: `/docs/api_endpoints.md` (se existir)
- Frontend Architecture: `/apps/frontend/README.md` (se existir)

### Contato
**Dr. E. (Emanuel)**
CEO - Rafa Labs Desenvolvimento e Tecnologia
emanuel@rafalabs.com.br

---

**Última atualização:** 2025-11-20
**Versão do sistema:** 1.0
**Status:** ✅ Implementação completa e funcional
