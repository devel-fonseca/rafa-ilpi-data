# Sistema de Feature Gating por Plano

## Visão Geral

Sistema que controla o acesso a funcionalidades do sistema baseado nas features incluídas no plano de assinatura de cada tenant. Implementa validação tanto no frontend (UX) quanto no backend (segurança).

## Arquitetura

### 1. Single Source of Truth: `features.ts`

**Localização:** `apps/frontend/src/constants/features.ts`

Define todas as features disponíveis no sistema com mapeamento bidirecional:

```typescript
// Chaves técnicas (banco de dados - snake_case)
'medicacoes': 'Prescrições e medicamentos'
'eventos_sentinela': 'Eventos sentinela'

// Labels humanizados (interface - Title Case)
'Prescrições e medicamentos': 'Prescrições e medicamentos'
'Eventos sentinela': 'Eventos sentinela'
```

#### Features CORE (sempre habilitadas)

```typescript
export const CORE_FEATURES = [
  'Gestão de residentes',
  'Gestão de usuários',
  'Prontuário eletrônico',
] as const
```

#### Features Opcionais

- **Clínicos:** medicacoes, sinais_vitais, registros_diarios
- **Conformidade:** conformidade, eventos_sentinela, documentos_institucionais
- **Operações:** agenda, quartos, mapa_leitos, pops
- **Comunicação:** mensagens, alertas

### 2. Backend: Feature Guard

**Localização:** `apps/backend/src/common/guards/feature.guard.ts`

Guard do NestJS que valida se o tenant tem acesso à feature antes de executar a rota.

#### Fluxo de Validação

1. Extrai features requeridas do decorator `@RequireFeatures`
2. Busca subscription ativa do tenant
3. Valida se **TODAS** as features requeridas estão habilitadas no plano
4. SUPERADMIN (tenantId = null) → bypass automático
5. Trial → bypass automático (acesso completo durante trial)

#### Exemplo de Uso

```typescript
@Controller('conformidade')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
export class ComplianceController {
  @Get('eventos-sentinela')
  @RequireFeatures('conformidade', 'eventos_sentinela')
  @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)
  async getSentinelEvents(@CurrentUser() user: any) {
    // Controller logic
  }
}
```

#### Resposta de Erro

```json
{
  "statusCode": 403,
  "message": "Seu plano não inclui: eventos_sentinela. Faça upgrade para acessar."
}
```

### 3. Frontend: Features Store

**Localização:** `apps/frontend/src/stores/features.store.ts`

Zustand store que mantém estado global das features do tenant.

#### State

```typescript
interface FeaturesState {
  plan: string | null              // Nome do plano
  planType: string | null          // Tipo (FREE, BASICO, etc)
  features: Record<string, boolean> // Features habilitadas
  isLoading: boolean
}
```

#### Actions

- `fetchFeatures()` - Busca features do backend (GET /tenants/me/features)
- `hasFeature(key)` - Verifica uma feature
- `hasAllFeatures(keys)` - Verifica se tem TODAS
- `hasAnyFeature(keys)` - Verifica se tem QUALQUER UMA
- `clearFeatures()` - Limpa estado (logout)

#### Persistência

Features são persistidas em `localStorage` para evitar chamadas desnecessárias:

```typescript
persist(
  (set, get) => ({ /* state */ }),
  { name: 'features-store' }
)
```

### 4. Frontend: FeatureGate Component

**Localização:** `apps/frontend/src/components/features/FeatureGate.tsx`

Componente que renderiza children apenas se feature está habilitada.

#### Uso Básico

```tsx
<FeatureGate featureKey="eventos_sentinela">
  <EventosSentinelaPage />
</FeatureGate>
```

#### Props

```typescript
interface FeatureGateProps {
  children: React.ReactNode
  featureKey: string          // Chave técnica (snake_case)
  fallback?: React.ReactNode  // Fallback customizado
  showUpgradeCard?: boolean   // Mostra card de upgrade (default: true)
}
```

#### Comportamento

- ✅ Feature habilitada → renderiza `children`
- ❌ Feature bloqueada + `showUpgradeCard=true` → `<UpgradePlanCard />`
- ❌ Feature bloqueada + `fallback` → renderiza `fallback`
- ❌ Feature bloqueada + nenhum → `null`

### 5. Frontend: useFeatures Hook

**Localização:** `apps/frontend/src/hooks/useFeatures.ts`

Hook que expõe features store e carrega features automaticamente.

#### Uso

```typescript
function MyComponent() {
  const { hasFeature, plan, planType } = useFeatures()

  if (!hasFeature('eventos_sentinela')) {
    return <UpgradePlanCard />
  }

  return <EventosSentinelaPage />
}
```

## Proteção de Rotas

### Padrão: Nested Routes com FeatureGate

```typescript
{
  path: 'pops',
  element: (
    <FeatureGate featureKey="pops">
      <Outlet />
    </FeatureGate>
  ),
  children: [
    { index: true, element: <PopsList /> },
    { path: ':id', element: <PopViewer /> },
  ]
}
```

### Features Compostas

Para módulos que exigem múltiplas features:

```typescript
{
  path: 'eventos-sentinela',
  element: (
    <FeatureGate featureKey="conformidade">
      <FeatureGate featureKey="eventos_sentinela">
        <ProtectedRoute requiredPermissions={[PermissionType.VIEW_SENTINEL_EVENTS]}>
          <EventosSentinelaPage />
        </ProtectedRoute>
      </FeatureGate>
    </FeatureGate>
  )
}
```

## Estratégia de Crescimento: Discovery-Led

### Sidebar Sempre Visível

Features aparecem no sidebar mesmo quando bloqueadas (se usuário tem permissão):

