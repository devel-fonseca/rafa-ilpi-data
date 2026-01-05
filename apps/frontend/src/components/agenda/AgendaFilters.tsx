import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/services/api'

import {
  ScopeType,
  ContentFilterType,
  CONTENT_FILTER_LABELS,
  CONTENT_FILTER_ICONS,
} from '@/types/agenda'

interface Resident {
  id: string
  fullName: string
  socialName?: string | null
  bed?: {
    code: string
  } | null
}

interface Props {
  scope: ScopeType
  residentId: string | null
  contentFilters: ContentFilterType[]
  onScopeChange: (scope: ScopeType) => void
  onResidentChange: (residentId: string | null) => void
  onContentFiltersChange: (filters: ContentFilterType[]) => void
}

export function AgendaFilters({
  scope,
  residentId,
  contentFilters,
  onScopeChange,
  onResidentChange,
  onContentFiltersChange,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Buscar residentes ativos
  const { data: residentsData } = useQuery<{ data: Resident[] }>({
    queryKey: ['residents', 'active'],
    queryFn: async () => {
      const response = await api.get('/residents', {
        params: { status: 'Ativo', limit: '100' },
      })
      return response.data
    },
  })

  const residents = residentsData?.data || []
  const selectedResident = residents.find((r) => r.id === residentId)

  const filteredResidents = searchTerm.trim()
    ? residents.filter((resident) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          resident.fullName.toLowerCase().includes(searchLower) ||
          resident.socialName?.toLowerCase().includes(searchLower) ||
          resident.bed?.code.toLowerCase().includes(searchLower)
        )
      })
    : []

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectResident = (id: string) => {
    onResidentChange(id)
    setSearchTerm('')
    setShowResults(false)
  }

  const handleClearResident = () => {
    onResidentChange(null)
    setSearchTerm('')
  }

  const toggleFilter = (filter: ContentFilterType) => {
    if (contentFilters.includes(filter)) {
      onContentFiltersChange(contentFilters.filter((f) => f !== filter))
    } else {
      onContentFiltersChange([...contentFilters, filter])
    }
  }

  const selectAllFilters = () => {
    onContentFiltersChange(Object.values(ContentFilterType))
  }

  const clearAllFilters = () => {
    onContentFiltersChange([])
  }

  // Agrupar filtros por categoria
  const medicationFilters = [ContentFilterType.MEDICATIONS]
  const eventFilters = [
    ContentFilterType.VACCINATIONS,
    ContentFilterType.CONSULTATIONS,
    ContentFilterType.EXAMS,
    ContentFilterType.PROCEDURES,
    ContentFilterType.OTHER_EVENTS,
  ]
  const recordFilters = [
    ContentFilterType.HYGIENE,
    ContentFilterType.FEEDING,
    ContentFilterType.HYDRATION,
    ContentFilterType.WEIGHT,
    ContentFilterType.MONITORING,
    ContentFilterType.ELIMINATION,
    ContentFilterType.BEHAVIOR,
    ContentFilterType.SLEEP,
    ContentFilterType.ACTIVITIES,
    ContentFilterType.VISITS,
    ContentFilterType.OTHER_RECORDS,
  ]

  return (
    <div className="space-y-4">
      {/* Escopo: Institucional vs Por Residente */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Label className="text-sm font-medium mb-2 block">Visualização</Label>
          <Select value={scope} onValueChange={(v) => onScopeChange(v as ScopeType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">📋 Geral (Todos Residentes)</SelectItem>
              <SelectItem value="institutional">🏢 Institucional (Eventos da Instituição)</SelectItem>
              <SelectItem value="resident">👤 Por Residente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Seletor de residente (apenas quando scope = 'resident') */}
        {scope === 'resident' && (
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Residente</Label>
            {selectedResident ? (
              <div className="relative">
                <Badge
                  variant="outline"
                  className="w-full justify-between px-3 py-2 h-10 text-left font-normal"
                >
                  <span className="truncate">{selectedResident.fullName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-2"
                    onClick={handleClearResident}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar residente..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setShowResults(true)
                    }}
                    onFocus={() => setShowResults(true)}
                    className="pl-9"
                  />
                </div>

                {/* Dropdown de resultados */}
                {showResults && filteredResidents.length > 0 && (
                  <Card
                    ref={resultsRef}
                    className="absolute z-50 w-full mt-1 max-h-64 overflow-auto"
                  >
                    {filteredResidents.map((resident) => (
                      <button
                        key={resident.id}
                        onClick={() => handleSelectResident(resident.id)}
                        className="w-full px-4 py-3 hover:bg-accent text-left flex items-center gap-2 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{resident.fullName}</p>
                          {resident.bed && (
                            <p className="text-xs text-muted-foreground">
                              Leito: {resident.bed.code}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros de tipo (apenas quando residente selecionado) */}
      {scope === 'resident' && residentId && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Tipos de Conteúdo</Label>
              <Badge variant="secondary" className="text-xs">
                {contentFilters.length} selecionados
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllFilters}>
                Todos
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Limpar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Medicamentos */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Medicamentos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {medicationFilters.map((filter) => (
                    <div key={filter} className="flex items-center gap-2">
                      <Checkbox
                        id={filter}
                        checked={contentFilters.includes(filter)}
                        onCheckedChange={() => toggleFilter(filter)}
                      />
                      <Label
                        htmlFor={filter}
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        <span>{CONTENT_FILTER_ICONS[filter]}</span>
                        <span>{CONTENT_FILTER_LABELS[filter]}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agendamentos Pontuais */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Agendamentos Pontuais
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {eventFilters.map((filter) => (
                    <div key={filter} className="flex items-center gap-2">
                      <Checkbox
                        id={filter}
                        checked={contentFilters.includes(filter)}
                        onCheckedChange={() => toggleFilter(filter)}
                      />
                      <Label
                        htmlFor={filter}
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        <span>{CONTENT_FILTER_ICONS[filter]}</span>
                        <span>{CONTENT_FILTER_LABELS[filter]}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Registros Obrigatórios */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Registros Obrigatórios
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recordFilters.map((filter) => (
                    <div key={filter} className="flex items-center gap-2">
                      <Checkbox
                        id={filter}
                        checked={contentFilters.includes(filter)}
                        onCheckedChange={() => toggleFilter(filter)}
                      />
                      <Label
                        htmlFor={filter}
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        <span>{CONTENT_FILTER_ICONS[filter]}</span>
                        <span>{CONTENT_FILTER_LABELS[filter]}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
