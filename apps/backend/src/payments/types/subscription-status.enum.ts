/**
 * SubscriptionStatus
 *
 * Enum padronizado para status de subscriptions.
 *
 * IMPORTANTE: A API Asaas retorna status em lowercase ('active', 'trialing', etc),
 * enquanto este enum usa UPPERCASE para consistência com o código interno.
 *
 * Use o helper `normalizeSubscriptionStatus()` para converter status
 * vindos de fontes externas (Asaas, webhooks) para o formato padronizado.
 */
export enum SubscriptionStatus {
  /** Trial ativo - período de teste gratuito */
  TRIALING = 'TRIALING',

  /** Subscription ativa - pagamento em dia */
  ACTIVE = 'ACTIVE',

  /** Pagamento atrasado - subscription ainda válida mas com cobrança pendente */
  PAST_DUE = 'PAST_DUE',

  /** Subscription cancelada pelo tenant ou por inadimplência */
  CANCELED = 'CANCELED',

  /** Subscription não paga - suspensa por falta de pagamento */
  UNPAID = 'UNPAID',

  /** Subscription incompleta - criada mas não finalizada */
  INCOMPLETE = 'INCOMPLETE',
}

/**
 * Mapeia status da API Asaas para o enum padronizado
 *
 * Asaas retorna: 'active', 'trialing', 'canceled', etc (lowercase)
 * Retornamos: 'ACTIVE', 'TRIALING', 'CANCELED', etc (UPPERCASE)
 *
 * @param asaasStatus - Status vindo da API Asaas
 * @returns Status normalizado em UPPERCASE
 */
export function normalizeSubscriptionStatus(
  asaasStatus: string | null | undefined
): SubscriptionStatus {
  if (!asaasStatus) {
    return SubscriptionStatus.INCOMPLETE
  }

  const normalized = asaasStatus.toUpperCase()

  // Mapear valores conhecidos
  switch (normalized) {
    case 'TRIALING':
      return SubscriptionStatus.TRIALING
    case 'ACTIVE':
      return SubscriptionStatus.ACTIVE
    case 'PAST_DUE':
      return SubscriptionStatus.PAST_DUE
    case 'CANCELED':
    case 'CANCELLED': // Variação britânica
      return SubscriptionStatus.CANCELED
    case 'UNPAID':
      return SubscriptionStatus.UNPAID
    case 'INCOMPLETE':
      return SubscriptionStatus.INCOMPLETE
    default:
      // Log warning para status desconhecido
      console.warn(`Unknown subscription status from Asaas: "${asaasStatus}"`)
      return SubscriptionStatus.INCOMPLETE
  }
}

/**
 * Verifica se um status indica subscription ativa/válida
 *
 * Subscriptions ativas ou em trial são consideradas válidas.
 *
 * @param status - Status a verificar
 * @returns true se subscription está ativa ou em trial
 */
export function isActiveSubscription(status: string): boolean {
  const normalized = normalizeSubscriptionStatus(status)
  return (
    normalized === SubscriptionStatus.ACTIVE ||
    normalized === SubscriptionStatus.TRIALING
  )
}

/**
 * Array com todos os status que indicam subscription válida/ativa
 * Útil para queries Prisma com `in: ACTIVE_STATUSES`
 *
 * IMPORTANTE: Não usar 'as const' para permitir mutabilidade exigida pelo Prisma
 */
export const ACTIVE_STATUSES: string[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  // Incluir variações lowercase para compatibilidade com dados legados
  'active',
  'trialing',
]
