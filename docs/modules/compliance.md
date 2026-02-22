# Módulo: Sistema de Conformidade Regulatória

> **Documento complementar (não canônico)**
> Referências principais de implementação:
> - [rdc-indicators](./rdc-indicators.md)
> - [sentinel-events](./sentinel-events.md)
> - [compliance-assessments](./compliance-assessments.md)
> Uso: visão macro consolidada de conformidade regulatória.

**Status:** ✅ Implementado e em Expansão
**Versão:** 1.0.0
**Última atualização:** 10/01/2026

---

## 📋 Visão Geral

Central de Conformidade Regulatória e Documental para Instituições de Longa Permanência para Idosos (ILPIs). Reúne todas as exigências regulatórias da ANVISA (RDC 502/2021), Vigilância Sanitária e demais órgãos fiscalizadores, garantindo que a instituição mantenha documentação atualizada e indicadores em conformidade.

---

## 🎯 Funcionalidades

### Módulos Implementados

- ✅ **Documentos Institucionais** - Gestão completa de documentos obrigatórios
- ✅ **Eventos Sentinela** - Rastreamento de incidentes graves (quedas com lesão, tentativas de suicídio)
- 🚧 **Indicadores Mensais RDC** - Indicadores obrigatórios ANVISA (em desenvolvimento)
- 🚧 **Outras Conformidades** - Futuras áreas de conformidade

### Features Principais

- ✅ Dashboard visual com status de conformidade
- ✅ Alertas de vencimento de documentos
- ✅ Sistema de notificações automáticas
- ✅ Rastreamento de eventos sentinela com prazos
- ✅ Gerenciamento de versões de documentos
- ✅ Upload de arquivos com categorização
- ✅ Filtros e busca avançada
- ✅ Integração com sistema de notificações
- ✅ Separação de concerns (módulo standalone)

---

## 🏗️ Arquitetura

### Estrutura de Páginas

```
apps/frontend/src/pages/
├── dashboards/
│   └── ConformidadePage.tsx              # Hub central de conformidade
└── compliance/
    ├── DocumentComplianceDashboard.tsx   # Dashboard de documentos
    └── InstitutionalDocumentManagement.tsx  # CRUD de documentos
```

### Navegação Hierárquica

```
/dashboard/conformidade
  ├── /documentos                         # Dashboard de documentos
  │   └── /gestao                         # Gestão completa (CRUD)
  ├── /eventos-sentinela                  # Eventos sentinela
  └── /indicadores-mensais                # Indicadores RDC (futuro)
```

### Rotas Configuradas

```tsx
// apps/frontend/src/routes/index.tsx

{
  path: 'conformidade',
  element: <ConformidadePage />,
  handle: {
    breadcrumb: 'Conformidade',
  },
}

{
  path: 'conformidade/documentos',
  element: (
    <ProtectedRoute requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}>
      <DocumentComplianceDashboard />
    </ProtectedRoute>
  ),
}

{
  path: 'conformidade/documentos/gestao',
  element: (
    <ProtectedRoute requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}>
      <InstitutionalDocumentManagement />
    </ProtectedRoute>
  ),
}
```

---

## 📄 1. Documentos Institucionais

### Visão Geral

Sistema completo de gestão de documentos obrigatórios para ILPIs, incluindo estatuto, alvarás, licenças sanitárias, AVCB, certidões e outros documentos exigidos por lei.

### Componentes

#### ConformidadePage - Hub Central

**Localização:** `apps/frontend/src/pages/dashboards/ConformidadePage.tsx`

**Funcionalidades:**
- Card clicável para navegação rápida
- Descrição dos documentos obrigatórios
- Botão "Ver Documentos" para dashboard

#### DocumentComplianceDashboard

**Localização:** `apps/frontend/src/pages/compliance/DocumentComplianceDashboard.tsx`

**Rota:** `/dashboard/conformidade/documentos`

**Funcionalidades:**
- 📊 **5 Cards de Estatísticas:**
  - Total de documentos
  - Documentos OK
  - Vencendo (próximos 30 dias)
  - Vencidos
  - Pendentes de envio

- 📈 **Barra de Progresso de Conformidade:**
  - Percentual de documentos em dia
  - Cores dinâmicas (verde >80%, amarelo 50-80%, vermelho <50%)

