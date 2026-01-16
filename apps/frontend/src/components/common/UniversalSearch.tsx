import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, User, FileText, Eye, X } from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'
import { tenantKey } from '@/lib/query-keys'
import { usePublishedPops } from '@/hooks/usePops'
import { ResidentQuickViewModal } from '@/components/residents/ResidentQuickViewModal'
import { POPQuickViewModal } from '@/components/pops/POPQuickViewModal'

// ══════════════════════════════════════════════════════════════════════════
// GUIA DE EXTENSIBILIDADE
// ══════════════════════════════════════════════════════════════════════════
// Para adicionar novo tipo de busca:
// 1. Adicionar valor em SearchType: type SearchType = 'residents' | 'pops' | 'novo-tipo'
// 2. Adicionar opção em SEARCH_TYPE_OPTIONS
// 3. Adicionar query condicional para o novo tipo (ver seção QUERIES)
// 4. Adicionar função de filtro para o novo tipo (ver seção FILTER FUNCTIONS)
// 5. Adicionar renderização de resultado no dropdown (ver seção RESULTS RENDERING)
// 6. Criar modal de visualização rápida (se necessário)
// 7. Adicionar callback onSelectNovoTipo nas props e state para modal
// ══════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ──────────────────────────────────────────────────────────────────────────

type SearchType = 'residents' | 'pops'

interface SearchTypeOption {
  value: SearchType
  label: string
  placeholder: string
  icon: typeof User | typeof FileText
}

const SEARCH_TYPE_OPTIONS: SearchTypeOption[] = [
  {
    value: 'residents',
    label: 'Residentes',
    placeholder: 'Buscar residente por nome ou leito...',
    icon: User,
  },
  {
    value: 'pops',
    label: 'POPs',
    placeholder: 'Buscar POP por título...',
    icon: FileText,
  },
]

const LOCAL_STORAGE_KEY = 'universal-search:preferred-type'

interface Resident {
  id: string
  fullName: string
  socialName?: string | null
  bed?: {
    code: string
  } | null
}

interface Pop {
  id: string
  title: string
  notes?: string | null
  category: string
}

interface Props {
  // Callbacks para ações após seleção
  onAfterSelectResident?: () => void
  onAfterSelectPop?: () => void
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────

export function UniversalSearch({ onAfterSelectResident, onAfterSelectPop }: Props) {
  // ────────────────────────────────────────────────────────────────────────
  // STATE
  // ────────────────────────────────────────────────────────────────────────

  const [searchType, setSearchType] = useState<SearchType>(() => {
    // Restaurar preferência do localStorage
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored && (stored === 'residents' || stored === 'pops')) {
      return stored as SearchType
    }
    return 'residents' // Default
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Modal states
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [selectedPopId, setSelectedPopId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // ────────────────────────────────────────────────────────────────────────
  // QUERIES (Buscar dados de cada tipo)
  // ────────────────────────────────────────────────────────────────────────

  // Query para residentes ativos
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery<{ data: Resident[] }>({
    queryKey: tenantKey('residents', 'list', JSON.stringify({ status: 'Ativo' })),
    queryFn: async () => {
      const response = await api.get('/residents', {
        params: {
          status: 'Ativo',
          limit: '100',
        },
      })
      return response.data
    },
    enabled: searchType === 'residents', // Só buscar se tipo selecionado for residents
  })

  // Query para POPs publicados
  const {
    data: popsData,
    isLoading: isLoadingPops,
  } = usePublishedPops()

  const residents = residentsData?.data || []
  const pops = popsData || []

  // Loading condicional baseado no tipo
  const isLoading = searchType === 'residents' ? isLoadingResidents : isLoadingPops

  // ────────────────────────────────────────────────────────────────────────
  // FILTER FUNCTIONS (Filtrar resultados pelo termo de busca)
  // ────────────────────────────────────────────────────────────────────────

  const filterResidents = (term: string): Resident[] => {
    if (!term.trim()) return []

    const searchLower = term.toLowerCase()
    return residents.filter((resident) => {
      const fullNameMatch = resident.fullName.toLowerCase().includes(searchLower)
      const socialNameMatch = resident.socialName?.toLowerCase().includes(searchLower)
      const bedMatch = resident.bed?.code.toLowerCase().includes(searchLower)

      return fullNameMatch || socialNameMatch || bedMatch
    })
  }

  const filterPops = (term: string): Pop[] => {
    if (!term.trim()) return []

    const searchLower = term.toLowerCase()
    return pops.filter((pop) => {
      const titleMatch = pop.title.toLowerCase().includes(searchLower)
      const notesMatch = pop.notes?.toLowerCase().includes(searchLower)
      const categoryMatch = pop.category.toLowerCase().includes(searchLower)

      return titleMatch || notesMatch || categoryMatch
    })
  }

  // Filtered results baseado no tipo de busca
  const filteredResults = searchTerm.trim()
    ? searchType === 'residents'
      ? filterResidents(searchTerm)
      : filterPops(searchTerm)
    : []

  // ────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ────────────────────────────────────────────────────────────────────────

  // Salvar preferência do tipo de busca
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, searchType)
  }, [searchType])

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

