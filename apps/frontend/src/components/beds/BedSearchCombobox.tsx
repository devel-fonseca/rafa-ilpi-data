import { useState } from 'react'
import { Search, Bed as BedIcon, X, Check, Filter, Building2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { bedsAPI, Bed } from '@/api/beds.api'
import { formatBedFromObject } from '@/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { tenantKey } from '@/lib/query-keys'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { isAvailableBedStatus, isOccupiedBedStatus, normalizeBedStatus } from '@/utils/bedStatus'
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
  'Disponível': 'bg-success/10 text-success/90',
  'Ocupado': 'bg-danger/10 text-danger/90',
  'Manutenção': 'bg-warning/10 text-warning/90',
  'Reservado': 'bg-primary/10 text-primary/90',
}

const BED_STATUS_LABELS: Record<string, string> = {
  'Disponível': 'Disponível',
  'Ocupado': 'Ocupado',
  'Manutenção': 'Manutenção',
  'Reservado': 'Reservado',
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

  // Filtros
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string | null>(null)

  // Buscar todos os leitos
  const { data: bedsData } = useQuery({
    queryKey: tenantKey('beds', 'all'),
    queryFn: () => bedsAPI.findAll({ skip: 0, take: 1000 }),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const beds = bedsData?.data || []

  // Extrair lista de prédios únicos para o filtro
  const uniqueBuildings = Array.from(
    new Set(beds.map(bed => bed.room?.floor?.building?.name).filter(Boolean))
  ) as string[]

  // Filtrar leitos baseado na busca e filtros ativos
  const filteredBeds = beds.filter((bed) => {
    // SEMPRE excluir leitos ocupados (segurança)
    if (isOccupiedBedStatus(bed.status)) return false

    // Filtro de status (apenas disponíveis)
    if (showOnlyAvailable) {
      if (!isAvailableBedStatus(bed.status)) return false
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Campo de busca com dropdown de filtros */}
        <PopoverAnchor asChild>
          <div className="flex gap-2" data-bed-search-anchor>
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
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
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
                      className="text-danger"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Limpar filtros
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </PopoverAnchor>

        {/* Leito selecionado */}
        {selectedBed && !isOpen && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BedIcon className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-foreground">
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
      </div>

      {/* Dropdown de resultados — renderizado via Portal */}
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={16}
        className="p-0 w-[--radix-popover-trigger-width] overflow-y-auto overscroll-contain"
        style={{
          maxHeight: 'min(22rem, var(--radix-popover-content-available-height))',
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Não fechar se o clique foi dentro do anchor (input/filtros)
          const target = e.target as HTMLElement
          if (target.closest('[data-bed-search-anchor]')) {
            e.preventDefault()
          }
        }}
      >
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
                    const normalizedStatus = normalizeBedStatus(bed.status) || bed.status

                    return (
                      <button
                        key={bed.id}
                        onClick={() => handleSelect(bed)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-left',
                          isSelected && 'bg-accent border border-primary/20'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                          <BedIcon className="h-4 w-4 text-primary" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono font-semibold text-sm">{bedCode}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {bed.room?.name} • {bed.room?.floor?.name}
                            </span>
                          </div>
                        </div>
                        <Badge className={cn('text-xs ml-2 shrink-0', BED_STATUS_COLORS[normalizedStatus] || 'bg-muted text-foreground')}>
                          {BED_STATUS_LABELS[normalizedStatus] || normalizedStatus}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
