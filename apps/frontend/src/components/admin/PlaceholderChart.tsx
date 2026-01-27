import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface PlaceholderChartProps {
  title?: string
  description?: string
}

/**
 * PlaceholderChart
 *
 * Componente placeholder para indicar espaço para futuros gráficos.
 * Exibe mensagem amigável sobre expansão futura.
 */
export function PlaceholderChart({
  title = 'Análise Adicional',
  description = 'Em breve',
}: PlaceholderChartProps) {
  return (
    <Card className="bg-card border-border border-dashed">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex flex-col items-center justify-center gap-3">
          <div className="text-6xl opacity-20">📊</div>
          <p className="text-sm text-muted-foreground text-center">
            Espaço reservado para análises futuras
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
