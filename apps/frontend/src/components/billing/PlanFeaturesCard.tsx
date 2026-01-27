import { Check, Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFeaturesStore } from '@/stores/features.store'
import { FEATURES_MAP } from '@/constants/features'
import { useEffect } from 'react'

/**
 * Card que exibe todas as features incluídas no plano atual do tenant
 *
 * Mostra:
 * - Nome do plano
 * - Tipo do plano
 * - Features assinadas (do snapshot)
 * - Features adicionadas via customização (se houver)
 *
 * IMPORTANTE: Não expõe o conceito de "CORE" features para o tenant admin.
 * Todas as features são mostradas como parte do plano/customização.
 *
 * @example
 * ```tsx
 * <PlanFeaturesCard />
 * ```
 */
export function PlanFeaturesCard() {
  const {
    plan,
    planType,
    features,
    subscribedFeatures,
    customOverrides,
    hasCustomizations,
    isLoading,
    fetchFeatures,
  } = useFeaturesStore()

  // Garantir que os dados estão carregados
  useEffect(() => {
    if (!plan && !isLoading) {
      fetchFeatures()
    }
  }, [plan, isLoading, fetchFeatures])

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recursos do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!plan || !features) {
    return null
  }

  // Badge color baseado no tipo de plano
  const planBadgeVariant = () => {
    const type = planType?.toUpperCase()
    if (type === 'SUPERADMIN') return 'default'
    if (type === 'ENTERPRISE') return 'default'
    if (type === 'PROFISSIONAL') return 'secondary'
    if (type === 'BASICO') return 'outline'
    return 'outline'
  }

  // Obter labels humanizados para as features
  const getFeatureName = (key: string): string => FEATURES_MAP[key] || key

  // Se não há customizações, mostrar simplesmente todas as features
  if (!hasCustomizations || !subscribedFeatures || !customOverrides) {
    // Pegar apenas chaves técnicas (snake_case)
    const allFeatureKeys = Object.keys(features).filter(
      key => key === key.toLowerCase() && !key.includes(' ')
    )

    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Recursos do Plano</CardTitle>
            <Badge variant={planBadgeVariant()}>
              {plan}
            </Badge>
          </div>
          <CardDescription>
            Funcionalidades incluídas na sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Recursos Incluídos ({allFeatureKeys.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allFeatureKeys.map((key) => (
                <div
                  key={key}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{getFeatureName(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se há customizações, separar features assinadas das adicionadas
  const subscribedKeys = Object.keys(subscribedFeatures).filter(
    key => subscribedFeatures[key] === true && key === key.toLowerCase() && !key.includes(' ')
  )

  // Features adicionadas via customização (não estavam no subscribed)
  const addedFeatures: string[] = []
  Object.entries(customOverrides.customFeatures).forEach(([key, value]) => {
    if (value === true && !subscribedFeatures[key]) {
      addedFeatures.push(key)
    }
  })

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Recursos do Plano</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={planBadgeVariant()}>
              {plan}
            </Badge>
            {hasCustomizations && (
              <span title="Plano customizado" className="text-lg">🎯</span>
            )}
          </div>
        </div>
        <CardDescription>
          Funcionalidades incluídas na sua assinatura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Features Assinadas */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Incluídos no seu plano ({subscribedKeys.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subscribedKeys.map((key) => (
                <div
                  key={key}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{getFeatureName(key)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Features Adicionadas */}
          {addedFeatures.length > 0 && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Recursos adicionais ({addedFeatures.length})
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Estes recursos foram adicionados especialmente para você pela nossa equipe
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {addedFeatures.map((key) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400"
                  >
                    <Plus className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{getFeatureName(key)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
