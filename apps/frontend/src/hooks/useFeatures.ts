import { useEffect } from 'react'
import { useFeaturesStore } from '@/stores/features.store'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook para gerenciar features do plano do tenant
 *
 * Funcionalidades:
 * - Busca features automaticamente ao montar (se autenticado)
 * - Cache de 5 minutos para evitar chamadas repetidas
 * - Helpers para verificar features: hasFeature, hasAllFeatures, hasAnyFeature
 *
 * @example
 * ```tsx
 * function MessagesPage() {
 *   const { hasFeature, plan, isLoading } = useFeatures()
 *
 *   if (isLoading) return <Spinner />
 *   if (!hasFeature('mensagens')) return <UpgradePlanCard />
 *
 *   return <MessagesContent />
 * }
 * ```
 */
export function useFeatures() {
  const { isAuthenticated } = useAuthStore()
  const {
    plan,
    planType,
    features,
    isLoading,
    error,
    fetchFeatures,
    hasFeature,
    hasAllFeatures,
    hasAnyFeature,
    refetch,
  } = useFeaturesStore()

  // Buscar features ao montar (se autenticado e ainda não carregou)
  useEffect(() => {
    if (isAuthenticated && !plan && !isLoading) {
      console.log('🔄 useFeatures - Buscando features do plano...')
      fetchFeatures()
    }
  }, [isAuthenticated, plan, isLoading, fetchFeatures])

  return {
    // State
    plan,
    planType,
    features,
    isLoading,
    error,

    // Helpers
    hasFeature,
    hasAllFeatures,
    hasAnyFeature,

    // Actions
    refetch,
  }
}