- 🚨 **Alertas Críticos:**
  - Notificações de documentos vencidos
  - Notificações de documentos vencendo
  - Ações rápidas (enviar documento)

- 📋 **Lista de Documentos Obrigatórios:**
  - Agrupados por natureza jurídica
  - Badge com status (OK, VENCENDO, VENCIDO, PENDENTE)
  - Informações de validade
  - Ações rápidas (enviar, visualizar)

**Exemplo de Status:**
```tsx
const statusColors = {
  OK: { badge: 'bg-green-100 text-green-800', icon: 'text-green-600' },
  VENCENDO: { badge: 'bg-amber-100 text-amber-800', icon: 'text-amber-600' },
  VENCIDO: { badge: 'bg-red-100 text-red-800', icon: 'text-red-600' },
  PENDENTE: { badge: 'bg-gray-100 text-gray-800', icon: 'text-gray-600' },
}
```

#### InstitutionalDocumentManagement

**Localização:** `apps/frontend/src/pages/compliance/InstitutionalDocumentManagement.tsx`

**Rota:** `/dashboard/conformidade/documentos/gestao`

**Funcionalidades:**
- ✅ **CRUD Completo:**
  - Upload de novos documentos
  - Visualizar documentos existentes
  - Editar informações
  - Deletar documentos (com confirmação)

- 🔍 **Filtros Avançados:**
  - Por tipo de documento
  - Por status (OK, vencendo, vencido, pendente)
  - Busca por texto

- 📁 **Gestão de Versões:**
  - Histórico de versões por documento
  - Visualização de versões anteriores
  - Controle de validade por versão

- 📤 **Upload de Arquivos:**
  - Suporte a PDF e imagens
  - Validação de tamanho (10MB)
  - Preview antes do upload
  - Categorização automática

**Exemplo de Documentos por Natureza Jurídica:**

| Natureza Jurídica | Documentos Obrigatórios |
|-------------------|------------------------|
| **Associação** | Estatuto Social, Ata de Eleição, CNPJ, Alvará |
| **Fundação** | Estatuto, Ata de Aprovação, CNPJ, Alvará |
| **Empresa Privada** | Contrato Social, CNPJ, Alvará, Licença Sanitária |
| **MEI** | CCMEI, Alvará, Licença Sanitária |

**Comuns a Todos:**
- Licença Sanitária (VISA)
- Auto de Vistoria do Corpo de Bombeiros (AVCB)
- Certidão Negativa de Débitos (CND)

### Backend - Modelos

**TenantDocument** (`apps/backend/prisma/schema/documents.prisma`)

```prisma
model TenantDocument {
  id          String   @id @default(uuid())
  tenantId    String
  type        DocumentType
  description String?
  fileUrl     String
  fileName    String
  issueDate   DateTime?
  expiryDate  DateTime?
  version     Int      @default(1)
  status      DocumentStatus // OK, VENCENDO, VENCIDO, PENDENTE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}

enum DocumentType {
  ESTATUTO_SOCIAL
  ATA_ELEICAO
  CONTRATO_SOCIAL
  CCMEI
  CNPJ
  ALVARA_FUNCIONAMENTO
  LICENCA_SANITARIA
  AVCB
  CND_FEDERAL
  CND_ESTADUAL
  CND_MUNICIPAL
  OUTROS
}

enum DocumentStatus {
  OK         // Dentro da validade
  VENCENDO   // Vence em até 30 dias
  VENCIDO    // Já venceu
  PENDENTE   // Ainda não enviado
}
```

### API Endpoints

```
GET    /api/institutional-profile/documents              # Listar todos
GET    /api/institutional-profile/documents/:id          # Buscar por ID
POST   /api/institutional-profile/documents              # Criar/Upload
PUT    /api/institutional-profile/documents/:id          # Atualizar
DELETE /api/institutional-profile/documents/:id          # Deletar
GET    /api/institutional-profile/documents/compliance   # Dashboard de conformidade
```

### React Query Hooks

