import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Bed, Clock, FileText, Check, ChevronLeft, ChevronRight } from 'lucide-react'
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
import type { LatestRecord } from '@/hooks/useDailyRecords'
import { getSignedFileUrl } from '@/services/upload'

const ITEMS_PER_PAGE = 12

interface Resident {
  id: string
  fullName: string
  fotoUrl?: string
  roomId?: string
  bedId?: string
  status: string
  cpf?: string
  cns?: string
}

interface ResidentSelectionGridProps {
  residents: Resident[]
  latestRecords: LatestRecord[]
  onSelectResident: (residentId: string) => void
  isLoading?: boolean
}

export function ResidentSelectionGrid({
  residents,
  latestRecords,
  onSelectResident,
  isLoading = false,
}: ResidentSelectionGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const [currentPage, setCurrentPage] = useState(1)

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
    if (statusFilter === 'active') {
      filtered = filtered.filter((r) => r.status === 'Ativo')
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((r) => r.status === 'Inativo')
    } else if (statusFilter === 'withRecord') {
      filtered = filtered.filter((r) => latestRecordsMap.has(r.id))
    } else if (statusFilter === 'withoutRecord') {
      filtered = filtered.filter((r) => !latestRecordsMap.has(r.id))
    }

    return filtered
  }, [residents, searchTerm, statusFilter, latestRecordsMap])

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

  // Buscar URLs assinadas para as fotos dos residentes APENAS da página atual
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      // Buscar apenas URLs dos residentes da página atual (lazy loading)
      const residentsWithPhotos = paginatedResidents.filter(r => r.fotoUrl)

      if (residentsWithPhotos.length === 0) return

      // Fazer todas as requisições em PARALELO (muito mais rápido!)
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

      // Atualizar apenas as URLs que foram carregadas com sucesso
      setPhotoUrls(prevUrls => {
        const newUrls = new Map(prevUrls)
        results.forEach(result => {
          if (result) {
            newUrls.set(result.id, result.url)
          }
        })
        return newUrls
      })
    }

    if (paginatedResidents.length > 0) {
      fetchPhotoUrls()
    }
  }, [paginatedResidents])

  // Tradução dos tipos de registro
  const getRecordTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      HIGIENE: 'Higiene',
      ALIMENTACAO: 'Alimentação',
      HIDRATACAO: 'Hidratação',
      MONITORAMENTO: 'Monitor. Vitais',
      ELIMINACAO: 'Eliminação',
      COMPORTAMENTO: 'Comportamento',
      INTERCORRENCIA: 'Intercorrência',
      ATIVIDADES: 'Atividades',
      VISITA: 'Visita',
      OUTROS: 'Outros',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registros Diários</h1>
        <p className="text-muted-foreground mt-1">
          Selecione um residente para visualizar os registros
        </p>
      </div>

      {/* Busca e Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar residente (nome, CPF ou CNS)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Dropdown de Filtros */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              {statusFilter === 'all' && <Check className="mr-2 h-4 w-4" />}
              {statusFilter !== 'all' && <span className="mr-2 h-4 w-4" />}
              Todos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>
              {statusFilter === 'active' && <Check className="mr-2 h-4 w-4" />}
              {statusFilter !== 'active' && <span className="mr-2 h-4 w-4" />}
              Ativos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
              {statusFilter === 'inactive' && <Check className="mr-2 h-4 w-4" />}
              {statusFilter !== 'inactive' && <span className="mr-2 h-4 w-4" />}
              Inativos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('withRecord')}>
              {statusFilter === 'withRecord' && <Check className="mr-2 h-4 w-4" />}
              {statusFilter !== 'withRecord' && <span className="mr-2 h-4 w-4" />}
              Com registro hoje
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('withoutRecord')}>
              {statusFilter === 'withoutRecord' && <Check className="mr-2 h-4 w-4" />}
              {statusFilter !== 'withoutRecord' && <span className="mr-2 h-4 w-4" />}
              Sem registro hoje
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid de Residentes */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedResidents.map((resident) => {
            const lastRecord = latestRecordsMap.get(resident.id)
            const photoUrl = photoUrls.get(resident.id)

            return (
              <Card
                key={resident.id}
                className="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => onSelectResident(resident.id)}
              >
                {/* Badge de Status */}
                <div className="absolute top-3 right-3 z-10">
                  <Badge
                    variant={resident.status === 'Ativo' ? 'default' : 'secondary'}
                    className={
                      resident.status === 'Ativo'
                        ? 'bg-green-500 hover:bg-green-600'
                        : ''
                    }
                  >
                    {resident.status}
                  </Badge>
                </div>

                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  {/* Foto */}
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-200">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={resident.fullName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem:', photoUrl)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-bold text-white">
                          {resident.fullName.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="w-full">
                    <h3 className="font-semibold text-base leading-tight">
                      {resident.fullName}
                    </h3>
                  </div>

                  {/* Quarto e Leito */}
                  {(resident.roomId || resident.bedId) && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Bed className="h-4 w-4" />
                      <span>
                        {resident.roomId && `Quarto: ${resident.roomId}`}
                        {resident.roomId && resident.bedId && ' | '}
                        {resident.bedId && `Leito: ${resident.bedId}`}
                      </span>
                    </div>
                  )}

                  {/* Último Registro */}
                  {lastRecord ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {getRecordTypeLabel(lastRecord.type)} às {lastRecord.time}
                      </span>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectResident(resident.id)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Criar Registro
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

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
    </div>
  )
}
