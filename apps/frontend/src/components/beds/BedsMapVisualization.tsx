import { useState } from 'react'
import { BedsHierarchy } from '@/api/beds.api'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Layers, DoorOpen, Bed as BedIcon, ArrowRightLeft } from 'lucide-react'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { formatBedFromObject } from '@/utils/formatters'
import { TransferBedModal } from './TransferBedModal'
import { SelectBedModal } from './SelectBedModal'
import { residentsAPI } from '@/api/residents.api'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface BedsMapVisualizationProps {
  data: BedsHierarchy
}

const BED_STATUS_COLORS: Record<string, string> = {
  'Disponível': 'bg-success/10 text-success/80 dark:text-success/30 border-success/50',
  'Ocupado': 'bg-danger/10 text-danger/80 dark:text-danger/30 border-danger/50',
  'Manutenção': 'bg-warning/10 text-warning/80 dark:text-warning/30 border-warning',
  'Reservado': 'bg-primary/10 text-primary/80 dark:text-primary/30 border-primary/50',
}

const BED_STATUS_LABELS: Record<string, string> = {
  'Disponível': 'Disponível',
  'Ocupado': 'Ocupado',
  'Manutenção': 'Manutenção',
  'Reservado': 'Reservado',
}

export function BedsMapVisualization({ data }: BedsMapVisualizationProps) {
  const queryClient = useQueryClient()

  const [draggedResident, setDraggedResident] = useState<{
    id: string
    name: string
    fromBedId: string
    fromBedCode: string
    fromLocation: string
  } | null>(null)
  const [dropTargetBed, setDropTargetBed] = useState<string | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [selectBedModalOpen, setSelectBedModalOpen] = useState(false)
  const [transferData, setTransferData] = useState<{
    residentId: string
    residentName: string
    fromBedCode: string
    toBedId: string
    toBedCode: string
    fromLocation: string
    toLocation: string
  } | null>(null)
  const [residentToTransfer, setResidentToTransfer] = useState<{
    id: string
    name: string
    fromBedId: string
    fromBedCode: string
    fromLocation: string
  } | null>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  if (!data.buildings || data.buildings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum prédio cadastrado ainda.
        </CardContent>
      </Card>
    )
  }

  const handleDragStart = (
    e: React.DragEvent,
    resident: any,
    bed: any,
    room: any,
    floor: any,
    building: any
  ) => {
    const fromLocation = `${building.name} - ${floor.name} - ${room.name}`
    const dragData = {
      id: resident.id,
      name: resident.fullName,
      fromBedId: bed.id,
      fromBedCode: bed.code,
      fromLocation,
    }

    console.log('🎯 [DRAG START] Iniciando drag:', dragData)
    e.dataTransfer.effectAllowed = 'move'

    // Expandir todos os accordions PRIMEIRO
    const allIds: string[] = []
    data.buildings.forEach((b) => {
      allIds.push(b.id)
      b.floors?.forEach((f) => {
        allIds.push(f.id)
        f.rooms?.forEach((r) => {
          allIds.push(r.id)
        })
      })
    })
    console.log('📂 [DRAG START] Expandindo accordions:', allIds.length, 'items')
    setExpandedItems(allIds)

    // Setar draggedResident IMEDIATAMENTE (sem setTimeout)
    console.log('✨ [DRAG START] Aplicando estado draggedResident IMEDIATAMENTE')
    setDraggedResident(dragData)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🏁 [DRAG END] Drag finalizado', {
      dropEffect: e.dataTransfer.dropEffect,
      effectAllowed: e.dataTransfer.effectAllowed
    })
    setDraggedResident(null)
    setDropTargetBed(null)
    // Não colapsar os accordions automaticamente - deixar o usuário controlar
  }

  const handleDragOver = (e: React.DragEvent, bedId: string, bedStatus: string) => {
    console.log('🔄 [DRAG OVER]', { bedId, bedStatus, hasDraggedResident: !!draggedResident })

    // Só permite drop em leitos disponíveis (backend retorna "Disponível" com acento)
    if (bedStatus === 'Disponível' && draggedResident && bedId !== draggedResident.fromBedId) {
      console.log('✅ [DRAG OVER] Permitindo drop no leito', bedId)
      e.preventDefault()
      setDropTargetBed(bedId)
    } else {
      console.log('❌ [DRAG OVER] Drop não permitido', {
        bedStatus,
        hasDraggedResident: !!draggedResident,
        isSameBed: bedId === draggedResident?.fromBedId
      })
    }
  }

  const handleDragLeave = (e: React.DragEvent, bedId: string) => {
    console.log('👋 [DRAG LEAVE]', bedId)
    // Verifica se realmente saiu do card (não apenas de um elemento filho)
    const currentTarget = e.currentTarget as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement

    // Se o relatedTarget não é descendente do currentTarget, realmente saiu
    if (!currentTarget.contains(relatedTarget) && dropTargetBed === bedId) {
      console.log('🚪 [DRAG LEAVE] Limpando dropTargetBed')
      setDropTargetBed(null)
    }
  }

  const handleDrop = (
    e: React.DragEvent,
    toBed: any,
    toRoom: any,
    toFloor: any,
    toBuilding: any
  ) => {
    console.log('🎯 [DROP] Evento drop acionado!', {
      toBedId: toBed.id,
      toBedCode: toBed.code,
      hasDraggedResident: !!draggedResident
    })

    e.preventDefault()
    setDropTargetBed(null)

    if (!draggedResident) {
      console.log('❌ [DROP] draggedResident é null, abortando')
      return
    }

    const toLocation = `${toBuilding.name} - ${toFloor.name} - ${toRoom.name}`

    console.log('📋 [DROP] Preparando transferência:', {
      from: draggedResident.fromBedCode,
      to: toBed.code,
      resident: draggedResident.name
    })

    // Abrir modal de confirmação
    setTransferData({
      residentId: draggedResident.id,
      residentName: draggedResident.name,
      fromBedCode: draggedResident.fromBedCode,
      toBedId: toBed.id,
      toBedCode: toBed.code,
      fromLocation: draggedResident.fromLocation,
      toLocation,
    })
    setTransferModalOpen(true)
    setDraggedResident(null)

    console.log('✅ [DROP] Modal de transferência aberto')
  }

  const handleOpenTransferModal = (
    resident: any,
    bed: any,
    room: any,
    floor: any,
    building: any
  ) => {
    const fromLocation = `${building.name} - ${floor.name} - ${room.name}`
    setResidentToTransfer({
      id: resident.id,
      name: resident.fullName,
      fromBedId: bed.id,
      fromBedCode: bed.code,
      fromLocation,
    })
    setSelectBedModalOpen(true)
  }

  const handleSelectBed = (
    toBed: any,
    toRoom: any,
    toFloor: any,
    toBuilding: any
  ) => {
    if (!residentToTransfer) return

    const toLocation = `${toBuilding.name} - ${toFloor.name} - ${toRoom.name}`

    setTransferData({
      residentId: residentToTransfer.id,
      residentName: residentToTransfer.name,
      fromBedCode: residentToTransfer.fromBedCode,
      toBedId: toBed.id,
      toBedCode: toBed.code,
      fromLocation: residentToTransfer.fromLocation,
      toLocation,
    })

    setSelectBedModalOpen(false)
    setTransferModalOpen(true)
  }

  const handleConfirmTransfer = async (reason: string) => {
    if (!transferData) return

    try {
      await residentsAPI.transferBed(transferData.residentId, transferData.toBedId, reason)

      toast.success('Transferência realizada com sucesso!', {
        description: `${transferData.residentName} foi transferido de ${transferData.fromBedCode} para ${transferData.toBedCode}`,
      })

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['residents'] })
    } catch (error: any) {
      toast.error('Erro ao transferir residente', {
        description: error.response?.data?.message || 'Tente novamente',
      })
      throw error
    }
  }

  return (
    <div className="space-y-4">
      {data.buildings.map((building) => (
        <Card key={building.id} className="overflow-hidden">
          <Accordion
            type="multiple"
            className="w-full"
            value={expandedItems.includes(building.id) ? [building.id] : []}
            onValueChange={(value) => {
              if (value.includes(building.id)) {
                setExpandedItems([...expandedItems, building.id])
              } else {
                setExpandedItems(expandedItems.filter((id) => id !== building.id))
              }
            }}
          >
            <AccordionItem value={building.id} className="border-none">
              <AccordionTrigger className="px-6 hover:no-underline hover:bg-accent/50">
                <div className="flex items-center gap-3 flex-1">
                  <Building2 className="h-5 w-5 text-primary dark:text-primary/40" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{building.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {building.totalFloors} andares · {building.totalRooms || 0} quartos ·{' '}
                      {building.totalBeds || 0} leitos
                    </div>
                  </div>
                  <Badge variant="outline">{building.code}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-4 space-y-3">
                  {building.floors && building.floors.length > 0 ? (
                    building.floors.map((floor) => (
                      <Card key={floor.id} className="bg-muted/30">
                        <Accordion
                          type="multiple"
                          className="w-full"
                          value={expandedItems.includes(floor.id) ? [floor.id] : []}
                          onValueChange={(value) => {
                            if (value.includes(floor.id)) {
                              setExpandedItems([...expandedItems, floor.id])
                            } else {
                              setExpandedItems(expandedItems.filter((id) => id !== floor.id))
                            }
                          }}
                        >
                          <AccordionItem value={floor.id} className="border-none">
                            <AccordionTrigger className="px-4 hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <Layers className="h-4 w-4 text-medication-controlled dark:text-medication-controlled/40" />
                                <div className="flex-1 text-left">
                                  <div className="font-medium text-sm">{floor.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {floor.roomsCount || 0} quartos · {floor.bedsCount || 0} leitos
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {floor.code}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="px-4 pb-3 space-y-2">
                                {floor.rooms && floor.rooms.length > 0 ? (
                                  floor.rooms.map((room) => (
                                    <Card key={room.id} className="bg-background">
                                      <Accordion
                                        type="multiple"
                                        className="w-full"
                                        value={expandedItems.includes(room.id) ? [room.id] : []}
                                        onValueChange={(value) => {
                                          if (value.includes(room.id)) {
                                            setExpandedItems([...expandedItems, room.id])
                                          } else {
                                            setExpandedItems(expandedItems.filter((id) => id !== room.id))
                                          }
                                        }}
                                      >
                                        <AccordionItem
                                          value={room.id}
                                          className="border-none"
                                        >
                                          <AccordionTrigger className="px-3 hover:no-underline">
                                            <div className="flex items-center gap-2 flex-1">
                                              <DoorOpen className="h-4 w-4 text-severity-warning dark:text-severity-warning/40" />
                                              <div className="flex-1 text-left">
                                                <div className="font-medium text-sm">
                                                  {room.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {room.occupiedBeds || 0}/{room.totalBeds || 0} ocupados
                                                </div>
                                              </div>
                                              <Badge variant="secondary" className="text-xs">
                                                {room.roomNumber}
                                              </Badge>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <div className="px-3 pb-2">
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {room.beds && room.beds.length > 0 ? (
                                                  room.beds.map((bed) => (
                                                    <Card
                                                      key={bed.id}
                                                      draggable={!!bed.resident}
                                                      onDragStart={(e) =>
                                                        bed.resident &&
                                                        handleDragStart(e, bed.resident, bed, room, floor, building)
                                                      }
                                                      onDragEnd={handleDragEnd}
                                                      onDragOver={(e) => handleDragOver(e, bed.id, bed.status)}
                                                      onDragLeave={(e) => handleDragLeave(e, bed.id)}
                                                      onDrop={(e) => handleDrop(e, bed, room, floor, building)}
                                                      className={`border-2 transition-all ${
                                                        BED_STATUS_COLORS[bed.status] || 'bg-muted/20'
                                                      } ${
                                                        draggedResident?.fromBedId === bed.id
                                                          ? 'opacity-50 cursor-grabbing'
                                                          : bed.resident
                                                          ? 'cursor-grab hover:shadow-md active:cursor-grabbing'
                                                          : draggedResident && bed.status === 'Disponível'
                                                          ? 'ring-2 ring-dashed ring-blue-400 dark:ring-blue-600 bg-primary/10 dark:bg-primary/20 cursor-copy'
                                                          : ''
                                                      } ${
                                                        dropTargetBed === bed.id
                                                          ? 'ring-4 ring-blue-600 dark:ring-blue-400 shadow-2xl scale-110 bg-primary/20 dark:bg-primary/30'
                                                          : ''
                                                      }`}
                                                    >
                                                      <CardContent className="p-3 relative">
                                                        {draggedResident && bed.status === 'Disponível' && bed.id !== draggedResident.fromBedId && (
                                                          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 dark:bg-primary/20 rounded pointer-events-none">
                                                            <span className="text-xs font-semibold text-primary/80 dark:text-primary/30 bg-background px-2 py-1 rounded shadow-md border border-primary/30">
                                                              ⬇ Solte aqui
                                                            </span>
                                                          </div>
                                                        )}
                                                        <div className="flex items-start gap-2">
                                                          <BedIcon className="h-4 w-4 mt-0.5" />
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-sm font-semibold font-mono">
                                                                {formatBedFromObject(bed)}
                                                              </span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                              {BED_STATUS_LABELS[bed.status]}
                                                            </div>
                                                            {bed.resident && (
                                                              <>
                                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                                                  <PhotoViewer
                                                                    photoUrl={bed.resident.fotoUrl}
                                                                    altText={bed.resident.fullName}
                                                                    size="xs"
                                                                    rounded={true}
                                                                    className="shrink-0"
                                                                  />
                                                                  <span className="text-xs font-medium truncate">
                                                                    {bed.resident.fullName}
                                                                  </span>
                                                                </div>
                                                                <Button
                                                                  variant="outline"
                                                                  size="sm"
                                                                  className="w-full mt-2 h-7 text-xs"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleOpenTransferModal(
                                                                      bed.resident,
                                                                      bed,
                                                                      room,
                                                                      floor,
                                                                      building
                                                                    )
                                                                  }}
                                                                >
                                                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                                                  Transferir
                                                                </Button>
                                                              </>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </CardContent>
                                                    </Card>
                                                  ))
                                                ) : (
                                                  <div className="col-span-full text-center text-xs text-muted-foreground py-2">
                                                    Nenhum leito cadastrado
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </Card>
                                  ))
                                ) : (
                                  <div className="text-center text-xs text-muted-foreground py-2">
                                    Nenhum quarto cadastrado
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      Nenhum andar cadastrado
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ))}

      <SelectBedModal
        open={selectBedModalOpen}
        onOpenChange={setSelectBedModalOpen}
        residentName={residentToTransfer?.name || ''}
        currentBedId={residentToTransfer?.fromBedId || ''}
        data={data}
        onSelectBed={handleSelectBed}
      />

      <TransferBedModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        residentName={transferData?.residentName || ''}
        fromBedCode={transferData?.fromBedCode || ''}
        toBedCode={transferData?.toBedCode || ''}
        fromLocation={transferData?.fromLocation || ''}
        toLocation={transferData?.toLocation || ''}
        onConfirm={handleConfirmTransfer}
      />
    </div>
  )
}