```tsx
import { useDocuments, useComplianceDashboard } from '@/hooks/useInstitutionalProfile'

// Listar documentos com filtros
const { data: documents } = useDocuments({
  type: DocumentType.ALVARA_FUNCIONAMENTO,
  status: DocumentStatus.VENCENDO,
})

// Dashboard de conformidade
const { data: dashboard } = useComplianceDashboard()
// Retorna:
// {
//   totalDocuments,
//   okDocuments,
//   expiringSoonDocuments,
//   expiredDocuments,
//   pendingDocuments,
//   compliancePercentage,
//   alerts: []
// }
```

---

## 🚨 2. Eventos Sentinela

### Visão Geral

Rastreamento obrigatório de incidentes graves conforme RDC 502/2021 da ANVISA. Eventos sentinela são ocorrências que exigem notificação imediata às autoridades de saúde.

### Tipos de Eventos Sentinela

**Definidos pela ANVISA RDC 502/2021:**

1. **Quedas com Lesão**
   - Quedas resultando em fraturas, traumatismo craniano ou outras lesões graves
   - Notificação obrigatória em 24h
   - Requer investigação de causa raiz

2. **Tentativa de Suicídio**
   - Qualquer ato autodestrutivo intencional
   - Notificação imediata
   - Acompanhamento psiquiátrico obrigatório

3. **Eventos Futuros** (Planejados):
   - Erros de medicação graves
   - Úlceras por pressão grau 3 ou 4 adquiridas na instituição
   - Evasão de residente
   - Óbito súbito ou inesperado

### Status e Fluxo

```
PENDENTE (recém criado)
  ↓
EM_ANALISE (sendo investigado)
  ↓
NOTIFICADO (reportado às autoridades)
  ↓
CONCLUIDO (finalizado com plano de ação)
```

### Alertas de Prazo

**Sistema de Alertas Automáticos:**
- 🔴 **Crítico:** Evento pendente há mais de 24h
- 🟡 **Atenção:** Evento pendente há mais de 12h
- ⚪ **Normal:** Evento criado recentemente

**ConformidadePage** mostra badge visual:
```tsx
const pendingEvents = sentinelEvents?.filter(e => e.status === 'PENDENTE')
const overdueEvents = pendingEvents.filter(e => {
  const hoursElapsed = differenceInHours(new Date(), new Date(e.createdAt))
  return hoursElapsed > 24
})
```

### Backend - Modelos

**SentinelEvent** (`apps/backend/prisma/schema/daily-records.prisma`)

```prisma
model SentinelEvent {
  id                  String   @id @default(uuid())
  tenantId            String
  residentId          String
  dailyRecordId       String?
  type                SentinelEventType
  status              SentinelEventStatus
  description         String
  incidentDate        DateTime
  notifiedAuthorities Boolean  @default(false)
  notificationDate    DateTime?
  actionPlan          String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  tenant              Tenant        @relation(fields: [tenantId], references: [id])
  resident            Resident      @relation(fields: [residentId], references: [id])
  dailyRecord         DailyRecord?  @relation(fields: [dailyRecordId], references: [id])
  notifications       SentinelEventNotification[]
}

enum SentinelEventType {
  QUEDA_COM_LESAO
  TENTATIVA_SUICIDIO
  ERRO_MEDICACAO_GRAVE
  ULCERA_PRESSAO_GRAVE
  EVASAO
  OBITO_SUBITO
}

enum SentinelEventStatus {
  PENDENTE
  EM_ANALISE
  NOTIFICADO
  CONCLUIDO
}
```

### API Endpoints

```
GET    /api/sentinel-events                  # Listar todos
GET    /api/sentinel-events/:id              # Buscar por ID
POST   /api/sentinel-events                  # Criar evento
PUT    /api/sentinel-events/:id/status       # Atualizar status
DELETE /api/sentinel-events/:id              # Deletar (admin apenas)
GET    /api/sentinel-events/stats            # Estatísticas
```

### Criação Automática

**Eventos sentinela são criados automaticamente quando:**

