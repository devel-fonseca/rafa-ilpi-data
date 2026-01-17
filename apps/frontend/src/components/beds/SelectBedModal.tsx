import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, DoorOpen, Bed as BedIcon, Check, Search, Filter } from 'lucide-react'
import { BedsHierarchy } from '@/api/beds.api'
import { formatBedFromObject } from '@/utils/formatters'

interface BedEntity {
  id: string
  code: string
  status: string
  [key: string]: unknown
}

interface RoomEntity {
  id: string
  name: string
  roomType?: string
  [key: string]: unknown
}

interface FloorEntity {
  id: string
  name: string
  [key: string]: unknown
}

interface BuildingEntity {
  id: string
  name: string
  [key: string]: unknown
}

interface SelectBedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentName: string
  currentBedId: string
  data: BedsHierarchy
  onSelectBed: (bed: BedEntity, room: RoomEntity, floor: FloorEntity, building: BuildingEntity) => void
}

type FilterScope = 'same-room' | 'same-floor' | 'same-building' | 'all'

interface AvailableBed {
  bed: BedEntity
  room: RoomEntity
  floor: FloorEntity
  building: BuildingEntity
  distance: number // 0 = mesmo quarto, 1 = mesmo andar, 2 = mesmo prédio, 3 = outro prédio
}

const BED_STATUS_COLORS: Record<string, string> = {
  'Disponível': 'bg-success/10 text-success/95 border-success',
  'Ocupado': 'bg-danger/10 text-danger/90 border-danger',
  'Manutenção': 'bg-warning/10 text-warning/95 border-warning',
  'Reservado': 'bg-primary/10 text-primary/95 border-primary',
}

