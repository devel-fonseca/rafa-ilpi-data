import { useAvailablePlans } from '@/hooks/useBilling'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function AvailablePlansTab() {
  const { data, isLoading } = useAvailablePlans()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || !data.availablePlans || data.availablePlans.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhum plano disponível para upgrade no momento
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Planos Disponíveis</h2>
        <p className="text-sm text-muted-foreground">
          Faça upgrade do seu plano para aumentar limites e acessar novos recursos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.availablePlans.map((plan: any) => (
          <Card key={plan.id} className="bg-card border-border hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{plan.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                </div>

                <div className="text-3xl font-bold text-foreground">
                  R$ {Number(plan.price).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Residentes:</span>
                    <span className="font-medium text-foreground">{plan.maxResidents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usuários:</span>
                    <span className="font-medium text-foreground">{plan.maxUsers}</span>
                  </div>
                </div>

                {plan.id === data.currentPlan.id ? (
                  <div className="pt-2">
                    <span className="text-sm font-medium text-primary">Plano Atual</span>
                  </div>
                ) : (
                  <div className="pt-2 text-sm text-muted-foreground">
                    Em breve: Botão de upgrade
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
