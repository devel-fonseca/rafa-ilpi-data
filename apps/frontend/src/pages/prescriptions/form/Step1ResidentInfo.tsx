import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { User, Calendar, MapPin, AlertCircle, Loader2, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { api } from '@/services/api'
import { format } from 'date-fns'
import { extractDateOnly } from '@/utils/dateHelpers'
import { ptBR } from 'date-fns/locale'
import { calculateAge } from '@/lib/utils'
import { formatBedFromResident } from '@/utils/formatters'

interface Allergy {
  id: string
  substance: string
  reaction?: string
  severity?: string
  notes?: string
}

interface Resident {
  id: string
  fullName: string
  birthDate: string
  fotoUrl?: string
  roomId?: string
  bedId?: string
  allergies?: Allergy[]
  chronicConditions?: string
  cns?: string
  cpf?: string
}

export function Step1ResidentInfo() {
  const { watch, setValue } = useFormContext()
  const residentId = watch('residentId')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(!residentId)

  // Buscar lista de residentes para pesquisa
  const { data: residents = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['residents-list', searchQuery],
    queryFn: async () => {
      const response = await api.get<{ data: Resident[] }>('/residents', {
        params: { limit: 50 },
      })
      return response.data.data
    },
    enabled: showSearch,
  })

  // Buscar dados do residente selecionado
  const { data: resident, isLoading, error } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: async () => {
      const response = await api.get<Resident>(`/residents/${residentId}`)
      return response.data
    },
    enabled: !!residentId,
  })

  // Filtrar residentes pela busca
  const filteredResidents = residents.filter((r) => {
    const query = searchQuery.toLowerCase()
    return (
      r.fullName.toLowerCase().includes(query) ||
      r.cpf?.replace(/\D/g, '').includes(query.replace(/\D/g, '')) ||
      r.cns?.includes(query)
    )
  })



  const handleSelectResident = (residentId: string) => {
    setValue('residentId', residentId)
    setShowSearch(false)
    setSearchQuery('')
  }

  const handleChangeResident = () => {
    setValue('residentId', '')
    setShowSearch(true)
    setSearchQuery('')
  }

  // Mostrar busca se não tiver residente selecionado
  if (showSearch || !residentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Selecionar Residente</h2>
          <p className="text-sm text-muted-foreground">
            Busque por nome, CPF ou CNS para selecionar o residente
          </p>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            type="text"
            placeholder="Digite o nome, CPF ou CNS do residente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lista de residentes */}
        {isLoadingList ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando residentes...</span>
          </div>
        ) : filteredResidents.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {searchQuery
                ? 'Nenhum residente encontrado com os critérios de busca.'
                : 'Nenhum residente cadastrado.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredResidents.map((r) => {
              return (
                <Card
                  key={r.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectResident(r.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <PhotoViewer
                          photoUrl={r.fotoUrl}
                          altText={r.fullName}
                          size="small"
                          className="!w-12 !h-12 rounded-full"
                        />
                      </div>
                      <div className="flex-1">
                      <p className="font-semibold text-foreground">{r.fullName}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {r.cpf && (
                          <span className="text-sm text-muted-foreground">
                            CPF: {r.cpf}
                          </span>
                        )}
                        {r.cns && (
                          <span className="text-sm text-muted-foreground">
                            CNS: {r.cns}
                          </span>
                        )}
                        {r.birthDate && (
                          <span className="text-sm text-muted-foreground">
                            {calculateAge(r.birthDate)} anos
                          </span>
                        )}
                      </div>
                    </div>
                    {r.bed && (
                      <Badge variant="outline" className="font-mono">
                        {formatBedFromResident(r)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando dados do residente...</span>
      </div>
    )
  }

  if (error || !resident) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados do residente. Tente novamente.
        </AlertDescription>
      </Alert>
    )
  }

  const age = calculateAge(resident.birthDate)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Dados do Residente</h2>
          <p className="text-sm text-muted-foreground">
            Informações do residente que receberá a prescrição médica
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleChangeResident}
        >
          Trocar Residente
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Foto */}
            <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
              <PhotoViewer
                photoUrl={resident.fotoUrl}
                altText={resident.fullName}
                size="large"
                className="!w-24 !h-24"
              />
            </div>

            {/* Informações principais */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Nome Completo
                  </span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {resident.fullName}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Data de Nascimento
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {format(
                      new Date(extractDateOnly(resident.birthDate) + 'T12:00:00'),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{age} anos</p>
                </div>

                {resident.cns && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-muted-foreground">CNS</span>
                    </div>
                    <p className="text-sm text-foreground">{resident.cns}</p>
                  </div>
                )}

                {resident.bed && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Localização
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-mono">
                      {formatBedFromResident(resident)}
                    </p>
                  </div>
                )}
              </div>

              {/* Alergias */}
              {resident.allergies && resident.allergies.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-danger" />
                    <span className="text-sm font-semibold text-danger/90">
                      Alergias
                    </span>
                  </div>
                  <div className="p-3 bg-danger/5 border border-danger/30 rounded-md">
                    <div className="flex flex-wrap gap-2">
                      {resident.allergies.map((allergy) => (
                        <Badge key={allergy.id} variant="destructive" className="text-xs">
                          {allergy.substance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Condições Crônicas */}
              {resident.chronicConditions && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-severity-warning/90">
                      Condições Crônicas
                    </span>
                  </div>
                  <div className="p-3 bg-severity-warning/5 border border-severity-warning/30 rounded-md">
                    <p className="text-sm text-severity-warning/90">
                      {resident.chronicConditions}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