export function SelectBedModal({
  open,
  onOpenChange,
  residentName,
  currentBedId,
  data,
  onSelectBed,
}: SelectBedModalProps) {
  const [selectedBed, setSelectedBed] = useState<AvailableBed | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterScope, setFilterScope] = useState<FilterScope>('same-floor')

  // Encontrar leito atual e coletar todos os leitos disponíveis
  const { availableBeds } = useMemo(() => {
    let currentBedInfo: { roomId?: string; floorId?: string; buildingId?: string } = {}
    const beds: AvailableBed[] = []

    data.buildings.forEach((building) => {
      building.floors?.forEach((floor) => {
        floor.rooms?.forEach((room) => {
          room.beds?.forEach((bed) => {
            // Encontrar informações do leito atual
            if (bed.id === currentBedId) {
              currentBedInfo = {
                roomId: room.id,
                floorId: floor.id,
                buildingId: building.id,
              }
            }

            // Coletar apenas leitos disponíveis (exceto o atual)
            if (bed.status === 'Disponível' && bed.id !== currentBedId) {
              let distance = 3 // Outro prédio (padrão)

              if (currentBedInfo.buildingId === building.id) {
                distance = 2 // Mesmo prédio
                if (currentBedInfo.floorId === floor.id) {
                  distance = 1 // Mesmo andar
                  if (currentBedInfo.roomId === room.id) {
                    distance = 0 // Mesmo quarto
                  }
                }
              }

              beds.push({ bed, room, floor, building, distance })
            }
          })
        })
      })
    })

    return { currentBedInfo, availableBeds: beds }
  }, [data, currentBedId])

  // Filtrar leitos baseado no escopo e busca
  const filteredBeds = useMemo(() => {
    let filtered = availableBeds

    // Filtro por escopo (proximidade)
    if (filterScope === 'same-room') {
      filtered = filtered.filter((b) => b.distance === 0)
    } else if (filterScope === 'same-floor') {
      filtered = filtered.filter((b) => b.distance <= 1)
    } else if (filterScope === 'same-building') {
      filtered = filtered.filter((b) => b.distance <= 2)
    }
    // 'all' não filtra por distância

    // Filtro por busca (código do leito)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((b) =>
        b.bed.code.toLowerCase().includes(query) ||
        b.room.name.toLowerCase().includes(query) ||
        b.floor.name.toLowerCase().includes(query) ||
        b.building.name.toLowerCase().includes(query)
      )
    }

    // Ordenar: mais próximos primeiro, depois por código
    return filtered.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance
      return a.bed.code.localeCompare(b.bed.code)
    })
  }, [availableBeds, filterScope, searchQuery])

  // Agrupar leitos por contexto
  const groupedBeds = useMemo(() => {
    const groups: Map<string, AvailableBed[]> = new Map()

    filteredBeds.forEach((bedInfo) => {
      const key = `${bedInfo.building.name} - ${bedInfo.floor.name}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(bedInfo)
    })

    return Array.from(groups.entries())
  }, [filteredBeds])

  const handleSelectBed = (bedInfo: AvailableBed) => {
    setSelectedBed(bedInfo)
  }

  const handleConfirm = () => {
    if (!selectedBed) return
    onSelectBed(
      selectedBed.bed,
      selectedBed.room,
      selectedBed.floor,
      selectedBed.building
    )
    setSelectedBed(null)
    setSearchQuery('')
  }

  const handleCancel = () => {
    setSelectedBed(null)
    setSearchQuery('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Leito de Destino</DialogTitle>
          <DialogDescription>
            Escolha um leito disponível para transferir <strong>{residentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Filtros e Busca */}
        <div className="space-y-3 pb-3 border-b">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código do leito (ex: A-101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro de Escopo */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterScope} onValueChange={(value) => setFilterScope(value as FilterScope)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same-room">
                  Mesmo quarto {availableBeds.filter(b => b.distance === 0).length > 0 &&
                    `(${availableBeds.filter(b => b.distance === 0).length})`}
                </SelectItem>
                <SelectItem value="same-floor">
                  Mesmo andar {availableBeds.filter(b => b.distance <= 1).length > 0 &&
                    `(${availableBeds.filter(b => b.distance <= 1).length})`}
                </SelectItem>
                <SelectItem value="same-building">
                  Mesmo prédio {availableBeds.filter(b => b.distance <= 2).length > 0 &&
                    `(${availableBeds.filter(b => b.distance <= 2).length})`}
                </SelectItem>
                <SelectItem value="all">
                  Todos os leitos disponíveis ({availableBeds.length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between text-sm">
            <Badge variant="secondary" className="font-normal">
              {filteredBeds.length} {filteredBeds.length === 1 ? 'leito encontrado' : 'leitos encontrados'}
            </Badge>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        </div>

        {/* Lista de Leitos */}
        <div className="flex-1 overflow-y-auto pr-2">
          {groupedBeds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BedIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum leito disponível encontrado</p>
              {filterScope !== 'all' && (
                <button
                  onClick={() => setFilterScope('all')}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Expandir busca para todos os prédios
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedBeds.map(([groupKey, beds]) => (
                <div key={groupKey}>
                  {/* Header do Grupo */}
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{groupKey}</span>
                    <Badge variant="outline" className="text-xs">
                      {beds.length}
                    </Badge>
                  </div>

                  {/* Grid de Leitos */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {beds.map((bedInfo) => {
                      const isSelected = selectedBed?.bed.id === bedInfo.bed.id

                      return (
                        <Card
                          key={bedInfo.bed.id}
                          className={`border-2 transition-all cursor-pointer ${
                            BED_STATUS_COLORS[bedInfo.bed.status] || 'bg-muted'
                          } ${
                            isSelected
                              ? 'ring-4 ring-blue-600 shadow-lg scale-105'
                              : 'hover:shadow-md hover:scale-102'
                          }`}
                          onClick={() => handleSelectBed(bedInfo)}
                        >
                          <CardContent className="p-3 relative">
                            {isSelected && (
                              <div className="absolute top-1 right-1">
                                <div className="bg-primary/60 rounded-full p-0.5">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            )}

                            <div className="flex items-start gap-2">
                              <BedIcon className="h-4 w-4 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold font-mono text-sm">
                                  {formatBedFromObject(bedInfo.bed)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <DoorOpen className="h-3 w-3" />
                                  <span className="truncate">{bedInfo.room.name}</span>
                                </div>
                                {bedInfo.room.roomType && (
                                  <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">
                                    {bedInfo.room.roomType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com Botões */}
        <div className="flex gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedBed}
            className="flex-1"
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
