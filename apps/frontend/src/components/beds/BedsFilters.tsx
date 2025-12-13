import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BedsFiltersProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void

  // Para filtros hierárquicos
  showBuildingFilter?: boolean
  buildings?: Array<{ id: string; name: string; code: string }>
  selectedBuildingId?: string
  onBuildingChange?: (value: string) => void

  showFloorFilter?: boolean
  floors?: Array<{ id: string; name: string; code: string; buildingId?: string }>
  selectedFloorId?: string
  onFloorChange?: (value: string) => void

  showRoomFilter?: boolean
  rooms?: Array<{ id: string; name: string; code: string; floorId?: string }>
  selectedRoomId?: string
  onRoomChange?: (value: string) => void
}

export function BedsFilters({
  searchPlaceholder = "Buscar por nome ou código...",
  searchValue,
  onSearchChange,
  showBuildingFilter,
  buildings,
  selectedBuildingId,
  onBuildingChange,
  showFloorFilter,
  floors,
  selectedFloorId,
  onFloorChange,
  showRoomFilter,
  rooms,
  selectedRoomId,
  onRoomChange,
}: BedsFiltersProps) {
  const hasActiveFilters = searchValue || selectedBuildingId || selectedFloorId || selectedRoomId

  const clearFilters = () => {
    onSearchChange('')
    if (onBuildingChange) onBuildingChange('')
    if (onFloorChange) onFloorChange('')
    if (onRoomChange) onRoomChange('')
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-wrap gap-3">
        {/* Busca por texto */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro por prédio */}
        {showBuildingFilter && buildings && (
          <Select
            value={selectedBuildingId || 'all'}
            onValueChange={(value) => onBuildingChange?.(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os prédios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os prédios</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name} ({building.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro por andar */}
        {showFloorFilter && floors && (
          <Select
            value={selectedFloorId || 'all'}
            onValueChange={(value) => onFloorChange?.(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os andares" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os andares</SelectItem>
              {floors
                .filter(floor => !selectedBuildingId || floor.buildingId === selectedBuildingId)
                .map((floor) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name} ({floor.code})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro por quarto */}
        {showRoomFilter && rooms && (
          <Select
            value={selectedRoomId || 'all'}
            onValueChange={(value) => onRoomChange?.(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os quartos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os quartos</SelectItem>
              {rooms
                .filter(room => !selectedFloorId || room.floorId === selectedFloorId)
                .map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} ({room.code})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {/* Botão limpar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}