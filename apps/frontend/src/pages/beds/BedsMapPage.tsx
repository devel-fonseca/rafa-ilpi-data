import { useBedsHierarchy } from '@/hooks/useBedsMap'
import { OccupancyStats } from '@/components/beds/OccupancyStats'
import { BedsMapVisualization } from '@/components/beds/BedsMapVisualization'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function BedsMapPage() {
  const { data, isLoading, error } = useBedsHierarchy()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          Erro ao carregar o mapa de leitos. Tente novamente mais tarde.
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum dado disponível.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mapa de Leitos</h1>
        <p className="text-muted-foreground">
          Visualização hierárquica completa da estrutura de leitos
        </p>
      </div>

      {/* Estatísticas de Ocupação */}
      <OccupancyStats stats={data.stats} />

      {/* Mapa Hierárquico */}
      <BedsMapVisualization data={data} />
    </div>
  )
}