1. **Queda com Lesão detectada em Registro Diário:**
```ts
// apps/backend/src/sentinel-events/sentinel-events.service.ts

@OnEvent('daily-record.created')
async handleDailyRecordCreated(payload: DailyRecordCreatedEvent) {
  // Se há menção a queda COM lesão
  if (payload.content.includes('queda') && payload.content.includes('lesão')) {
    await this.create({
      tenantId: payload.tenantId,
      residentId: payload.residentId,
      dailyRecordId: payload.dailyRecordId,
      type: SentinelEventType.QUEDA_COM_LESAO,
      description: 'Evento detectado automaticamente',
      incidentDate: new Date(),
    })
  }
}
```

2. **Usuário marca checkbox em formulário específico**

### React Query Hooks

```tsx
import { useSentinelEvents, useUpdateSentinelEventStatus } from '@/hooks/useSentinelEvents'

// Listar eventos
const { data: events } = useSentinelEvents({
  status: SentinelEventStatus.PENDENTE,
  type: SentinelEventType.QUEDA_COM_LESAO,
})

// Atualizar status
const updateMutation = useUpdateSentinelEventStatus()
updateMutation.mutate({
  id: eventId,
  status: SentinelEventStatus.NOTIFICADO,
  notificationDate: new Date(),
})
```

---

## 🔔 3. Sistema de Notificações

### Integração com Módulo de Notificações

O módulo de Conformidade está totalmente integrado ao sistema de notificações:

**Categorias Usadas:**
- `NotificationCategory.DOCUMENT` - Documentos vencendo/vencidos
- `NotificationCategory.INCIDENT` - Eventos sentinela

**Exemplos de Notificações Automáticas:**

#### 1. Documento Vencendo
```ts
await notificationsService.create({
  type: SystemNotificationType.DOCUMENT_EXPIRING,
  category: NotificationCategory.DOCUMENT,
  severity: NotificationSeverity.WARNING,
  title: 'Documento expirando em breve',
  message: `Alvará de Funcionamento expira em 15 dias`,
  actionUrl: '/dashboard/conformidade/documentos',
  entityType: 'DOCUMENT',
  entityId: documentId,
  metadata: {
    documentType: 'ALVARA_FUNCIONAMENTO',
    expiryDate: '2026-01-25',
  }
})
```

#### 2. Documento Vencido
```ts
await notificationsService.create({
  type: SystemNotificationType.DOCUMENT_EXPIRED,
  category: NotificationCategory.DOCUMENT,
  severity: NotificationSeverity.CRITICAL,
  title: 'Documento vencido',
  message: `Licença Sanitária venceu em 05/01/2026`,
  actionUrl: '/dashboard/conformidade/documentos/gestao',
})
```

#### 3. Evento Sentinela Atrasado
```ts
await notificationsService.create({
  type: SystemNotificationType.SENTINEL_EVENT_OVERDUE,
  category: NotificationCategory.INCIDENT,
  severity: NotificationSeverity.CRITICAL,
  title: 'Evento Sentinela Atrasado',
  message: `Queda com lesão pendente há mais de 24h - Notificação obrigatória!`,
  actionUrl: '/dashboard/conformidade/eventos-sentinela',
})
```

### Cron Jobs

**Backend executa verificações automáticas:**

```ts
// Executado diariamente às 08:00 BRT
@Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
async checkDocumentExpiry() {
  // Verifica documentos vencendo em 30 dias
  // Cria notificações automáticas
}

@Cron('0 */6 * * *', { timeZone: 'America/Sao_Paulo' })
async checkOverdueSentinelEvents() {
  // Verifica eventos sentinela pendentes há mais de 24h
  // Escala notificações para gestores
}
```

---

## 📈 4. Indicadores Mensais RDC (Em Desenvolvimento)

### Indicadores Obrigatórios ANVISA RDC 502/2021

1. **Taxa de Mortalidade**
   - Óbitos no mês / Total de residentes

2. **Taxa de Doenças Transmissíveis**
   - Casos novos / Total de residentes

3. **Taxa de Úlceras por Pressão**
   - Residentes com úlcera / Total de residentes acamados

4. **Taxa de Desnutrição**
   - Residentes desnutridos / Total de residentes

### Status

🚧 **Planejado para versão 2.0**
- Dashboard visual de indicadores
- Gráficos evolutivos
- Exportação de relatórios mensais
- Comparação com metas

---

## 🎨 Design e UX

### Padrões de Design

