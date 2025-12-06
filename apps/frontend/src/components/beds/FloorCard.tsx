import { Floor } from '@/api/beds.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Layers, MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface FloorCardProps {
  floor: Floor
  onEdit?: (floor: Floor) => void
  onDelete?: (floor: Floor) => void
  onClick?: (floor: Floor) => void
  canManage?: boolean
}

export function FloorCard({ floor, onEdit, onDelete, onClick, canManage = true }: FloorCardProps) {
  const occupancyRate =
    floor.bedsCount && floor.bedsCount > 0
      ? Math.round(((floor.occupiedBeds || 0) / floor.bedsCount) * 100)
      : 0

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500'
    if (rate >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(floor)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg font-bold">{floor.name}</CardTitle>
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
                  onEdit?.(floor)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                onDelete?.(floor)
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
            <Badge variant="outline">{floor.code}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Andar:</span>
            <Badge>{floor.floorNumber}º</Badge>
          </div>

          {floor.description && (
            <p className="text-sm text-muted-foreground">{floor.description}</p>
          )}

          {floor.building && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prédio:</span>
              <span className="text-sm font-medium">{floor.building.name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-100 rounded-lg p-2">
              <div className="text-2xl font-bold text-slate-700">
                {floor.roomsCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">Quartos</div>
            </div>
            <div className="bg-slate-100 rounded-lg p-2">
              <div className="text-2xl font-bold text-slate-700">
                {floor.bedsCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">Leitos</div>
            </div>
          </div>

          {/* Barra de ocupação */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ocupação</span>
              <span className="font-semibold">{occupancyRate}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getOccupancyColor(occupancyRate)} transition-all`}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ocupados: {floor.occupiedBeds || 0}</span>
              <span>Disponíveis: {floor.availableBeds || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
