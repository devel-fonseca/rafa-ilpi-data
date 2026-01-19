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
import { Building2, DoorOpen, Bed as BedIcon, Check, Search } from 'lucide-react'
import { formatBedFromObject } from '@/utils/formatters'

const BED_STATUS_COLORS: Record<string, string> = {
  'Disponível': 'bg-success/10 text-success/95 border-success',
  'Ocupado': 'bg-danger/10 text-danger/90 border-danger',
  'Manutenção': 'bg-warning/10 text-warning/95 border-warning',
  'Reservado': 'bg-primary/10 text-primary/95 border-primary',
}

interface BedWithHierarchy {
  id: string
  code: string
  bedNumber: string
  status: string
  roomId: string
  residentId?: string
  resident?: {
    id: string
    fullName: string
    fotoUrl?: string
  }
  occupiedSince?: string
  observations?: string
  createdAt: string
  updatedAt: string
  room: {
    id: string
    name: string
    roomType?: string
  }
  floor: {
    id: string
    name: string
  }
  building: {
    id: string
    name: string
  }
}

interface SelectBedForActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  beds: BedWithHierarchy[]
  allowedStatuses?: string[] // Filtro de status permitidos
  title: string
  description: string
  onSelectBed: (bed: BedWithHierarchy) => void
}

/**
 * Modal genérico para seleção de leito para ações de gerenciamento
 * (Reservar, Bloquear, Liberar, etc.)
 */
export function SelectBedForActionModal({
  open,
  onOpenChange,
  beds,
  allowedStatuses,
  title,
  description,
  onSelectBed,
}: SelectBedForActionModalProps) {
  const [selectedBed, setSelectedBed] = useState<BedWithHierarchy | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrar leitos baseado em status permitidos e busca
  const filteredBeds = useMemo(() => {
    let filtered = beds

    // Filtro por status (se especificado)
    if (allowedStatuses && allowedStatuses.length > 0) {
      filtered = filtered.filter((bed) => allowedStatuses.includes(bed.status))
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (bed) =>
          bed.code.toLowerCase().includes(query) ||
          bed.room.name.toLowerCase().includes(query) ||
          bed.floor.name.toLowerCase().includes(query) ||
          bed.building.name.toLowerCase().includes(query)
      )
    }

    // Ordenar por código
    return filtered.sort((a, b) => a.code.localeCompare(b.code))
  }, [beds, allowedStatuses, searchQuery])

  // Agrupar leitos por prédio e andar
  const groupedBeds = useMemo(() => {
    const groups: Map<string, BedWithHierarchy[]> = new Map()

    filteredBeds.forEach((bed) => {
      const key = `${bed.building.name} - ${bed.floor.name}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(bed)
    })

    return Array.from(groups.entries())
  }, [filteredBeds])

  const handleSelectBed = (bed: BedWithHierarchy) => {
    setSelectedBed(bed)
  }

  const handleConfirm = () => {
    if (!selectedBed) return
    onSelectBed(selectedBed)
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="space-y-3 pb-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código do leito, quarto, andar ou prédio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
              <p className="text-sm">Nenhum leito encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedBeds.map(([groupKey, bedsInGroup]) => (
                <div key={groupKey}>
                  {/* Header do Grupo */}
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{groupKey}</span>
                    <Badge variant="outline" className="text-xs">
                      {bedsInGroup.length}
                    </Badge>
                  </div>

                  {/* Grid de Leitos */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {bedsInGroup.map((bed) => {
                      const isSelected = selectedBed?.id === bed.id

                      return (
                        <Card
                          key={bed.id}
                          className={`border-2 transition-all cursor-pointer ${
                            BED_STATUS_COLORS[bed.status] || 'bg-muted'
                          } ${
                            isSelected
                              ? 'ring-4 ring-blue-600 shadow-lg scale-105'
                              : 'hover:shadow-md hover:scale-102'
                          }`}
                          onClick={() => handleSelectBed(bed)}
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
                                  {formatBedFromObject(bed)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <DoorOpen className="h-3 w-3" />
                                  <span className="truncate">{bed.room.name}</span>
                                </div>
                                {bed.room.roomType && (
                                  <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">
                                    {bed.room.roomType}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] mt-1 px-1 py-0 ${BED_STATUS_COLORS[bed.status] || ''}`}
                                >
                                  {bed.status}
                                </Badge>
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
          <Button type="button" onClick={handleConfirm} disabled={!selectedBed} className="flex-1">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