**Cores de Status:**
```tsx
// Conformidade Geral
const complianceColors = {
  high: 'text-green-600 bg-green-100',    // >80%
  medium: 'text-amber-600 bg-amber-100',  // 50-80%
  low: 'text-red-600 bg-red-100',         // <50%
}

// Status de Documentos
const documentStatusColors = {
  OK: 'bg-green-100 text-green-800',
  VENCENDO: 'bg-amber-100 text-amber-800',
  VENCIDO: 'bg-red-100 text-red-800',
  PENDENTE: 'bg-gray-100 text-gray-800',
}
```

### Breadcrumbs

Todas as páginas incluem navegação breadcrumb:
```
Conformidade > Documentos da Instituição
Conformidade > Documentos > Gestão de Documentos
Conformidade > Eventos Sentinela
```

### Ícones

| Módulo | Ícone | Componente Lucide |
|--------|-------|-------------------|
| Documentos | 📄 | `FileText` |
| Indicadores | 📊 | `BarChart3` |
| Eventos Sentinela | ⚠️ | `AlertTriangle` |
| Conformidade Geral | 🛡️ | `Shield` |

---

## 🔒 Permissões

### Permissões Necessárias

```tsx
enum PermissionType {
  VIEW_INSTITUTIONAL_PROFILE    // Ver documentos
  UPDATE_INSTITUTIONAL_PROFILE  // Editar documentos
  VIEW_COMPLIANCE_DASHBOARD     // Ver dashboard de conformidade
  VIEW_SENTINEL_EVENTS          // Ver e gerenciar eventos sentinela
}
```

### Controle de Acesso

```tsx
// Apenas usuários com permissão podem acessar
<ProtectedRoute requiredPermissions={[PermissionType.VIEW_INSTITUTIONAL_PROFILE]}>
  <DocumentComplianceDashboard />
</ProtectedRoute>
```

---

## 📊 Fluxos de Trabalho

### Fluxo 1: Upload de Novo Documento

```
1. Usuário acessa /dashboard/conformidade/documentos/gestao
2. Clica em "Enviar Documento"
3. Preenche formulário:
   - Tipo de documento
   - Data de emissão
   - Data de validade
   - Upload de arquivo (PDF/Imagem)
4. Sistema valida e faz upload para S3/MinIO
5. Backend calcula status (OK, VENCENDO, VENCIDO)
6. Documento aparece na lista
7. Dashboard de conformidade atualiza automaticamente
```

### Fluxo 2: Notificação Automática de Vencimento

```
1. Cron job roda diariamente às 08:00
2. Backend busca documentos vencendo em 30 dias
3. Para cada documento:
   a. Verifica se já existe notificação ativa
   b. Cria notificação se não existir
   c. Envia email (futuro)
4. Usuário vê notificação no dropdown
5. Clica e é direcionado para gestão de documentos
6. Faz upload de nova versão
7. Notificação é marcada como resolvida
```

### Fluxo 3: Evento Sentinela - Queda com Lesão

```
1. Cuidador registra queda em Registro Diário
2. Backend detecta palavras-chave ("queda" + "lesão")
3. Evento Sentinela é criado automaticamente (status: PENDENTE)
4. Notificação CRITICAL é enviada para gestores
5. Badge vermelho aparece em /dashboard/conformidade
6. Gestor acessa /dashboard/conformidade/eventos-sentinela
7. Abre formulário do evento
8. Preenche:
   - Descrição detalhada
   - Ações tomadas
   - Notificou autoridades? (checkbox)
   - Data de notificação
   - Plano de ação preventiva
9. Atualiza status para NOTIFICADO ou CONCLUIDO
10. Sistema registra timestamp
11. Badge desaparece quando todos eventos estão OK
```

---

## 🚨 Troubleshooting

### Problema: Dashboard de documentos não carrega

**Causa:** Perfil institucional não configurado

**Solução:**
1. Ir para `/dashboard/perfil-institucional`
2. Preencher dados básicos (CNPJ, Natureza Jurídica, etc.)
3. O sistema detecta automaticamente documentos obrigatórios

### Problema: Badge de evento sentinela não some

**Causa:** Evento ainda está com status PENDENTE ou EM_ANALISE

