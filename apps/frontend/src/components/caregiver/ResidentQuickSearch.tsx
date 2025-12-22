import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, User, Eye, X } from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface Resident {
  id: string
  fullName: string
  socialName?: string | null
  bed?: {
    code: string
  } | null
}

interface Props {
  onSelectResident: (residentId: string) => void
}

export function ResidentQuickSearch({ onSelectResident }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Buscar residentes ativos
  const { data: residentsData, isLoading } = useQuery<{ data: Resident[] }>({
    queryKey: ['residents', 'active'],
    queryFn: async () => {
      const response = await api.get('/residents', {
        params: {
          status: 'Ativo',
          limit: '100',
        },
      })
      return response.data
    },
  })

  const residents = residentsData?.data || []

  // Filtrar residentes pelo termo de busca
  const filteredResidents = searchTerm.trim()
    ? residents.filter((resident) => {
        const searchLower = searchTerm.toLowerCase()
        const fullNameMatch = resident.fullName.toLowerCase().includes(searchLower)
        const socialNameMatch = resident.socialName?.toLowerCase().includes(searchLower)
        const bedMatch = resident.bed?.code.toLowerCase().includes(searchLower)

        return fullNameMatch || socialNameMatch || bedMatch
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

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || filteredResidents.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredResidents.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredResidents[selectedIndex]) {
          handleSelectResident(filteredResidents[selectedIndex].id)
        }
        break
      case 'Escape':
        setShowResults(false)
        break
    }
  }

  const handleSelectResident = (residentId: string) => {
    setShowResults(false)
    setSearchTerm('')
    setSelectedIndex(0)
    onSelectResident(residentId)
  }

  const handleClear = () => {
    setSearchTerm('')
    setShowResults(false)
    setSelectedIndex(0)
    inputRef.current?.focus()
  }

  return (
    <Card className="p-4 mb-6">
      <div className="relative">
        <div className="flex items-center gap-3">
          {/* Campo de busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar residente por nome ou leito..."
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
              if (filteredResidents.length > 0) {
                handleSelectResident(filteredResidents[0].id)
              }
            }}
            disabled={filteredResidents.length === 0}
            title="Visualizar prontuário"
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
                Carregando residentes...
              </div>
            ) : filteredResidents.length > 0 ? (
              <div className="py-1">
                {filteredResidents.map((resident, index) => (
                  <button
                    key={resident.id}
                    onClick={() => handleSelectResident(resident.id)}
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
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum residente encontrado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      {searchTerm.trim() && !showResults && filteredResidents.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {filteredResidents.length} residente
          {filteredResidents.length !== 1 ? 's' : ''} encontrado
          {filteredResidents.length !== 1 ? 's' : ''}
        </p>
      )}
    </Card>
  )
}
