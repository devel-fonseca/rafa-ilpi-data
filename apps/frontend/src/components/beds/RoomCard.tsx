import { Room } from '@/api/beds.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DoorOpen, MoreVertical, Pencil, Trash2, Bath, Accessibility } from 'lucide-react'

interface RoomCardProps {
  room: Room
  onEdit?: (room: Room) => void
  onDelete?: (room: Room) => void
  onClick?: (room: Room) => void
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  DUPLO: 'Duplo',
  TRIPLO: 'Triplo',
  COLETIVO: 'Coletivo',
}

const ROOM_TYPE_COLORS: Record<string, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-800',
  DUPLO: 'bg-green-100 text-green-800',
  TRIPLO: 'bg-yellow-100 text-yellow-800',
  COLETIVO: 'bg-purple-100 text-purple-800',
}

export function RoomCard({ room, onEdit, onDelete, onClick }: RoomCardProps) {
  const occupancyRate =
    room.capacity > 0 ? Math.round(((room.occupiedBeds || 0) / room.capacity) * 100) : 0

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500'
    if (rate >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(room)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg font-bold">{room.name}</CardTitle>
        </div>
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
                onEdit?.(room)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(room)
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Código:</span>
            <Badge variant="outline">{room.code}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Número:</span>
            <Badge>{room.roomNumber}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <Badge className={ROOM_TYPE_COLORS[room.roomType]}>
              {ROOM_TYPE_LABELS[room.roomType]}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Capacidade:</span>
            <span className="text-sm font-medium">{room.capacity} leitos</span>
          </div>

          {/* Ícones de recursos */}
          <div className="flex gap-2">
            {room.hasPrivateBathroom && (
              <Badge variant="secondary" className="text-xs">
                <Bath className="h-3 w-3 mr-1" />
                Banheiro
              </Badge>
            )}
            {room.accessible && (
              <Badge variant="secondary" className="text-xs">
                <Accessibility className="h-3 w-3 mr-1" />
                Acessível
              </Badge>
            )}
          </div>

          {room.observations && (
            <p className="text-sm text-muted-foreground">{room.observations}</p>
          )}

          {room.floor && (
            <div className="text-xs text-muted-foreground">
              {room.floor.building?.name} - {room.floor.name}
            </div>
          )}

          {/* Estatísticas de leitos */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-100 rounded-lg p-2">
              <div className="text-xl font-bold text-green-700">
                {room.availableBeds || 0}
              </div>
              <div className="text-xs text-muted-foreground">Disponíveis</div>
            </div>
            <div className="bg-red-100 rounded-lg p-2">
              <div className="text-xl font-bold text-red-700">
                {room.occupiedBeds || 0}
              </div>
              <div className="text-xs text-muted-foreground">Ocupados</div>
            </div>
            <div className="bg-slate-100 rounded-lg p-2">
              <div className="text-xl font-bold text-slate-700">{room.totalBeds || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
