import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Layers, Bed, CheckCircle } from 'lucide-react'

interface OccupancyStatsProps {
  stats: {
    totalBuildings: number
    totalFloors: number
    totalRooms: number
    totalBeds: number
    occupiedBeds: number
    availableBeds: number
    maintenanceBeds: number
    reservedBeds: number
  }
}

export function OccupancyStats({ stats }: OccupancyStatsProps) {
  const occupancyRate =
    stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Estrutura */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estrutura</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Prédios:</span>
              <span className="font-bold">{stats.totalBuildings}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Andares:</span>
              <span className="font-bold">{stats.totalFloors}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quartos:</span>
              <span className="font-bold">{stats.totalRooms}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total de Leitos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Leitos</CardTitle>
          <Bed className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBeds}</div>
          <p className="text-xs text-muted-foreground mt-1">Capacidade total</p>
        </CardContent>
      </Card>

      {/* Taxa de Ocupação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{occupancyRate}%</div>
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status dos Leitos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status dos Leitos</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Disponíveis:</span>
              </div>
              <span className="font-bold">{stats.availableBeds}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-danger" />
                <span className="text-muted-foreground">Ocupados:</span>
              </div>
              <span className="font-bold">{stats.occupiedBeds}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-muted-foreground">Manutenção:</span>
              </div>
              <span className="font-bold">{stats.maintenanceBeds}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Reservados:</span>
              </div>
              <span className="font-bold">{stats.reservedBeds}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
