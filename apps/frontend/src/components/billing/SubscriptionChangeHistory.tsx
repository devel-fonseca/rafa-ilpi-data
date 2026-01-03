import { useSubscriptionChangeHistory } from '@/hooks/useBilling'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Settings } from 'lucide-react'

export function SubscriptionChangeHistory() {
  const { data, isLoading } = useSubscriptionChangeHistory(3)

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Mudanças de Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return null // Não exibe se não houver histórico
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Histórico de Mudanças de Plano
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.data.map((change: any) => {
            const isSelfService = change.source === 'SELF_SERVICE'
            const date = new Date(change.date)

            return (
              <div
                key={change.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 dark:bg-muted/20"
              >
                {/* Ícone indicador */}
                <div
                  className={`mt-0.5 p-2 rounded-full ${
                    isSelfService
                      ? 'bg-blue-100 dark:bg-blue-950/50'
                      : 'bg-purple-100 dark:bg-purple-950/50'
                  }`}
                >
                  {isSelfService ? (
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={isSelfService ? 'default' : 'secondary'}
                      className={
                        isSelfService
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                      }
                    >
                      {isSelfService ? 'Self-Service' : 'Ajustado pelo Suporte'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-foreground line-clamp-2">{change.message}</p>

                  {change.reason && !isSelfService && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Motivo: {change.reason}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {data.meta.total >= 3 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Exibindo as 3 mudanças mais recentes
          </p>
        )}
      </CardContent>
    </Card>
  )
}
