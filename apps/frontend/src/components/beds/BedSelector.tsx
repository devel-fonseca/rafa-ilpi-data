import { useEffect, useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Home, Layers, DoorOpen, Bed } from 'lucide-react'
import { useBuildings } from '@/hooks/useBuildings'
import { useFloors } from '@/hooks/useFloors'
import { useRooms } from '@/hooks/useRooms'
import { useBeds } from '@/hooks/useBeds'
import { formatBedIdentification } from '@/utils/formatters'

interface BedSelectorProps {
  value?: string // bedId
  onChange: (bedId: string | undefined) => void
  disabled?: boolean
  showOnlyAvailable?: boolean // Para mostrar apenas leitos disponíveis
  currentResidentBedId?: string // Para permitir selecionar o leito atual do residente ao editar
}

export function BedSelector({
  value,
  onChange,
  disabled = false,
  showOnlyAvailable = true,
  currentResidentBedId,
}: BedSelectorProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('')
  const [selectedFloorId, setSelectedFloorId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [selectedBedId, setSelectedBedId] = useState<string>('')

  // Buscar dados
  const { data: buildings, isLoading: loadingBuildings } = useBuildings()
  const { data: floors, isLoading: loadingFloors } = useFloors()
  const { data: rooms, isLoading: loadingRooms } = useRooms()
  const { data: beds, isLoading: loadingBeds } = useBeds()

  // Filtrar dados com base na seleção hierárquica
  const availableFloors = useMemo(() => {
    if (!selectedBuildingId || !floors) return []
    return floors.filter(floor => floor.buildingId === selectedBuildingId)
  }, [floors, selectedBuildingId])

  const availableRooms = useMemo(() => {
    if (!selectedFloorId || !rooms) return []
    return rooms.filter(room => room.floorId === selectedFloorId)
  }, [rooms, selectedFloorId])

  const availableBeds = useMemo(() => {
    if (!selectedRoomId || !beds) return []
    return beds.filter(bed => {
      if (bed.roomId !== selectedRoomId) return false

      // Se showOnlyAvailable é true, mostra apenas leitos disponíveis
      // ou o leito atual do residente (para edição)
      if (showOnlyAvailable) {
        return bed.status === 'DISPONIVEL' || bed.id === currentResidentBedId
      }

      return true
    })
  }, [beds, selectedRoomId, showOnlyAvailable, currentResidentBedId])

  // Calcular estatísticas de disponibilidade
  const buildingStats = useMemo(() => {
    if (!buildings || !beds) return {}

    const stats: Record<string, { total: number; available: number }> = {}

    buildings.forEach(building => {
      const buildingBeds = beds.filter(bed => {
        const room = rooms?.find(r => r.id === bed.roomId)
        const floor = floors?.find(f => f.id === room?.floorId)
        return floor?.buildingId === building.id
      })

      stats[building.id] = {
        total: buildingBeds.length,
        available: buildingBeds.filter(b => b.status === 'DISPONIVEL').length
      }
    })

    return stats
  }, [buildings, beds, rooms, floors])

  const floorStats = useMemo(() => {
    if (!floors || !beds) return {}

    const stats: Record<string, { total: number; available: number }> = {}

    floors.forEach(floor => {
      const floorBeds = beds.filter(bed => {
        const room = rooms?.find(r => r.id === bed.roomId)
        return room?.floorId === floor.id
      })

      stats[floor.id] = {
        total: floorBeds.length,
        available: floorBeds.filter(b => b.status === 'DISPONIVEL').length
      }
    })

    return stats
  }, [floors, beds, rooms])

  const roomStats = useMemo(() => {
    if (!rooms || !beds) return {}

    const stats: Record<string, { total: number; available: number }> = {}

    rooms.forEach(room => {
      const roomBeds = beds.filter(bed => bed.roomId === room.id)

      stats[room.id] = {
        total: roomBeds.length,
        available: roomBeds.filter(b => b.status === 'DISPONIVEL').length
      }
    })

    return stats
  }, [rooms, beds])

  // Se um valor (bedId) foi passado, pré-selecionar toda a hierarquia
  useEffect(() => {
    if (value && beds && rooms && floors) {
      const bed = beds.find(b => b.id === value)
      if (bed) {
        const room = rooms.find(r => r.id === bed.roomId)
        if (room) {
          const floor = floors.find(f => f.id === room.floorId)
          if (floor) {
            setSelectedBuildingId(floor.buildingId)
            setSelectedFloorId(floor.id)
            setSelectedRoomId(room.id)
            setSelectedBedId(bed.id)
          }
        }
      }
    }
  }, [value, beds, rooms, floors])

  // Atualizar o valor quando um leito é selecionado
  useEffect(() => {
    onChange(selectedBedId || undefined)
  }, [selectedBedId, onChange])

  // Resetar seleções dependentes quando uma seleção superior muda
  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuildingId(buildingId)
    setSelectedFloorId('')
    setSelectedRoomId('')
    setSelectedBedId('')
  }

  const handleFloorChange = (floorId: string) => {
    setSelectedFloorId(floorId)
    setSelectedRoomId('')
    setSelectedBedId('')
  }

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId)
    setSelectedBedId('')
  }

  // Obter informações para o resumo
  const selectedInfo = useMemo(() => {
    if (!selectedBedId || !beds || !rooms || !floors || !buildings) return null

    const bed = beds.find(b => b.id === selectedBedId)
    if (!bed) return null

    const room = rooms.find(r => r.id === bed.roomId)
    if (!room) return null

    const floor = floors.find(f => f.id === room.floorId)
    if (!floor) return null

    const building = buildings.find(b => b.id === floor.buildingId)
    if (!building) return null

    const bedIdentification = formatBedIdentification(building.code, floor.code, room.code, bed.code)

    return {
      building: `${building.name} (${building.code})`,
      floor: `${floor.name} (${floor.code})`,
      room: `${room.name} (${room.code})`,
      bed: bedIdentification,
      hasPrivateBathroom: room.hasPrivateBathroom,
      isAccessible: room.accessible,
    }
  }, [selectedBedId, beds, rooms, floors, buildings])

  return (
    <div className="space-y-4">
      {/* 1. Selecionar Prédio */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Home className="h-4 w-4" />
          Prédio
        </label>
        <Select
          value={selectedBuildingId}
          onValueChange={handleBuildingChange}
          disabled={disabled || loadingBuildings}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o prédio" />
          </SelectTrigger>
          <SelectContent>
            {buildings?.map(building => {
              const stats = buildingStats[building.id]
              return (
                <SelectItem key={building.id} value={building.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{building.name} ({building.code})</span>
                    {stats && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {stats.available} de {stats.total} disponíveis
                      </span>
                    )}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Selecionar Andar */}
      {selectedBuildingId && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Layers className="h-4 w-4" />
            Andar
          </label>
          <Select
            value={selectedFloorId}
            onValueChange={handleFloorChange}
            disabled={disabled || loadingFloors || !selectedBuildingId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o andar" />
            </SelectTrigger>
            <SelectContent>
              {availableFloors.map(floor => {
                const stats = floorStats[floor.id]
                return (
                  <SelectItem key={floor.id} value={floor.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{floor.name} ({floor.code})</span>
                      {stats && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {stats.available} de {stats.total} disponíveis
                        </span>
                      )}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 3. Selecionar Quarto */}
      {selectedFloorId && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <DoorOpen className="h-4 w-4" />
            Quarto
          </label>
          <Select
            value={selectedRoomId}
            onValueChange={handleRoomChange}
            disabled={disabled || loadingRooms || !selectedFloorId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o quarto" />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map(room => {
                const stats = roomStats[room.id]
                return (
                  <SelectItem key={room.id} value={room.id}>
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between w-full">
                        <span>{room.name} ({room.code})</span>
                        {stats && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {stats.available} de {stats.total} disponíveis
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {room.hasPrivateBathroom && (
                          <span className="text-xs text-blue-600">Banheiro privativo</span>
                        )}
                        {room.accessible && (
                          <span className="text-xs text-green-600">Acessível</span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 4. Selecionar Leito */}
      {selectedRoomId && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Bed className="h-4 w-4" />
            Leito
          </label>
          <Select
            value={selectedBedId}
            onValueChange={setSelectedBedId}
            disabled={disabled || loadingBeds || !selectedRoomId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o leito" />
            </SelectTrigger>
            <SelectContent>
              {availableBeds.length > 0 ? (
                availableBeds.map(bed => (
                  <SelectItem key={bed.id} value={bed.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>Leito {bed.code}</span>
                      {bed.status === 'DISPONIVEL' ? (
                        <span className="ml-2 text-xs text-green-600">Disponível</span>
                      ) : bed.id === currentResidentBedId ? (
                        <span className="ml-2 text-xs text-blue-600">Leito atual</span>
                      ) : (
                        <span className="ml-2 text-xs text-red-600">{bed.status}</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1 text-sm text-muted-foreground">
                  Nenhum leito disponível neste quarto
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Resumo da seleção */}
      {selectedInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Leito selecionado:</strong>
            <div className="mt-1 text-sm font-mono">
              {selectedInfo.bed}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {selectedInfo.building} → {selectedInfo.floor} → {selectedInfo.room}
            </div>
            {(selectedInfo.hasPrivateBathroom || selectedInfo.isAccessible) && (
              <div className="mt-2 flex gap-3 text-xs">
                {selectedInfo.hasPrivateBathroom && (
                  <span className="text-blue-600">✓ Banheiro privativo</span>
                )}
                {selectedInfo.isAccessible && (
                  <span className="text-green-600">✓ Acessível</span>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}