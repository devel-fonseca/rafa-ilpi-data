import React from 'react'
import { Loader2 } from 'lucide-react'
import { useFeatures } from '@/hooks/useFeatures'
import { UpgradePlanCard } from './UpgradePlanCard'
import { FEATURES_MAP } from '@/constants/features'

interface FeatureGateProps {
  children: React.ReactNode
  featureKey: string
  fallback?: React.ReactNode
  showUpgradeCard?: boolean
}

/**
 * Componente que renderiza children apenas se a feature está habilitada no plano
 *
 * Funciona como um "portão" que valida se o tenant tem acesso à feature.
 * Se não tiver, pode exibir:
 * - UpgradePlanCard (padrão)
 * - Componente customizado via fallback
 * - null (se showUpgradeCard = false)
 *
 * @example
 * ```tsx
 * // Uso básico (com card de upgrade padrão)
 * <FeatureGate featureKey="mensagens">
 *   <MessagesPage />
 * </FeatureGate>
 *
 * // Com fallback customizado
 * <FeatureGate
 *   featureKey="eventos_sentinela"
 *   fallback={<CustomBlockedMessage />}
 * >
 *   <SentinelEventsPage />
 * </FeatureGate>
 *
 * // Ocultando completamente (sem card)
 * <FeatureGate featureKey="agenda" showUpgradeCard={false}>
 *   <AgendaMenuItem />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  children,
  featureKey,
  fallback,
  showUpgradeCard = true,
}: FeatureGateProps) {
  const { hasFeature, isLoading, plan, planType } = useFeatures()

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Verificar se tem a feature
  const hasAccess = hasFeature(featureKey)

  if (!hasAccess) {
    // Se tem fallback customizado, usar ele
    if (fallback) {
      return <>{fallback}</>
    }

    // Se deve mostrar card de upgrade, exibir
    if (showUpgradeCard) {
      const featureName = FEATURES_MAP[featureKey] || featureKey
      return (
        <UpgradePlanCard
          featureName={featureName}
          currentPlan={plan || 'Free'}
          planType={planType || 'FREE'}
        />
      )
    }

    // Caso contrário, não renderizar nada
    return null
  }

  // Tem acesso → renderizar children
  return <>{children}</>
}