  // Resetar selectedIndex ao mudar tipo de busca ou termo
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchType, searchTerm])

  // ────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────────────────

  const handleSelectItem = (id: string) => {
    if (searchType === 'residents') {
      setSelectedResidentId(id)
      onAfterSelectResident?.()
    } else if (searchType === 'pops') {
      setSelectedPopId(id)
      onAfterSelectPop?.()
    }

    setShowResults(false)
    setSearchTerm('')
    setSelectedIndex(0)
  }

  const handleClear = () => {
    setSearchTerm('')
    setShowResults(false)
    setSelectedIndex(0)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || filteredResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredResults[selectedIndex]) {
          const item = filteredResults[selectedIndex] as Resident | Pop
          handleSelectItem(item.id)
        }
        break
      case 'Escape':
        setShowResults(false)
        break
    }
  }

  const handleSearchTypeChange = (value: SearchType) => {
    setSearchType(value)
    setSearchTerm('')
    setShowResults(false)
    setSelectedIndex(0)
    inputRef.current?.focus()
  }

  // Obter opção atual
  const currentOption = SEARCH_TYPE_OPTIONS.find((opt) => opt.value === searchType)!

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card className="p-4 mb-6">
        <div className="relative">
          <div className="flex items-center gap-3">
            {/* Select de tipo de busca */}
            <div className="w-[160px]">
              <Select value={searchType} onValueChange={handleSearchTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Campo de busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={currentOption.placeholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowResults(true)
                  setSelectedIndex(0)
                }}
                onFocus={() => setShowResults(true)}
                onKeyDown={handleKeyDown}
                className="pl-9 pr-9"
              />
              {searchTerm && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botão visualizar */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (filteredResults.length > 0) {
                  const first = filteredResults[0] as Resident | Pop
                  handleSelectItem(first.id)
                }
              }}
              disabled={filteredResults.length === 0}
              title="Visualizar"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Dropdown de resultados */}
          {showResults && searchTerm.trim() && (
            <div
              ref={resultsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto"
            >
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="py-1">
                  {/* RESULTS RENDERING - Renderizar baseado no tipo */}
                  {searchType === 'residents' &&
                    (filteredResults as Resident[]).map((resident, index) => (
                      <button
                        key={resident.id}
                        onClick={() => handleSelectItem(resident.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-accent transition-colors',
                          selectedIndex === index && 'bg-accent'
                        )}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {resident.fullName}
                          </p>
                          {resident.socialName && (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {resident.socialName}
                            </p>
                          )}
                        </div>
                        {resident.bed && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            Leito: {resident.bed.code}
                          </span>
                        )}
                      </button>
                    ))}

                  {searchType === 'pops' &&
                    (filteredResults as Pop[]).map((pop, index) => (
                      <button
                        key={pop.id}
                        onClick={() => handleSelectItem(pop.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-accent transition-colors',
                          selectedIndex === index && 'bg-accent'
                        )}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {pop.title}
                          </p>
                          {pop.notes && (
                            <p className="text-xs text-muted-foreground truncate">
                              {pop.notes}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        {searchTerm.trim() && !showResults && filteredResults.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {filteredResults.length} resultado
            {filteredResults.length !== 1 ? 's' : ''} encontrado
            {filteredResults.length !== 1 ? 's' : ''}
          </p>
        )}
      </Card>

      {/* Modals */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
        />
      )}

      {selectedPopId && (
        <POPQuickViewModal
          popId={selectedPopId}
          onClose={() => setSelectedPopId(null)}
        />
      )}
    </>
  )
}
