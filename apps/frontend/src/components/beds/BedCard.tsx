import { Bed } from '@/api/beds.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bed as BedIcon, MoreVertical, Pencil, Trash2, UserPlus, UserMinus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBedFromObject } from '@/utils/formatters'

interface BedCardProps {
  bed: Bed
  onEdit?: (bed: Bed) => void
  onDelete?: (bed: Bed) => void
  onAssign?: (bed: Bed) => void
  onUnassign?: (bed: Bed) => void
  onClick?: (bed: Bed) => void
  canManage?: boolean
}

const BED_STATUS_LABELS: Record<string, string> = {
  'Disponível': 'Disponível',
  'Ocupado': 'Ocupado',
  'Manutenção': 'Manutenção',
  'Reservado': 'Reservado',
  DISPONIVEL: 'Disponível',
  OCUPADO: 'Ocupado',
  MANUTENCAO: 'Manutenção',
  RESERVADO: 'Reservado',
}

const BED_STATUS_COLORS: Record<string, string> = {
  'Disponível': 'bg-success/10 text-success/90',
  'Ocupado': 'bg-danger/10 text-danger/90',
  'Manutenção': 'bg-warning/10 text-warning/90',
  'Reservado': 'bg-primary/10 text-primary/90',
  DISPONIVEL: 'bg-success/10 text-success/90',
  OCUPADO: 'bg-danger/10 text-danger/90',
  MANUTENCAO: 'bg-warning/10 text-warning/90',
  RESERVADO: 'bg-primary/10 text-primary/90',
}

export function BedCard({ bed, onEdit, onDelete, onAssign, onUnassign, onClick, canManage = true }: BedCardProps) {
  const isOccupied = bed.status === 'OCUPADO' && bed.resident

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(bed)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <BedIcon className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-lg font-bold">{formatBedFromObject(bed)}</CardTitle>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            {bed.status === 'DISPONIVEL' && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAssign?.(bed)
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Atribuir Residente
              </DropdownMenuItem>
            )}
            {bed.status === 'OCUPADO' && bed.residentId && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onUnassign?.(bed)
                }}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Desocupar Leito
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(bed)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(bed)
              }}
              className="text-danger"
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
            <Badge variant="outline">{formatBedFromObject(bed)}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={BED_STATUS_COLORS[bed.status]}>
              {BED_STATUS_LABELS[bed.status]}
            </Badge>
          </div>

          {bed.room && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>{bed.room.floor?.building?.name && `Prédio: ${bed.room.floor.building.name}`}</div>
              <div>Quarto {bed.room.roomNumber} - {bed.room.floor?.name}</div>
            </div>
          )}

          {/* Informações do Residente (se ocupado) */}
          {isOccupied && bed.resident && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={bed.resident.fotoUrl} />
                  <AvatarFallback>
                    {bed.resident.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bed.resident.fullName}</p>
                  {bed.occupiedSince && (
                    <p className="text-xs text-muted-foreground">
                      Desde{' '}
                      {format(new Date(bed.occupiedSince), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {bed.observations && (
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground">{bed.observations}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
