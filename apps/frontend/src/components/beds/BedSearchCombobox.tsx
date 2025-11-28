import { useState, useRef, useEffect } from 'react'
import { Search, Bed as BedIcon, X, Check, Filter, Building2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { bedsAPI, Bed } from '@/api/beds.api'
import { formatBedFromObject } from '@/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BedSearchComboboxProps {
  value?: string // bedId
  onValueChange: (bedId: string | undefined) => void
  onBedSelect?: (bed: Bed | undefined) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const BED_STATUS_COLORS: Record<string, string> = {
  'Disponível': 'bg-green-100 text-green-800',
  'Ocupado': 'bg-red-100 text-red-800',
  'Manutenção': 'bg-yellow-100 text-yellow-800',
  'Reservado': 'bg-blue-100 text-blue-800',
  DISPONIVEL: 'bg-green-100 text-green-800',
  OCUPADO: 'bg-red-100 text-red-800',
  MANUTENCAO: 'bg-yellow-100 text-yellow-800',
  RESERVADO: 'bg-blue-100 text-blue-800',
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

export function BedSearchCombobox({
  value,
  onValueChange,
  onBedSelect,
  disabled = false,
  placeholder = 'Buscar leito por código, prédio ou quarto...',
  className,
}: BedSearchComboboxProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Filtros
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string | null>(null)

  // Buscar todos os leitos
  const { data: bedsData } = useQuery({
    queryKey: ['beds', 'all'],
    queryFn: () => bedsAPI.findAll({ skip: 0, take: 1000 }),
  })

  const beds = bedsData?.data || []

  // Extrair lista de prédios únicos para o filtro
  const uniqueBuildings = Array.from(
    new Set(beds.map(bed => bed.room?.floor?.building?.name).filter(Boolean))
  ) as string[]

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar leitos baseado na busca e filtros ativos
  const filteredBeds = beds.filter((bed) => {
    // SEMPRE excluir leitos ocupados (segurança)
    const isOccupied = bed.status === 'Ocupado' || bed.status === 'OCUPADO'
    if (isOccupied) return false

    // Filtro de status (apenas disponíveis)
    if (showOnlyAvailable) {
      const isAvailable = bed.status === 'Disponível' || bed.status === 'DISPONIVEL'
      if (!isAvailable) return false
    }

    // Filtro de prédio
    if (selectedBuildingFilter) {
      const buildingName = bed.room?.floor?.building?.name
      if (buildingName !== selectedBuildingFilter) return false
    }

    // Filtro de busca por texto
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const bedCode = formatBedFromObject(bed).toLowerCase()
    const buildingName = bed.room?.floor?.building?.name?.toLowerCase() || ''
    const floorName = bed.room?.floor?.name?.toLowerCase() || ''
    const roomName = bed.room?.name?.toLowerCase() || ''

    return (
      bedCode.includes(searchLower) ||
      buildingName.includes(searchLower) ||
      floorName.includes(searchLower) ||
      roomName.includes(searchLower)
    )
  })

  // Agrupar leitos por prédio
  const bedsByBuilding = filteredBeds.reduce((acc, bed) => {
    const buildingName = bed.room?.floor?.building?.name || 'Sem prédio'
    if (!acc[buildingName]) {
      acc[buildingName] = []
    }
    acc[buildingName].push(bed)
    return acc
  }, {} as Record<string, Bed[]>)

  // Encontrar leito selecionado
  const selectedBed = beds.find((bed) => bed.id === value)

  const handleSelect = (bed: Bed) => {
    onValueChange(bed.id)
    onBedSelect?.(bed)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onValueChange(undefined)
    onBedSelect?.(undefined)
    setSearchQuery('')
  }

  const activeFiltersCount = (showOnlyAvailable ? 1 : 0) + (selectedBuildingFilter ? 1 : 0)

  return (
    <div className={cn('relative flex flex-col gap-2', className)} ref={wrapperRef}>
          {/* Campo de busca com dropdown de filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                setSearchQuery('')
                setIsOpen(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Dropdown de Filtros */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative" disabled={disabled}>
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filtros</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={showOnlyAvailable}
              onCheckedChange={setShowOnlyAvailable}
            >
              <Check className={cn('mr-2 h-4 w-4', showOnlyAvailable ? 'opacity-100' : 'opacity-0')} />
              Apenas disponíveis
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Filtrar por Prédio</DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => setSelectedBuildingFilter(null)}
              className={cn(!selectedBuildingFilter && 'bg-accent')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Todos os prédios
            </DropdownMenuItem>

            {uniqueBuildings.map((building) => (
              <DropdownMenuItem
                key={building}
                onClick={() => setSelectedBuildingFilter(building)}
                className={cn(selectedBuildingFilter === building && 'bg-accent')}
              >
                <Layers className="mr-2 h-4 w-4" />
                {building}
                {selectedBuildingFilter === building && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}

            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setShowOnlyAvailable(false)
                    setSelectedBuildingFilter(null)
                  }}
                  className="text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Leito selecionado */}
      {selectedBed && !isOpen && (
        <Card className="p-3 bg-indigo-50/50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BedIcon className="h-5 w-5 text-indigo-600" />
              <div className="flex flex-col">
                <span className="font-mono font-bold text-indigo-900">
                  {formatBedFromObject(selectedBed)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedBed.room?.floor?.building?.name} • {selectedBed.room?.name} • {selectedBed.room?.floor?.name}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

          {/* Dropdown de resultados */}
          {isOpen && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-[400px] overflow-auto shadow-lg">
              {filteredBeds.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum leito encontrado
                </div>
              ) : (
                <div className="p-2">
                  {Object.entries(bedsByBuilding).map(([buildingName, buildingBeds]) => (
                    <div key={buildingName} className="mb-3 last:mb-0">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {buildingName}
                      </div>
                      <div className="space-y-1">
                        {buildingBeds.map((bed) => {
                          const bedCode = formatBedFromObject(bed)
                          const isSelected = value === bed.id

                          return (
                            <button
                              key={bed.id}
                              onClick={() => handleSelect(bed)}
                              className={cn(
                                'w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-left',
                                isSelected && 'bg-indigo-50 border border-indigo-200'
                              )}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                                <BedIcon className="h-4 w-4 text-indigo-600" />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-mono font-semibold text-sm">{bedCode}</span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {bed.room?.name} • {bed.room?.floor?.name}
                                  </span>
                                </div>
                              </div>
                              <Badge className={cn('text-xs ml-2 shrink-0', BED_STATUS_COLORS[bed.status])}>
                                {BED_STATUS_LABELS[bed.status]}
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
    </div>
  )
}