```typescript
// ❌ ERRADO - esconde completamente
{hasFeature('pops') && canViewPops && (
  <SidebarItem to="/pops">POPs</SidebarItem>
)}

// ✅ CORRETO - mostra se tem permissão, valida feature na rota
{canViewPops && (
  <SidebarItem to="/pops">POPs</SidebarItem>
)}
```

### Fluxo de Descoberta

1. Usuário vê feature no sidebar (mesmo sem acesso)
2. Clica no menu
3. Rota protegida com `<FeatureGate>`
4. Mostra `<UpgradePlanCard />` com call-to-action
5. Usuário descobre valor da feature e faz upgrade

## Gestão de Planos (SuperAdmin)

### Interface de Edição

**Localização:** `/superadmin/plans`

#### Seções

1. **Features Core (cinza)** - Locked, sempre habilitadas
2. **Features Ativas (verde)** - Com botão X para remover
3. **Features Disponíveis (azul)** - Clique para adicionar

#### Auto-Injection

Features CORE são automaticamente incluídas ao salvar:

```typescript
const allFeatures = [
  ...Array.from(CORE_FEATURES),
  ...features.filter(f => !CORE_FEATURES.includes(f))
]
```

## Seed Database

**Localização:** `apps/backend/prisma/seed.ts`

Planos são criados apenas com features CORE:

```typescript
const coreFeaturesOnly = {
  residentes: true,
  usuarios: true,
  prontuario: true,
}
```

Features opcionais são adicionadas via SuperAdmin Portal.

## Casos Especiais

### 1. SUPERADMIN (tenantId = null)

```typescript
// Backend: FeatureGuard
if (!user?.tenantId) {
  return true // Acesso total
}

// Frontend: useFeatures
if (!user.tenantId) {
  return { features: { /* todas: true */ } }
}
```

### 2. Trial (status = 'trialing')

```typescript
// Backend: FeatureGuard
if (['trialing', 'TRIAL'].includes(subscription.status)) {
  return true // Acesso completo durante trial
}
```

### 3. Subscription Expirada

```typescript
// Backend
if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
  throw new ForbiddenException('Seu plano não está ativo')
}

// Frontend
// UpgradePlanCard mostra mensagem de renovação
```

## Boas Práticas

### ✅ DO

1. **Sempre use chaves técnicas (snake_case)** em `featureKey` props
2. **Valide no backend** - frontend é apenas UX
3. **Combine com PermissionsGuard** para controle granular
4. **Use FeatureGate em rotas** para proteger acesso
5. **Mantenha sidebar visível** para discovery

### ❌ DON'T

1. **Não confie apenas no frontend** - pode ser burlado
2. **Não esconda features completamente** - perde oportunidade de upsell
3. **Não use labels humanizados** como `featureKey`
4. **Não duplique lógica** - use guards e components
5. **Não adicione features no seed** - use SuperAdmin Portal

## Fluxo Completo

### 1. Nova Feature

1. Adicionar em `features.ts`:
   ```typescript
   'nova_feature': 'Nova Funcionalidade'
   ```

2. Proteger rota:
   ```typescript
   <FeatureGate featureKey="nova_feature">
     <NovaFeaturePage />
   </FeatureGate>
   ```

3. Proteger backend:
   ```typescript
   @RequireFeatures('nova_feature')
   ```

4. Adicionar ao sidebar (sempre visível se tem permissão)

### 2. Configurar Plano

1. Login como SuperAdmin
2. Acessar `/superadmin/plans`
3. Editar plano desejado
4. Clicar em badge azul para adicionar feature
5. Salvar (CORE features auto-incluídas)

### 3. Tenant Upgrade

1. Tenant acessa feature bloqueada
2. Vê `<UpgradePlanCard />`
3. Clica "Fazer Upgrade"
4. Redireciona para `/settings/billing`
5. Seleciona plano superior
6. Features disponibilizadas automaticamente

## Troubleshooting

### Feature não aparece disponível no SuperAdmin

**Causa:** Já está ativa no plano ou é CORE feature

**Solução:** Verificar seção "Features Opcionais Ativas (N)" - deve estar em verde

### Frontend permite acesso mas backend bloqueia

**Causa:** Features store desatualizado

**Solução:**
```typescript
const { refetch } = useFeatures()
refetch() // Força atualização
```

### SUPERADMIN vê UpgradePlanCard

**Causa:** Features store não identificou SUPERADMIN

**Solução:** Verificar se `user.tenantId === null` no token JWT

## Métricas e Monitoramento

### Backend

```typescript
// Log de acessos bloqueados
logger.warn(`Feature blocked: ${featureKey} for tenant ${tenantId}`)
```

### Frontend

```typescript
// Analytics de descoberta
analytics.track('feature_discovery', {
  feature: featureKey,
  plan: currentPlan,
  action: 'clicked_upgrade'
})
```

## Roadmap

### Futuras Melhorias

1. **Feature Usage Analytics** - Métricas de uso por feature
2. **A/B Testing de Preços** - Testar diferentes preços por plano
3. **Trial Limitado** - Trial com subset de features
4. **Add-ons Individuais** - Comprar features avulsas
5. **Feature Flags** - Ativar/desativar features sem deploy

## Referências

- [features.ts](apps/frontend/src/constants/features.ts) - Single Source of Truth
- [feature.guard.ts](apps/backend/src/common/guards/feature.guard.ts) - Backend validation
- [FeatureGate.tsx](apps/frontend/src/components/features/FeatureGate.tsx) - UI component
- [PlansList.tsx](apps/frontend/src/pages/superadmin/PlansList.tsx) - Plan management
- [seed.ts](apps/backend/prisma/seed.ts) - Database seeding
