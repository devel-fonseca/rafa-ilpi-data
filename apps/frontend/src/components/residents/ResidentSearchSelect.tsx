import { useMemo, useRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Search, User, X } from 'lucide-react'

interface ResidentOption {
  id: string
  fullName: string
  socialName?: string | null
  bed?: {
    code: string
  } | null
}

interface ResidentSearchSelectProps {
  residents: ResidentOption[]
  value: string | null
  onValueChange: (residentId: string | null) => void
  placeholder?: string
  isLoading?: boolean
  disabled?: boolean
  emptyMessage?: string
}

export function ResidentSearchSelect({
  residents,
  value,
  onValueChange,
  placeholder = 'Buscar residente por nome ou leito...',
  isLoading = false,
  disabled = false,
  emptyMessage = 'Nenhum residente encontrado.',
}: ResidentSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const selectedResident = useMemo(
    () => residents.find((resident) => resident.id === value) || null,
    [residents, value],
  )

  const filteredResidents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return residents.slice(0, 25)
    }

    return residents.filter((resident) => {
      const fullNameMatch = resident.fullName.toLowerCase().includes(normalizedSearch)
      const socialNameMatch = resident.socialName?.toLowerCase().includes(normalizedSearch)
      const bedMatch = resident.bed?.code.toLowerCase().includes(normalizedSearch)

      return fullNameMatch || socialNameMatch || bedMatch
    })
  }, [residents, searchTerm])

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

  if (selectedResident) {
    return (
      <Badge
        variant="outline"
        className="w-full justify-between px-3 py-2 h-10 text-left font-normal"
      >
        <span className="truncate">{selectedResident.fullName}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-2"
          onClick={() => onValueChange(null)}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      </Badge>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          className="pl-9 pr-9"
          disabled={disabled}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showResults && (
        <Card
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 max-h-64 overflow-auto"
        >
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Carregando residentes...</div>
          ) : filteredResidents.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div className="py-1">
              {filteredResidents.map((resident) => (
                <button
                  key={resident.id}
                  type="button"
                  onClick={() => {
                    onValueChange(resident.id)
                    setShowResults(false)
                    setSearchTerm('')
                  }}
                  className="w-full px-3 py-2 hover:bg-accent text-left flex items-center gap-2 border-b last:border-0"
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{resident.fullName}</p>
                    {resident.bed && (
                      <p className="text-xs text-muted-foreground">
                        Leito: {resident.bed.code}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
