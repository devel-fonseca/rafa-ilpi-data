import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/services/api'
import { ResidentSearchSelect } from '@/components/residents/ResidentSearchSelect'

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
  allowLegacyGeneralScope?: boolean
  onScopeChange: (scope: ScopeType) => void
  onResidentChange: (residentId: string | null) => void
  onContentFiltersChange: (filters: ContentFilterType[]) => void
}

export function AgendaFilters({
  scope,
  residentId,
  contentFilters,
  allowLegacyGeneralScope = false,
  onScopeChange,
  onResidentChange,
  onContentFiltersChange,
}: Props) {
  const [showFilters, setShowFilters] = useState(true)

  // Buscar residentes ativos
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery<{ data: Resident[] }>({
    queryKey: ['residents', 'active'],
    queryFn: async () => {
      const response = await api.get('/residents', {
        params: { status: 'Ativo', limit: '100' },
      })
      return response.data
    },
  })

  const residents = residentsData?.data || []

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
              {allowLegacyGeneralScope && (
                <SelectItem value="general">📋 Geral (Todos Residentes) • Legado</SelectItem>
              )}
              <SelectItem value="institutional">🏢 Institucional (Eventos da Instituição)</SelectItem>
              <SelectItem value="resident">👤 Por Residente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Seletor de residente (apenas quando scope = 'resident') */}
        {scope === 'resident' && (
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Residente</Label>
            <ResidentSearchSelect
              residents={residents}
              value={residentId}
              onValueChange={onResidentChange}
              isLoading={isLoadingResidents}
              placeholder="Buscar residente por nome ou leito..."
              emptyMessage="Nenhum residente encontrado."
            />
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

              {/* Registros Programados */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Registros Programados
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
