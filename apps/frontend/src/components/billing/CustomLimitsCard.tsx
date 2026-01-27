import { TrendingUp, Users, UserCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFeaturesStore } from '@/stores/features.store'
import { useMySubscription } from '@/hooks/useTenant'

/**
 * Card que exibe limites customizados aplicados ao plano do tenant
 *
 * Mostra apenas se há customizações de limites (maxUsers ou maxResidents maiores que o plano base)
 *
 * @example
 * ```tsx
 * <CustomLimitsCard />
 * ```
 */
export function CustomLimitsCard() {
  const { customOverrides, hasCustomizations } = useFeaturesStore()
  const { data: subscriptionData } = useMySubscription()

  // Não mostrar se não há customizações
  if (!hasCustomizations || !customOverrides) {
    return null
  }

  const { customMaxUsers, customMaxResidents } = customOverrides

  // Não mostrar se não há limites customizados
  if (customMaxUsers === null && customMaxResidents === null) {
    return null
  }

  // Limites base do plano (do snapshot)
  const baseLimits = subscriptionData?.plan || null

  return (
    <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Limites Aprimorados
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Sua instituição recebeu limites maiores que o plano padrão
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Limite de Usuários */}
          {customMaxUsers !== null && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Usuários</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {customMaxUsers === -1 ? '∞ Ilimitado' : customMaxUsers}
                  </span>
                </div>
                {baseLimits && baseLimits.maxUsers !== customMaxUsers && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Plano padrão: {baseLimits.maxUsers === -1 ? 'Ilimitado' : baseLimits.maxUsers} usuários
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Limite de Residentes */}
          {customMaxResidents !== null && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Residentes</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {customMaxResidents === -1 ? '∞ Ilimitado' : customMaxResidents}
                  </span>
                </div>
                {baseLimits && baseLimits.maxResidents !== customMaxResidents && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Plano padrão: {baseLimits.maxResidents === -1 ? 'Ilimitado' : baseLimits.maxResidents} residentes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mensagem de valorização */}
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>✨ Benefício especial:</strong> Estes limites foram ajustados pela nossa equipe para melhor atender sua instituição. Aproveite!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