**Solução:**
- Atualizar status do evento para NOTIFICADO ou CONCLUIDO
- Badge só desaparece quando não há eventos pendentes/atrasados

### Problema: Upload de documento falha

**Possíveis Causas:**
1. Arquivo maior que 10MB
2. Formato não suportado (apenas PDF e imagens)
3. Problema de conexão com S3/MinIO

**Solução:**
- Verificar tamanho do arquivo
- Converter para PDF se necessário
- Verificar logs do backend para erros de storage

---

## 📈 Melhorias Futuras

### Roadmap v2.0

1. **Indicadores Mensais Completos**
   - Dashboard de indicadores RDC 502/2021
   - Gráficos evolutivos
   - Exportação de relatórios PDF

2. **Automações Avançadas**
   - Email automático de vencimento de documentos
   - WhatsApp para alertas críticos
   - Integração com sistemas externos (e-SISBI, CNES)

3. **Relatórios Personalizados**
   - Relatório mensal de conformidade
   - Relatório anual de eventos sentinela
   - Dashboard executivo para direção

4. **Gestão de Treinamentos**
   - Rastreamento de treinamentos obrigatórios
   - Certificados digitais
   - Alertas de reciclagem

5. **Auditoria e Inspeções**
   - Checklist de inspeção VISA
   - Histórico de vistorias
   - Planos de ação de não-conformidades

---

## 📚 Referências

### Arquivos Principais

**Frontend:**
- `apps/frontend/src/pages/dashboards/ConformidadePage.tsx`
- `apps/frontend/src/pages/compliance/DocumentComplianceDashboard.tsx`
- `apps/frontend/src/pages/compliance/InstitutionalDocumentManagement.tsx`
- `apps/frontend/src/hooks/useInstitutionalProfile.ts`
- `apps/frontend/src/hooks/useSentinelEvents.ts`

**Backend:**
- `apps/backend/src/institutional-profile/institutional-profile.service.ts`
- `apps/backend/src/institutional-profile/institutional-profile.controller.ts`
- `apps/backend/src/sentinel-events/sentinel-events.service.ts`
- `apps/backend/src/sentinel-events/sentinel-events.controller.ts`
- `apps/backend/prisma/schema/tenant.prisma`
- `apps/backend/prisma/schema/documents.prisma`
- `apps/backend/prisma/schema/daily-records.prisma`

### Legislação e Referências

- **RDC 502/2021** - ANVISA (Regulamento de ILPIs)
- **Lei 10.741/2003** - Estatuto do Idoso
- **RDC 283/2005** - ANVISA (Anterior, ainda referenciada)

### Commits Importantes

- **2026-01-10:** Refatoração completa do módulo de conformidade
  - Separação de Perfil Institucional e Conformidade
  - Criação de páginas standalone para documentos
  - Integração com sistema de notificações
  - Helpers centralizados (`formatLegalNature`)

- **2025-12-XX:** Implementação de Eventos Sentinela
  - Detecção automática em registros diários
  - Sistema de alertas com prazos
  - Integração com dashboard de conformidade

### CHANGELOG

- [CHANGELOG - 2026-01-10](../../CHANGELOG.md#2026-01-10)

---

## 👥 Contribuindo

### Adicionando Novo Tipo de Documento

1. **Backend - Enum:**
```prisma
enum DocumentType {
  // ... existentes
  NOVO_DOCUMENTO
}
```

2. **Migration:** `npx prisma migrate dev`

3. **Frontend - Adicionar ao mapeamento:**
```tsx
const documentLabels = {
  // ... existentes
  NOVO_DOCUMENTO: 'Novo Documento Obrigatório',
}
```

### Adicionando Novo Tipo de Evento Sentinela

1. **Backend - Enum:**
```prisma
enum SentinelEventType {
  // ... existentes
  NOVO_EVENTO
}
```

2. **Lógica de Detecção:**
```ts
@OnEvent('daily-record.created')
async handleDailyRecordCreated(payload) {
  if (/* condição para detectar */) {
    await this.create({
      type: SentinelEventType.NOVO_EVENTO,
      // ...
    })
  }
}
```

---

**Última revisão:** 10/01/2026 por Claude Sonnet 4.5
**Status:** ✅ Documentação completa e atualizada
