import { Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFeatures } from '@/hooks/useFeatures'
import { FEATURES_MAP } from '@/constants/features'

/**
 * Card que exibe todas as features incluídas no plano atual do tenant
 *
 * Mostra:
 * - Nome do plano
 * - Tipo do plano
 * - Lista de features habilitadas (com ✓)
 * - Lista de features desabilitadas (com ✗)
 *
 * @example
 * ```tsx
 * <PlanFeaturesCard />
 * ```
 */
export function PlanFeaturesCard() {
  const { plan, planType, features, isLoading } = useFeatures()

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

  // Separar features habilitadas e desabilitadas
  // Pegar apenas chaves técnicas (snake_case ou lowercase sem espaços/acentos)
  // Exclui labels humanizados que começam com maiúscula
  const allFeatureKeys = Object.keys(FEATURES_MAP).filter(
    key => key === key.toLowerCase() && !key.includes(' ')
  )
  const enabledFeatures = allFeatureKeys.filter(key => features[key] === true)
  const disabledFeatures = allFeatureKeys.filter(key => features[key] !== true)

  // Badge color baseado no tipo de plano
  const planBadgeVariant = () => {
    const type = planType?.toUpperCase()
    if (type === 'SUPERADMIN') return 'default'
    if (type === 'ENTERPRISE') return 'default'
    if (type === 'PROFISSIONAL') return 'secondary'
    if (type === 'BASICO') return 'outline'
    return 'outline'
  }

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
        <div className="space-y-6">
          {/* Features Habilitadas */}
          {enabledFeatures.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Recursos Incluídos ({enabledFeatures.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {enabledFeatures.map((key) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{FEATURES_MAP[key] || key}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features Desabilitadas */}
          {disabledFeatures.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Não Incluídos ({disabledFeatures.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {disabledFeatures.map((key) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <X className="h-4 w-4 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                    <span className="line-through">{FEATURES_MAP[key] || key}</span>
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
