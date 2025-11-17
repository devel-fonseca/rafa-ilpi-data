import { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { User, Calendar, MapPin, AlertCircle, Loader2, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calculateAge } from '@/lib/utils'
import { getSignedFileUrl } from '@/services/upload'

interface Resident {
  id: string
  fullName: string
  birthDate: string
  fotoUrl?: string
  roomId?: string
  bedId?: string
  allergies?: string
  chronicConditions?: string
  cns?: string
  cpf?: string
}

export function Step1ResidentInfo() {
  const { watch, setValue } = useFormContext()
  const residentId = watch('residentId')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(!residentId)
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())

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

  // Buscar URLs assinadas para as fotos dos residentes filtrados
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      const residentsWithPhotos = filteredResidents.filter((r) => r.fotoUrl)
      if (residentsWithPhotos.length === 0) return

      // Fazer todas as requisições em paralelo
      const photoPromises = residentsWithPhotos.map(async (resident) => {
        try {
          const signedUrl = await getSignedFileUrl(resident.fotoUrl!)
          return { id: resident.id, url: signedUrl }
        } catch (error) {
          console.error(`Erro ao obter URL da foto de ${resident.fullName}:`, error)
          return null
        }
      })

      const results = await Promise.all(photoPromises)

      // Atualizar URLs carregadas com sucesso
      setPhotoUrls((prevUrls) => {
        const newUrls = new Map(prevUrls)
        results.forEach((result) => {
          if (result) {
            newUrls.set(result.id, result.url)
          }
        })
        return newUrls
      })
    }

    if (filteredResidents.length > 0) {
      fetchPhotoUrls()
    }
  }, [filteredResidents])

  // Buscar URL assinada para a foto do residente selecionado
  useEffect(() => {
    const fetchSelectedResidentPhoto = async () => {
      if (!resident?.fotoUrl) return

      try {
        const signedUrl = await getSignedFileUrl(resident.fotoUrl)
        setPhotoUrls((prevUrls) => {
          const newUrls = new Map(prevUrls)
          newUrls.set(resident.id, signedUrl)
          return newUrls
        })
      } catch (error) {
        console.error(`Erro ao obter URL da foto de ${resident.fullName}:`, error)
      }
    }

    if (resident) {
      fetchSelectedResidentPhoto()
    }
  }, [resident])

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
          <p className="text-sm text-gray-600">
            Busque por nome, CPF ou CNS para selecionar o residente
          </p>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lista de residentes */}
        {isLoadingList ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Carregando residentes...</span>
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
              const photoUrl = photoUrls.get(r.id)

              return (
                <Card
                  key={r.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectResident(r.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={r.fullName}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem:', photoUrl)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : r.fotoUrl ? (
                        <div className="h-12 w-12 rounded-full bg-gray-200 border-2 border-gray-200 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-500">
                            {r.fullName.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex-1">
                      <p className="font-semibold text-gray-900">{r.fullName}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {r.cpf && (
                          <span className="text-sm text-gray-600">
                            CPF: {r.cpf}
                          </span>
                        )}
                        {r.cns && (
                          <span className="text-sm text-gray-600">
                            CNS: {r.cns}
                          </span>
                        )}
                        {r.birthDate && (
                          <span className="text-sm text-gray-600">
                            {calculateAge(r.birthDate)} anos
                          </span>
                        )}
                      </div>
                    </div>
                    {r.roomId && (
                      <Badge variant="outline">
                        Quarto {r.roomId}
                        {r.bedId && ` - Leito ${r.bedId}`}
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
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Carregando dados do residente...</span>
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
  const selectedResidentPhotoUrl = photoUrls.get(resident.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Dados do Residente</h2>
          <p className="text-sm text-gray-600">
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
            {selectedResidentPhotoUrl ? (
              <div className="flex-shrink-0">
                <img
                  src={selectedResidentPhotoUrl}
                  alt={resident.fullName}
                  className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', selectedResidentPhotoUrl)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            ) : resident.fotoUrl ? (
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-lg bg-gray-200 border-2 border-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-500">
                    {resident.fullName.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Informações principais */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">
                    Nome Completo
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {resident.fullName}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">
                      Data de Nascimento
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {format(parseISO(resident.birthDate), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{age} anos</p>
                </div>

                {resident.cns && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-600">CNS</span>
                    </div>
                    <p className="text-sm text-gray-900">{resident.cns}</p>
                  </div>
                )}

                {(resident.roomId || resident.bedId) && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">
                        Localização
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">
                      {resident.roomId && `Quarto ${resident.roomId}`}
                      {resident.roomId && resident.bedId && ' - '}
                      {resident.bedId && `Leito ${resident.bedId}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Alergias */}
              {resident.allergies && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">
                      Alergias
                    </span>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-900">{resident.allergies}</p>
                  </div>
                </div>
              )}

              {/* Condições Crônicas */}
              {resident.chronicConditions && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-orange-800">
                      Condições Crônicas
                    </span>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-900">
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
