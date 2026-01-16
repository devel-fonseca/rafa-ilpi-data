import { useAuthStore } from '@/stores/auth.store'

/**
 * Query Keys Helpers - Multi-Tenant Namespacing
 *
 * Sistema de query keys com namespace por tenant para React Query.
 * Garante isolamento de cache entre tenants.
 *
 * @example
 * // Query key com namespace do tenant atual
 * tenantKey('residents') // → ['t', 'tenant-123', 'residents']
 *
 * // Query key para SuperAdmin (sem namespace)
 * superAdminKey('tenants', 'list') // → ['superadmin', 'tenants', 'list']
 *
 * @see docs/PLANO-MIGRACAO-FRONTEND-DR-E.md
 */

/**
 * Gera chave de escopo por tenant
 *
 * Extrai o tenantId do usuário logado no auth store.
 * Se não houver usuário logado, retorna 'anonymous'.
 *
 * @returns {string} Tenant ID ou 'anonymous'
 *
 * @example
 * getTenantScope() // → 'tenant-abc-123'
 */
export function getTenantScope(): string {
  const user = useAuthStore.getState().user
  return user?.tenantId || 'anonymous'
}

/**
 * Cria query key com namespace do tenant
 *
 * IMPORTANTE: Use esta função para TODAS as queries de dados de tenant.
 * O namespace garante que ao trocar de tenant, o cache anterior não seja reutilizado.
 *
 * @param {...(string | number | undefined)[]} keys - Chaves da query
 * @returns {unknown[]} Array de query key com namespace
 *
 * @example
 * // Listar residentes
 * tenantKey('residents')
 * // → ['t', 'tenant-123', 'residents']
 *
 * @example
 * // Residente específico
 * tenantKey('residents', residentId)
 * // → ['t', 'tenant-123', 'residents', 'res-456']
 *
 * @example
 * // Com filtros (serializar objeto para string)
 * tenantKey('residents', 'list', JSON.stringify(filters))
 * // → ['t', 'tenant-123', 'residents', 'list', '{"status":"active"}']
 *
 * @example
 * // Nested resources
 * tenantKey('residents', residentId, 'medications')
 * // → ['t', 'tenant-123', 'residents', 'res-456', 'medications']
 */
export function tenantKey(...keys: (string | number | undefined)[]): unknown[] {
  const scope = getTenantScope()
  return ['t', scope, ...keys.filter((k) => k !== undefined)]
}

/**
 * Cria query key para SuperAdmin (sem tenant scope)
 *
 * IMPORTANTE: Use APENAS em páginas do portal SuperAdmin (/superadmin/*).
 * SuperAdmin opera em contexto multi-tenant intencional.
 *
 * @param {...(string | number | undefined)[]} keys - Chaves da query
 * @returns {unknown[]} Array de query key sem namespace de tenant
 *
 * @example
 * // Listar todos os tenants
 * superAdminKey('tenants', 'list')
 * // → ['superadmin', 'tenants', 'list']
 *
 * @example
 * // Métricas do sistema
 * superAdminKey('metrics', 'overview')
 * // → ['superadmin', 'metrics', 'overview']
 *
 * @example
 * // Detalhes de um tenant
 * superAdminKey('tenants', tenantId)
 * // → ['superadmin', 'tenants', 'tenant-abc-123']
 */
export function superAdminKey(...keys: (string | number | undefined)[]): unknown[] {
  return ['superadmin', ...keys.filter((k) => k !== undefined)]
}

/**
 * Invalidação de queries por prefixo
 *
 * Helper para invalidar todas as queries que começam com um prefixo.
 * Útil para invalidar todas as queries de um domínio.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - QueryClient do React Query
 * @param {...(string | number | undefined)[]} prefixKeys - Prefixo das keys
 *
 * @example
 * // Invalidar todas as queries de residents do tenant atual
 * invalidateByPrefix(queryClient, 'residents')
 * // Invalida: ['t', 'tenant-123', 'residents', ...]
 *
 * @example
 * // Invalidar residente específico
 * invalidateByPrefix(queryClient, 'residents', residentId)
 * // Invalida: ['t', 'tenant-123', 'residents', 'res-456', ...]
 */
export function invalidateByPrefix(
  queryClient: any, // QueryClient do @tanstack/react-query
  ...prefixKeys: (string | number | undefined)[]
): Promise<void> {
  const queryKey = tenantKey(...prefixKeys)
  return queryClient.invalidateQueries({ queryKey })
}

/**
 * Remove queries do tenant anterior ao trocar
 *
 * IMPORTANTE: Esta função é chamada automaticamente pelo auth.store.ts
 * ao trocar de tenant. NÃO chame manualmente.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - QueryClient do React Query
 * @param {string} oldTenantId - ID do tenant anterior
 *
 * @example
 * // Chamado automaticamente em auth.store.ts selectTenant()
 * removeOldTenantQueries(queryClient, 'tenant-old-123')
 * // Remove todas queries: ['t', 'tenant-old-123', ...]
 */
export function removeOldTenantQueries(
  queryClient: any, // QueryClient do @tanstack/react-query
  oldTenantId: string
): void {
  queryClient.removeQueries({
    predicate: (query: any) => {
      const queryKey = query.queryKey
      return Array.isArray(queryKey) && queryKey[0] === 't' && queryKey[1] === oldTenantId
    },
  })
}

/**
 * Verifica se query pertence ao tenant atual
 *
 * Helper para debug - verifica se uma query key pertence ao tenant logado.
 *
 * @param {unknown[]} queryKey - Query key do React Query
 * @returns {boolean} true se pertence ao tenant atual
 *
 * @example
 * isCurrentTenantQuery(['t', 'tenant-123', 'residents'])
 * // → true (se usuário logado está no tenant-123)
 *
 * @example
 * isCurrentTenantQuery(['t', 'tenant-456', 'residents'])
 * // → false (usuário está em outro tenant)
 */
export function isCurrentTenantQuery(queryKey: unknown[]): boolean {
  const currentScope = getTenantScope()
  return Array.isArray(queryKey) && queryKey[0] === 't' && queryKey[1] === currentScope
}

/**
 * Debug: Lista todas as queries do tenant atual
 *
 * Helper para desenvolvimento - lista todas as queries em cache do tenant atual.
 * Útil para verificar se cache está sendo isolado corretamente.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - QueryClient do React Query
 * @returns {unknown[][]} Array de query keys do tenant atual
 *
 * @example
 * // No console do navegador
 * import { debugTenantQueries } from '@/lib/query-keys'
 * console.log(debugTenantQueries(queryClient))
 * // → [
 * //     ['t', 'tenant-123', 'residents'],
 * //     ['t', 'tenant-123', 'residents', 'res-456'],
 * //     ['t', 'tenant-123', 'beds']
 * //   ]
 */
export function debugTenantQueries(queryClient: any): unknown[][] {
  const currentScope = getTenantScope()
  const cache = queryClient.getQueryCache()
  const allQueries = cache.getAll()

  return allQueries
    .filter((query: any) => {
      const queryKey = query.queryKey
      return Array.isArray(queryKey) && queryKey[0] === 't' && queryKey[1] === currentScope
    })
    .map((query: any) => query.queryKey)
}
