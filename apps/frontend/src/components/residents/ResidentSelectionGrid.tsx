import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Bed, Clock, FileText, Check, ChevronLeft, ChevronRight, Grid3x3, List, Accessibility, X } from 'lucide-react'
import { useUserPreference } from '@/hooks/useUserPreference'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { formatBedFromResident } from '@/utils/formatters'
import type { LatestRecord } from '@/hooks/useDailyRecords'
import { extractDateOnly, getCurrentDate, formatDateOnlySafe } from '@/utils/dateHelpers'
import { ResidentQuickViewModal } from '@/components/residents/ResidentQuickViewModal'
import { getRecordTypeLabel as getDailyRecordTypeLabel } from '@/utils/recordTypeLabels'

const ITEMS_PER_PAGE = 12

interface Resident {
  id: string
  fullName: string
  fotoUrl?: string
  roomId?: string
  bedId?: string
  room?: {
    id: string
    name: string
    code: string
  }
  bed?: {
    id: string
    code: string
    status: string
  }
  floor?: {
    id: string
    name: string
    code: string
  }
  building?: {
    id: string
    name: string
    code: string
  }
  status: string
  cpf?: string
  cns?: string
  mobilityAid?: boolean
}

interface ResidentSelectionGridProps {
  residents: Resident[]
  latestRecords: LatestRecord[]
  onSelectResident: (residentId: string) => void
  isLoading?: boolean
  statsComponent?: React.ReactNode
  statusFilter?: string
  onStatusFilterChange?: (filter: string) => void
  clinicalOccurrenceResidentIds?: string[]
}

