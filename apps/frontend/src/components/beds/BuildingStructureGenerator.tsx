import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { bedsAPI } from '@/api/beds.api'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { generateBuildingCodeSuggestions, formatBedIdentification } from '@/utils/formatters'

interface FloorConfig {
  floorNumber: number
  floorCode: string // Código do andar (ex: "T", "1", "2", "6")
  roomsCount: number
  rooms: RoomConfig[]
}

interface RoomConfig {
  roomName: string
  roomCode: string // Código do quarto (ex: "101", "823", "305")
  bedCount: number
  hasPrivateBathroom: boolean
  isAccessible: boolean
  beds: BedConfig[]
}

interface BedConfig {
  code: string
}

type Step = 'building' | 'floors' | 'floor-detail' | 'review'

interface BuildingStructureState {
  buildingName: string
  buildingCode: string // Código do prédio (ex: "CLI", "PP", "ANEXO")
  totalFloors: number
  startFloorNumber: number // 0 para térreo ou 1 para primeiro andar
  currentFloorIndex: number
  floors: FloorConfig[]
}

export function BuildingStructureGenerator({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('building')
  const [isLoading, setIsLoading] = useState(false)

  const [state, setState] = useState<BuildingStructureState>({
    buildingName: '',
    buildingCode: '',
    totalFloors: 0,
    startFloorNumber: 0,
    currentFloorIndex: 0,
    floors: [],
  })

  const [currentFloor, setCurrentFloor] = useState<FloorConfig | null>(null)
  const [currentRoom, setCurrentRoom] = useState<RoomConfig | null>(null)
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)

  // STEP 1: Informações do Prédio
  const handleBuildingInfoSubmit = () => {
    if (!state.buildingName.trim()) {
      toast({ description: 'Por favor, informe o nome do prédio', variant: 'destructive' })
      return
    }
    if (!state.buildingCode.trim()) {
      toast({ description: 'Por favor, informe o código do prédio', variant: 'destructive' })
      return
    }
    if (state.totalFloors < 1) {
      toast({ description: 'Por favor, informe a quantidade de andares', variant: 'destructive' })
      return
    }

    // Inicializar array de andares com códigos alfanuméricos
    const newFloors: FloorConfig[] = Array.from({ length: state.totalFloors }, (_, i) => {
      const floorNum = state.startFloorNumber + i
      // Gera código do andar: "T" para térreo (0), ou o número do andar
      const floorCode = floorNum === 0 ? 'T' : floorNum.toString()

      return {
        floorNumber: floorNum,
        floorCode: floorCode,
        roomsCount: 0,
        rooms: [],
      }
    })

    setState(prev => ({
      ...prev,
      floors: newFloors,
      currentFloorIndex: 0,
    }))

    setCurrentFloor(newFloors[0])
    setStep('floors')
  }

  // STEP 2: Definir quantidade de quartos por andar
  const handleFloorRoomsCountSubmit = () => {
    if (!currentFloor || currentFloor.roomsCount < 1) {
      toast({ description: 'Por favor, informe a quantidade de quartos', variant: 'destructive' })
      return
    }

    // Inicializar quartos para este andar com códigos numéricos sequenciais
    const newRooms: RoomConfig[] = Array.from({ length: currentFloor.roomsCount }, (_, i) => ({
      roomName: `Quarto ${i + 1}`,
      roomCode: (i + 1).toString().padStart(3, '0'), // Ex: "001", "002", "003"
      bedCount: 1,
      hasPrivateBathroom: false,
      isAccessible: false,
      beds: [],
    }))

    const updatedFloor = { ...currentFloor, rooms: newRooms }
    setCurrentFloor(updatedFloor)
    setCurrentRoomIndex(0)
    setCurrentRoom(newRooms[0])
    setStep('floor-detail')
  }

  // STEP 3: Configurar quartos do andar
  const handleRoomConfigSubmit = () => {
    if (!currentRoom || !currentFloor) return

    // Gerar codes dos leitos no padrão hospitalar brasileiro: CLI6-823-B
    // Formato: {buildingCode}{floorCode}-{roomCode}-{bedCode}
    // Exemplo: CLI6-823-B (Clínica 6º andar, quarto 823, leito B)
    const bedsForRoom: BedConfig[] = Array.from({ length: currentRoom.bedCount }, (_, i) => {
      // Gerar código do leito: A, B, C, D... ou 01, 02, 03 para muitos leitos
      const bedCode = currentRoom.bedCount <= 26
        ? String.fromCharCode(65 + i) // A=65, B=66, C=67...
        : (i + 1).toString().padStart(2, '0')

      return {
        code: bedCode,
      }
    })

    const updatedRoom = { ...currentRoom, beds: bedsForRoom }
    const updatedRooms = [...currentFloor.rooms]
    updatedRooms[currentRoomIndex] = updatedRoom
    const updatedFloor = { ...currentFloor, rooms: updatedRooms }

    // Atualizar state global imediatamente
    const updatedFloors = [...state.floors]
    updatedFloors[state.currentFloorIndex] = updatedFloor

    setState(prev => ({
      ...prev,
      floors: updatedFloors,
    }))

    // Verificar se tem mais quartos
    if (currentRoomIndex < updatedFloor.roomsCount - 1) {
      // Próximo quarto
      setCurrentRoomIndex(currentRoomIndex + 1)
      setCurrentFloor(updatedFloor)
      setCurrentRoom(updatedRooms[currentRoomIndex + 1])
    } else {
      // Finalizar este andar
      setCurrentFloor(updatedFloor)

      if (state.currentFloorIndex < state.totalFloors - 1) {
        // Tem próximo andar - voltar para step 'floors'
        const nextFloorIndex = state.currentFloorIndex + 1
        const nextFloor = updatedFloors[nextFloorIndex]

        setState(prev => ({
          ...prev,
          currentFloorIndex: nextFloorIndex,
          floors: updatedFloors,
        }))

        setCurrentFloor(nextFloor)
        setCurrentRoom(null)
        setCurrentRoomIndex(0)
        setStep('floors')
      } else {
        // Último andar - ir para review
        setStep('review')
      }
    }
  }

  // Salvar estrutura completa
  const handleCreateStructure = async () => {
    try {
      setIsLoading(true)

      const payload = {
        buildingName: state.buildingName,
        buildingCode: state.buildingCode,
        floors: state.floors,
      }

      const response = await bedsAPI.createBuildingStructure(payload)

      toast({
        description: `Estrutura criada com sucesso! Prédio: ${response.building.name}, ${response.floors.length} andares, ${response.rooms.length} quartos, ${response.beds.length} leitos`,
      })

      // Invalidar queries para forçar refresh
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })

      onOpenChange(false)
      // Resetar estado
      setState({
        buildingName: '',
        buildingCode: '',
        totalFloors: 0,
        startFloorNumber: 0,
        currentFloorIndex: 0,
        floors: [],
      })
      setStep('building')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao criar estrutura'
      toast({
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'floors') {
      setStep('building')
    } else if (step === 'floor-detail') {
      if (currentRoomIndex > 0) {
        setCurrentRoomIndex(currentRoomIndex - 1)
        setCurrentRoom(currentFloor?.rooms[currentRoomIndex - 1] || null)
      } else {
        setStep('floors')
        setCurrentFloor(state.floors[state.currentFloorIndex])
      }
    } else if (step === 'review') {
      setStep('floor-detail')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerador Automático de Estrutura</DialogTitle>
          <DialogDescription>
            Configure seu prédio, andares, quartos e leitos de forma rápida e organizada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* STEP 1: Informações do Prédio */}
          {step === 'building' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="building-name">Nome do Prédio</Label>
                <Input
                  id="building-name"
                  placeholder="Ex: Casa Principal, Bloco A, Ala Norte"
                  value={state.buildingName}
                  onChange={e => {
                    const name = e.target.value
                    setState(prev => ({ ...prev, buildingName: name }))

                    // Gerar sugestões de código se ainda não foi definido manualmente
                    if (!state.buildingCode && name.trim()) {
                      const suggestions = generateBuildingCodeSuggestions(name)
                      if (suggestions.length > 0) {
                        setState(prev => ({ ...prev, buildingCode: suggestions[0] }))
                      }
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="building-code">Código do Prédio</Label>
                <Input
                  id="building-code"
                  placeholder="Ex: CLI, PP, ANEXO"
                  value={state.buildingCode}
                  onChange={e => setState(prev => ({ ...prev, buildingCode: e.target.value.toUpperCase() }))}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código alfanumérico curto (2-6 caracteres). Será usado na identificação dos leitos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-floors">Quantidade de Andares</Label>
                  <Input
                    id="total-floors"
                    type="number"
                    min="1"
                    placeholder="Ex: 3"
                    value={state.totalFloors || ''}
                    onChange={e => setState(prev => ({ ...prev, totalFloors: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="start-floor">Começar em</Label>
                  <select
                    id="start-floor"
                    className="w-full px-3 py-2 border rounded-md"
                    value={state.startFloorNumber}
                    onChange={e => setState(prev => ({ ...prev, startFloorNumber: parseInt(e.target.value) }))}
                  >
                    <option value="0">Térreo (0)</option>
                    <option value="1">Primeiro Andar (1)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Configurar Quartos do Andar */}
          {step === 'floors' && currentFloor && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">
                  Andar {currentFloor.floorNumber} de {state.totalFloors}
                </p>
              </div>

              <div>
                <Label htmlFor="rooms-count">Quantos quartos neste andar?</Label>
                <Input
                  id="rooms-count"
                  type="number"
                  min="1"
                  placeholder="Ex: 8"
                  value={currentFloor.roomsCount || ''}
                  onChange={e =>
                    setCurrentFloor(prev => (prev ? { ...prev, roomsCount: parseInt(e.target.value) || 0 } : null))
                  }
                />
              </div>
            </div>
          )}

          {/* STEP 3: Detalhar Quartos */}
          {step === 'floor-detail' && currentRoom && currentFloor && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900">
                  Andar {currentFloor.floorNumber} • Quarto {currentRoomIndex + 1} de {currentFloor.roomsCount}
                </p>
              </div>

              <div>
                <Label htmlFor="room-name">Nome do Quarto</Label>
                <Input
                  id="room-name"
                  placeholder="Ex: Quarto 101"
                  value={currentRoom.roomName}
                  onChange={e =>
                    setCurrentRoom(prev => (prev ? { ...prev, roomName: e.target.value } : null))
                  }
                />
              </div>

              <div>
                <Label htmlFor="bed-count">Quantos leitos neste quarto?</Label>
                <select
                  id="bed-count"
                  className="w-full px-3 py-2 border rounded-md"
                  value={currentRoom.bedCount}
                  onChange={e =>
                    setCurrentRoom(prev => (prev ? { ...prev, bedCount: parseInt(e.target.value) } : null))
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>
                      {n} leito{n > 1 ? 's' : ''} {n === 1 && '(Individual)'}
                    </option>
                  ))}
                </select>
              </div>

              {currentRoom.bedCount > 1 && (
                <div>
                  <Label htmlFor="room-type">Tipo de Quarto</Label>
                  <select
                    id="room-type"
                    className="w-full px-3 py-2 border rounded-md"
                    value={currentRoom.bedCount === 1 ? 'individual' : 'compartilhado'}
                    disabled
                  >
                    <option value="individual">Individual</option>
                    <option value="compartilhado">Compartilhado</option>
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  id="bathroom"
                  type="checkbox"
                  checked={currentRoom.hasPrivateBathroom}
                  onChange={e =>
                    setCurrentRoom(prev => (prev ? { ...prev, hasPrivateBathroom: e.target.checked } : null))
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="bathroom" className="cursor-pointer">
                  Tem banheiro privativo?
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="accessible"
                  type="checkbox"
                  checked={currentRoom.isAccessible}
                  onChange={e =>
                    setCurrentRoom(prev => (prev ? { ...prev, isAccessible: e.target.checked } : null))
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="accessible" className="cursor-pointer">
                  É acessível?
                </Label>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 'review' && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="font-semibold text-purple-900">Resumo da Estrutura</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Prédio: {state.buildingName}</p>
                  <p className="text-xs text-gray-600">
                    Código: <span className="font-mono font-semibold">{state.buildingCode}</span> •{' '}
                    {state.totalFloors} andar{state.totalFloors > 1 ? 'es' : ''} (Começando no andar{' '}
                    {state.startFloorNumber === 0 ? ' térreo' : ` ${state.startFloorNumber}`})
                  </p>
                </div>

                {state.floors.map((floor, floorIdx) => (
                  <div key={floorIdx} className="border-l-2 border-purple-300 pl-3 py-1">
                    <p className="text-sm font-semibold">
                      Andar {floor.floorNumber} <span className="font-mono text-xs">({floor.floorCode})</span>
                    </p>
                    <p className="text-xs text-gray-600">{floor.rooms.length} quarto(s)</p>

                    {floor.rooms.map((room, roomIdx) => (
                      <div key={roomIdx} className="text-xs text-gray-700 ml-2 py-1">
                        <p>
                          • {room.roomName} <span className="font-mono">({room.roomCode})</span>: {room.bedCount} leito{room.bedCount > 1 ? 's' : ''}{' '}
                          <span className="font-mono text-indigo-600">
                            ({room.beds.map(bed => formatBedIdentification(state.buildingCode, floor.floorCode, room.roomCode, bed.code)).join(', ')})
                          </span>
                          {room.hasPrivateBathroom && ', banheiro privativo'}
                          {room.isAccessible && ', acessível'}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="bg-gray-100 rounded p-2 mt-3">
                  <p className="text-xs font-semibold text-gray-700">
                    Total: {state.floors.reduce((sum, f) => sum + f.rooms.length, 0)} quartos •{' '}
                    {state.floors.reduce((sum, f) => sum + f.rooms.reduce((s, r) => s + r.bedCount, 0), 0)} leitos
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 'building' || isLoading}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {step !== 'review' && (
            <Button
              onClick={
                step === 'building'
                  ? handleBuildingInfoSubmit
                  : step === 'floors'
                    ? handleFloorRoomsCountSubmit
                    : handleRoomConfigSubmit
              }
              disabled={isLoading}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 'review' && (
            <Button onClick={handleCreateStructure} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? 'Criando...' : 'Criar Estrutura'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
