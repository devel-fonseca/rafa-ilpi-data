import { Building } from '@/api/beds.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface BuildingCardProps {
  building: Building
  onEdit?: (building: Building) => void
  onDelete?: (building: Building) => void
  onClick?: (building: Building) => void
  onNavigateFloors?: (building: Building) => void
  onNavigateRooms?: (building: Building) => void
  onNavigateBeds?: (building: Building) => void
  canManage?: boolean
}

export function BuildingCard({ building, onEdit, onDelete, onClick, onNavigateFloors, onNavigateRooms, onNavigateBeds, canManage = true }: BuildingCardProps) {
  const occupancyRate =
    building.totalBeds && building.totalBeds > 0
      ? Math.round(((building.occupiedBeds || 0) / building.totalBeds) * 100)
      : 0

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500'
    if (rate >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(building)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg font-bold">{building.name}</CardTitle>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(building)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(building)
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Código:</span>
            <Badge variant="outline">{building.code}</Badge>
          </div>

          {building.description && (
            <p className="text-sm text-muted-foreground">{building.description}</p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigateFloors?.(building)
              }}
              className="bg-muted/50 hover:bg-muted/70 rounded-lg p-2 transition-colors cursor-pointer"
            >
              <div className="text-2xl font-bold">
                {building.totalFloors || 0}
              </div>
              <div className="text-xs text-muted-foreground">Andares</div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigateRooms?.(building)
              }}
              className="bg-muted/50 hover:bg-muted/70 rounded-lg p-2 transition-colors cursor-pointer"
            >
              <div className="text-2xl font-bold">
                {building.totalRooms || 0}
              </div>
              <div className="text-xs text-muted-foreground">Quartos</div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigateBeds?.(building)
              }}
              className="bg-muted/50 hover:bg-muted/70 rounded-lg p-2 transition-colors cursor-pointer"
            >
              <div className="text-2xl font-bold">
                {building.totalBeds || 0}
              </div>
              <div className="text-xs text-muted-foreground">Leitos</div>
            </button>
          </div>

          {/* Barra de ocupação */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ocupação</span>
              <span className="font-semibold">{occupancyRate}%</span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getOccupancyColor(occupancyRate)} transition-all`}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ocupados: {building.occupiedBeds || 0}</span>
              <span>Disponíveis: {building.availableBeds || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