export function ResidentSelectionGrid({
  residents,
  latestRecords,
  onSelectResident,
  isLoading = false,
  statsComponent,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  clinicalOccurrenceResidentIds = [],
}: ResidentSelectionGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>(
    controlledStatusFilter || 'active'
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [quickViewResidentId, setQuickViewResidentId] = useState<string | null>(null)
  const statusFilter = controlledStatusFilter ?? internalStatusFilter
  const quickFilterOptions = useMemo(
    () => [
      { value: 'withRecord', label: 'Com registro hoje' },
      { value: 'withoutRecord', label: 'Sem registro hoje' },
      { value: 'withoutRecord24h', label: 'Sem registro 24h+' },
      { value: 'withClinicalOccurrences48h', label: 'Ocorrências clínicas 48h' },
    ],
    []
  )

  const statusFilterLabelMap = useMemo(
    () =>
      new Map<string, string>([
        ['all', 'Todos'],
        ['active', 'Ativos'],
        ['inactive', 'Inativos'],
        ['withRecord', 'Com registro hoje'],
        ['withoutRecord', 'Sem registro hoje'],
        ['withoutRecord24h', 'Sem registro 24h+'],
        ['withClinicalOccurrences48h', 'Ocorrências clínicas 48h'],
      ]),
    []
  )

  // Usar preferência do usuário no backend (ao invés de localStorage)
  // Ideal para dispositivos compartilhados em ILPI
  const [viewMode, setViewMode] = useUserPreference('residentSelectionViewMode', 'grid')

  // Criar mapa de últimos registros por residente
  const latestRecordsMap = useMemo(() => {
    const map = new Map<string, LatestRecord>()
    latestRecords.forEach((record) => {
      map.set(record.residentId, record)
    })
    return map
  }, [latestRecords])

  // Filtrar residentes pela busca e status
  const filteredResidents = useMemo(() => {
    let filtered = residents

    // Filtro de busca (nome, CPF ou CNS)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (resident) =>
          resident.fullName.toLowerCase().includes(search) ||
          resident.cpf?.toLowerCase().includes(search) ||
          resident.cns?.toLowerCase().includes(search),
      )
    }

    // Filtro de status
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const clinicalOccurrenceSet = new Set(clinicalOccurrenceResidentIds)

    if (statusFilter === 'active') {
      filtered = filtered.filter((r) => r.status === 'Ativo')
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((r) => r.status === 'Inativo')
    } else if (statusFilter === 'withRecord') {
      filtered = filtered.filter((r) => latestRecordsMap.has(r.id))
    } else if (statusFilter === 'withoutRecord') {
      filtered = filtered.filter((r) => !latestRecordsMap.has(r.id))
    } else if (statusFilter === 'withoutRecord24h') {
      filtered = filtered.filter((resident) => {
        const residentLatestRecord = latestRecords.find(
          (record) => record.residentId === resident.id
        )

        if (!residentLatestRecord) return true

        return new Date(residentLatestRecord.createdAt) < twentyFourHoursAgo
      })
    } else if (statusFilter === 'withClinicalOccurrences48h') {
      filtered = filtered.filter((resident) => clinicalOccurrenceSet.has(resident.id))
    }

    return filtered
  }, [clinicalOccurrenceResidentIds, latestRecords, latestRecordsMap, residents, searchTerm, statusFilter])

  const handleStatusFilterChange = (nextFilter: string) => {
    setInternalStatusFilter(nextFilter)
    onStatusFilterChange?.(nextFilter)
  }

  const toggleQuickFilter = (filter: string) => {
    handleStatusFilterChange(statusFilter === filter ? 'active' : filter)
  }

  const hasSearchFilter = searchTerm.trim().length > 0
  const hasStatusFilter = statusFilter !== 'active'
  const hasAnyActiveFilter = hasSearchFilter || hasStatusFilter
  const quickFilterValues = quickFilterOptions.map((option) => option.value)
  const advancedFiltersCount =
    hasStatusFilter && !quickFilterValues.includes(statusFilter) ? 1 : 0

  const contextualPlaceholder = useMemo(() => {
    if (statusFilter === 'withoutRecord24h') {
      return 'Buscar entre residentes sem registro há 24h+...'
    }
    if (statusFilter === 'withClinicalOccurrences48h') {
      return 'Buscar entre residentes com ocorrências clínicas nas últimas 48h...'
    }
    if (statusFilter === 'withRecord') {
      return 'Buscar entre residentes com registro hoje...'
    }
    if (statusFilter === 'withoutRecord') {
      return 'Buscar entre residentes sem registro hoje...'
    }
    return 'Buscar residente (nome, CPF ou CNS)...'
  }, [statusFilter])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // Paginação
  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE)
  const paginatedResidents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredResidents.slice(startIndex, endIndex)
  }, [filteredResidents, currentPage])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Component */}
      {statsComponent}

      {/* Busca e Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Modo de visualização */}
          <div className="flex gap-1 border rounded-md p-1 shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <Grid3x3 className="h-4 w-4 mr-1.5" />
              Grade
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
            >
              <List className="h-4 w-4 mr-1.5" />
              Lista
            </Button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={contextualPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Dropdown de Filtros Avançados */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <Filter className="h-4 w-4 mr-1.5" />
                Mais filtros{advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleStatusFilterChange('all')}>
                {statusFilter === 'all' && <Check className="mr-2 h-4 w-4" />}
                {statusFilter !== 'all' && <span className="mr-2 h-4 w-4" />}
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilterChange('active')}>
                {statusFilter === 'active' && <Check className="mr-2 h-4 w-4" />}
                {statusFilter !== 'active' && <span className="mr-2 h-4 w-4" />}
                Ativos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusFilterChange('inactive')}>
                {statusFilter === 'inactive' && <Check className="mr-2 h-4 w-4" />}
                {statusFilter !== 'inactive' && <span className="mr-2 h-4 w-4" />}
                Inativos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {quickFilterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? 'default' : 'outline'}
              className="whitespace-nowrap"
              onClick={() => toggleQuickFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Chips de filtros ativos */}
        {hasAnyActiveFilter && (
          <div className="flex flex-wrap items-center gap-2">
            {hasStatusFilter && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {statusFilterLabelMap.get(statusFilter) || 'Filtro aplicado'}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-full"
                  onClick={() => handleStatusFilterChange('active')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {hasSearchFilter && (
              <Badge variant="secondary" className="gap-1 pr-1 max-w-[320px]">
                <span className="truncate">Busca: {searchTerm}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-full shrink-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground"
              onClick={() => {
                setSearchTerm('')
                handleStatusFilterChange('active')
              }}
            >
              Limpar tudo
            </Button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{filteredResidents.length}</span> de{' '}
          <span className="font-medium">{residents.length}</span> residentes
        </p>
      </div>

      {/* Grid ou Lista de Residentes */}
      {filteredResidents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm
                ? 'Nenhum residente encontrado com esse critério de busca'
                : 'Nenhum residente cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResidents.map((resident) => {
            const lastRecord = latestRecordsMap.get(resident.id)

            return (
              <Card
                key={resident.id}
                className="relative overflow-hidden hover:shadow-lg transition-all duration-200 group"
              >
                {/* Badges no Topo */}
                <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
                  {/* Badge de Auxílio (esquerda) */}
                  {resident.mobilityAid && (
                    <Badge
                      variant="default"
                      className="bg-primary/60 hover:bg-blue-700 dark:bg-primary dark:hover:bg-primary/60 border-0 shadow-md"
                    >
                      <Accessibility className="h-3 w-3 mr-1" />
                      <span className="text-xs font-semibold">Auxílio</span>
                    </Badge>
                  )}

                  {/* Badge de Status (direita) */}
                  <Badge
                    variant={resident.status === 'Ativo' ? 'default' : 'secondary'}
                    className={
                      resident.status === 'Ativo'
                        ? 'bg-success hover:bg-success/90 ml-auto'
                        : 'ml-auto'
                    }
                  >
                    {resident.status}
                  </Badge>
                </div>

                <CardContent className="p-6 pt-12 flex flex-col items-center text-center space-y-3">
                  {/* Foto */}
                  <div
                    className="relative group-hover:scale-110 transition-transform duration-200 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setQuickViewResidentId(resident.id)
                    }}
                  >
                    <PhotoViewer
                      photoUrl={resident.fotoUrl}
                      altText={resident.fullName}
                      size="sm"
                      rounded={true}
                    />
                  </div>

                  {/* Nome */}
                  <div className="w-full">
                    <h3 className="font-semibold text-base leading-tight">
                      {resident.fullName}
                    </h3>
                  </div>

                  {/* Acomodação */}
                  {resident.bed && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Bed className="h-4 w-4" />
                      <span className="font-mono">
                        {formatBedFromResident(resident)}
                      </span>
                    </div>
                  )}

                  {/* Último Registro */}
                  {lastRecord ? (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {getDailyRecordTypeLabel(lastRecord.type).label} às {lastRecord.time}
                        </span>
                      </div>
                      {extractDateOnly(lastRecord.date) !== getCurrentDate() && (
                        <span className="text-xs text-muted-foreground">
                          em {formatDateOnlySafe(lastRecord.date)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Sem registros hoje</span>
                    </div>
                  )}

                  {/* Botão de Ação */}
                  <Button
                    variant="outline"
                    className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => onSelectResident(resident.id)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Registros
                  </Button>
                </CardContent>
              </Card>
            )
          })}
            </div>
          ) : (
            /* Visualização em Lista */
            <div className="space-y-2">
              {paginatedResidents.map((resident) => {
                const lastRecord = latestRecordsMap.get(resident.id)

                return (
                  <Card
                    key={resident.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Foto */}
                        <div
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickViewResidentId(resident.id)
                          }}
                        >
                          <PhotoViewer
                            photoUrl={resident.fotoUrl}
                            altText={resident.fullName}
                            size="avatar"
                            rounded={true}
                          />
                        </div>

                        {/* Nome e Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {resident.fullName}
                            </h3>
                            {resident.mobilityAid && (
                              <Badge
                                variant="default"
                                className="bg-primary/60 hover:bg-blue-700 dark:bg-primary dark:hover:bg-primary/60 border-0 text-xs"
                              >
                                <Accessibility className="h-3 w-3 mr-1" />
                                Auxílio
                              </Badge>
                            )}
                            <Badge
                              variant={resident.status === 'Ativo' ? 'default' : 'secondary'}
                              className={
                                resident.status === 'Ativo'
                                  ? 'bg-success hover:bg-success/90 text-xs'
                                  : 'text-xs'
                              }
                            >
                              {resident.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {/* Leito */}
                            {resident.bed && (
                              <div className="flex items-center gap-1">
                                <Bed className="h-3 w-3" />
                                <span className="font-mono">
                                  {formatBedFromResident(resident)}
                                </span>
                              </div>
                            )}

                            {/* Último Registro */}
                            {lastRecord ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {getDailyRecordTypeLabel(lastRecord.type).label} às {lastRecord.time}
                                  {extractDateOnly(lastRecord.date) !== getCurrentDate() && (
                                    <span className="ml-1">
                                      em {formatDateOnlySafe(lastRecord.date)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Sem registros hoje</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botão */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectResident(resident.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Registros
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            {/* Contador de resultados */}
            <p className="text-sm text-muted-foreground">
              Mostrando{' '}
              <span className="font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              {' '}-{' '}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredResidents.length)}
              </span>
              {' '}de{' '}
              <span className="font-medium">{filteredResidents.length}</span>
              {' '}residentes
            </p>

            {/* Navegação */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground px-2">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </>
      )}

      {/* Modal de Visualização Rápida */}
      {quickViewResidentId && (
        <ResidentQuickViewModal
          residentId={quickViewResidentId}
          onClose={() => setQuickViewResidentId(null)}
        />
      )}
    </div>
  )
}
