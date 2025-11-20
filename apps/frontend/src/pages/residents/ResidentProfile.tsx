import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useResident, useDeleteResident } from '@/hooks/useResidents'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { api } from '@/services/api'
import { getSignedFileUrl } from '@/services/upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  AlertCircle,
  Loader2,
  User,
  Pill,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'
import { RECORD_TYPE_LABELS, renderRecordSummary } from '@/utils/recordTypeLabels'
import { VaccinationList } from '@/components/vaccinations/VaccinationList'

export default function ResidentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [deleteModal, setDeleteModal] = useState(false)
  const [viewDate, setViewDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const healthConditionsCardRef = useRef<HTMLDivElement>(null)

  const { data: resident, isLoading, error } = useResident(id || '')

  // Carregar URL assinada da foto quando o residente for carregado
  useEffect(() => {
    const loadPhotoUrl = async () => {
      if (resident?.fotoUrl) {
        try {
          const signedUrl = await getSignedFileUrl(resident.fotoUrl)
          setPhotoUrl(signedUrl)
        } catch (error) {
          console.error('Erro ao carregar foto do residente:', error)
          setPhotoUrl(null)
        }
      } else {
        setPhotoUrl(null)
      }
    }
    loadPhotoUrl()
  }, [resident?.fotoUrl])
  const deleteMutation = useDeleteResident()

  // Funções de navegação entre datas
  const goToPreviousDay = () => {
    const currentDate = new Date(viewDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setViewDate(format(currentDate, 'yyyy-MM-dd'))
  }

  const goToNextDay = () => {
    const currentDate = new Date(viewDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setViewDate(format(currentDate, 'yyyy-MM-dd'))
  }

  const goToToday = () => {
    setViewDate(format(new Date(), 'yyyy-MM-dd'))
  }

  // Buscar prescrições do residente
  const { prescriptions = [] } = usePrescriptions({
    residentId: id,
    page: 1,
    limit: 100,
  })

  // Buscar registros diários da data selecionada
  const today = format(new Date(), 'yyyy-MM-dd')
  const isViewingToday = viewDate === today

  const { data: viewDateRecordsData } = useQuery({
    queryKey: ['daily-records', 'resident-profile', id, viewDate],
    queryFn: async () => {
      const response = await api.get(`/daily-records/resident/${id}/date/${viewDate}`)
      return response.data
    },
    enabled: !!id && id !== 'new',
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  const viewDateRecords = Array.isArray(viewDateRecordsData) ? viewDateRecordsData : []

  // Buscar último monitoramento vital (otimizado)
  const { data: lastVitalSignData } = useQuery({
    queryKey: ['daily-records', 'resident-profile', id, 'last-vital'],
    queryFn: async () => {
      try {
        const response = await api.get(`/daily-records/resident/${id}/last-vital-sign`)
        return response.data || null
      } catch {
        return null
      }
    },
    enabled: !!id && id !== 'new',
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Determinar quais registros mostrar
  const dailyRecords = viewDateRecords
  const displayDate = viewDate
  const isToday = isViewingToday

  // Calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Calcular IMC
  const calculateBMI = (weight?: number, height?: number) => {
    if (!weight || !height) return null
    const bmi = weight / (height * height)
    return bmi.toFixed(1)
  }

  // Obter cor do badge de status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return 'bg-green-100 text-green-800'
      case 'INATIVO':
        return 'bg-yellow-100 text-yellow-800'
      case 'ALTA':
        return 'bg-blue-100 text-blue-800'
      case 'OBITO':
        return 'bg-gray-100 text-gray-800'
      case 'TRANSFERIDO':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Traduzir estado civil
  const translateMaritalStatus = (status?: string) => {
    switch (status) {
      case 'SOLTEIRO':
        return 'Solteiro(a)'
      case 'CASADO':
        return 'Casado(a)'
      case 'DIVORCIADO':
        return 'Divorciado(a)'
      case 'VIUVO':
        return 'Viúvo(a)'
      case 'UNIAO_ESTAVEL':
        return 'União Estável'
      default:
        return 'Não informado'
    }
  }

  // Traduzir tipo sanguíneo
  const translateBloodType = (bloodType?: string) => {
    if (!bloodType || bloodType === 'NAO_INFORMADO') return 'Não informado'
    const map: Record<string, string> = {
      A_POSITIVO: 'A+',
      A_NEGATIVO: 'A-',
      B_POSITIVO: 'B+',
      B_NEGATIVO: 'B-',
      AB_POSITIVO: 'AB+',
      AB_NEGATIVO: 'AB-',
      O_POSITIVO: 'O+',
      O_NEGATIVO: 'O-',
    }
    return map[bloodType] || bloodType
  }

  // Traduzir gênero
  const translateGender = (gender: string) => {
    switch (gender) {
      case 'MASCULINO':
        return 'Masculino'
      case 'FEMININO':
        return 'Feminino'
      case 'OUTRO':
        return 'Outro'
      default:
        return 'Não informado'
    }
  }

  // Helper para mostrar badge de status de preenchimento
  const getFieldCompletionBadge = (value: any) => {
    if (!value || value === 'Não informado' || value === '-') {
      return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">Não preenchido</Badge>
    }
    return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Completo</Badge>
  }

  // Helper para calcular percentual de preenchimento
  const getCompletionPercentage = (fields: any[]) => {
    const filledCount = fields.filter(f => f && f !== 'Não informado' && f !== '-').length
    return Math.round((filledCount / fields.length) * 100)
  }

  // Helper para mostrar badge de status geral da seção
  const getSectionCompletionBadge = (completionPercent: number) => {
    if (completionPercent === 100) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">100% Completo</Badge>
    } else if (completionPercent >= 50) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{completionPercent}% Preenchido</Badge>
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{completionPercent}% Incompleto</Badge>
    }
  }

  // Helper para truncar texto
  const truncateText = (text: string | undefined | null, maxLength: number = 100) => {
    if (!text) return { text: '', isTruncated: false }
    if (text.length <= maxLength) return { text, isTruncated: false }
    return { text: text.substring(0, maxLength) + '...', isTruncated: true }
  }

  // Scroll para o card de Saúde e Condições Médicas
  const scrollToHealthConditions = () => {
    if (healthConditionsCardRef.current) {
      healthConditionsCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Confirmar exclusão
  const handleDelete = async () => {
    if (!id) return

    try {
      await deleteMutation.mutateAsync(id)
      toast({
        title: 'Sucesso',
        description: 'Residente removido com sucesso',
      })
      navigate('/dashboard/residentes')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover residente',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-gray-600">Residente não encontrado</div>
        <Button variant="outline" onClick={() => navigate('/dashboard/residentes')}>
          Voltar para a lista
        </Button>
      </div>
    )
  }

  const activePrescriptions = prescriptions.filter((p: any) => p.status === 'ACTIVE')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/residentes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{resident.fullName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={getStatusBadgeColor(resident.status)}>{resident.status}</Badge>
              <span className="text-gray-600">{calculateAge(resident.birthDate)} anos</span>
              {resident.cpf && <span className="text-gray-600">CPF: {resident.cpf}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/dashboard/residentes/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" onClick={() => setDeleteModal(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Data de Admissão</CardDescription>
            <CardTitle className="text-lg">
              {resident.admissionDate
                ? format(new Date(resident.admissionDate), 'dd/MM/yyyy', { locale: ptBR })
                : '-'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Tempo na Instituição</CardDescription>
            <CardTitle className="text-lg">
              {resident.admissionDate
                ? `${Math.floor(
                    (new Date().getTime() - new Date(resident.admissionDate).getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                  )} meses`
                : '-'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Grau de Dependência</CardDescription>
            <CardTitle className="text-lg">{resident.dependencyLevel || '-'}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Responsável</CardDescription>
            <CardTitle className="text-lg">{resident.legalGuardianName || '-'}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Prescrições Ativas</CardDescription>
            <CardTitle className="text-lg">{activePrescriptions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Dados do Residente</TabsTrigger>
          <TabsTrigger value="vaccinations">Vacinação</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescrições</TabsTrigger>
          <TabsTrigger value="daily-records">Registros Diários</TabsTrigger>
        </TabsList>

        {/* TAB 1: Dados do Residente */}
        <TabsContent value="personal" className="space-y-6">
          {/* Seção: Dados Essenciais */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card: Identificação */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Identificação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={resident.fullName}
                          className="w-20 h-24 object-cover rounded-lg shadow-md border border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-gray-100 rounded-lg shadow-md border border-gray-200 flex items-center justify-center">
                          <User className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm text-gray-500">Nome Completo</div>
                        <div className="font-semibold text-lg text-gray-900">{resident.fullName}</div>
                        {resident.socialName && (
                          <>
                            <div className="text-sm text-gray-500 mt-2">Nome Social</div>
                            <div className="font-medium text-gray-700">{resident.socialName}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <div className="text-sm text-gray-500">Data de Nascimento</div>
                        <div className="font-medium text-gray-900">
                          {format(new Date(resident.birthDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Idade</div>
                        <div className="font-medium text-gray-900">{calculateAge(resident.birthDate)} anos</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Gênero</div>
                        <div className="font-medium text-gray-900">{translateGender(resident.gender)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">CPF</div>
                        <div className="font-medium text-gray-900">{resident.cpf || '-'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Saúde */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Saúde</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Tipo Sanguíneo</div>
                    <div className="font-semibold text-lg text-red-600">{translateBloodType(resident.bloodType)}</div>
                  </div>

                  {/* Sinais Vitais */}
                  {(() => {
                    if (lastVitalSignData) {
                      const vitalData = lastVitalSignData.data || {}
                      return (
                        <div className="border-t pt-4">
                          <div className="text-sm text-gray-500 mb-2">
                            Sinais Vitais em {format(new Date(lastVitalSignData.date), 'dd/MM/yyyy', { locale: ptBR })} às {lastVitalSignData.time}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {vitalData.pressaoArterial && (
                              <Badge variant="outline" className="text-xs">PA: {vitalData.pressaoArterial}</Badge>
                            )}
                            {vitalData.temperatura && (
                              <Badge variant="outline" className="text-xs">Temp: {vitalData.temperatura}°C</Badge>
                            )}
                            {vitalData.frequenciaCardiaca && (
                              <Badge variant="outline" className="text-xs">FC: {vitalData.frequenciaCardiaca} bpm</Badge>
                            )}
                            {vitalData.saturacaoO2 && (
                              <Badge variant="outline" className="text-xs">SpO₂: {vitalData.saturacaoO2}%</Badge>
                            )}
                            {vitalData.glicemia && (
                              <Badge variant="outline" className="text-xs">Glicemia: {vitalData.glicemia} mg/dL</Badge>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-500">Sinais Vitais</div>
                        <div className="text-sm text-gray-400 italic">Nenhum registro de monitoramento</div>
                      </div>
                    )
                  })()}

                  {resident.allergies && (() => {
                    const { text: truncatedAllergies, isTruncated: allergiesTruncated } = truncateText(resident.allergies)
                    return (
                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-500 mb-1">Alergias</div>
                        <div className="text-sm bg-red-50 border border-red-200 rounded p-2 text-red-700">
                          {truncatedAllergies}
                        </div>
                        {allergiesTruncated && (
                          <Button
                            type="button"
                            variant="link"
                            className="text-xs p-0 mt-2 h-auto"
                            onClick={scrollToHealthConditions}
                          >
                            Ver mais →
                          </Button>
                        )}
                      </div>
                    )
                  })()}
                  {resident.chronicConditions && (() => {
                    const { text: truncatedConditions, isTruncated: conditionsTruncated } = truncateText(resident.chronicConditions)
                    return (
                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-500 mb-1">Condições Crônicas</div>
                        <div className="text-sm text-gray-700">{truncatedConditions}</div>
                        {conditionsTruncated && (
                          <Button
                            type="button"
                            variant="link"
                            className="text-xs p-0 mt-2 h-auto"
                            onClick={scrollToHealthConditions}
                          >
                            Ver mais →
                          </Button>
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Card: Contato de Emergência */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Emergência</CardTitle>
                </CardHeader>
                <CardContent>
                  {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
                    <div className="space-y-3">
                      {resident.emergencyContacts.slice(0, 1).map((contact, idx) => (
                        <div key={idx}>
                          <div className="text-sm text-gray-500">Nome</div>
                          <div className="font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-500 mt-2">Telefone</div>
                          <div className="font-medium text-gray-900">{contact.phone}</div>
                          <div className="text-sm text-gray-500 mt-2">Parentesco</div>
                          <div className="font-medium text-gray-900">{contact.relationship}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">Não informado</div>
                  )}
                </CardContent>
              </Card>

              {/* Card: Acomodação */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Acomodação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Quarto</div>
                    <div className="font-semibold text-lg text-gray-900">{resident.roomId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Leito</div>
                    <div className="font-semibold text-lg text-gray-900">{resident.bedId || '-'}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Tempo na Instituição</div>
                    <div className="font-semibold text-lg text-gray-900">
                      {resident.admissionDate
                        ? `${Math.floor(
                            (new Date().getTime() - new Date(resident.admissionDate).getTime()) /
                              (1000 * 60 * 60 * 24 * 30)
                          )} meses`
                        : '-'}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="text-sm text-gray-500 mb-1">Grau de Dependência</div>
                    <div className="font-medium text-gray-900">{resident.dependencyLevel || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Seção: Informações Detalhadas */}
          <div className="space-y-4">
            {/* Card: Informações Pessoais */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Informações Pessoais</CardTitle>
                  {getSectionCompletionBadge(getCompletionPercentage([
                    resident.rg,
                    resident.rgIssuer,
                    resident.cns,
                    resident.civilStatus,
                    resident.religion,
                    resident.education,
                    resident.profession,
                    resident.nationality,
                    resident.motherName,
                    resident.fatherName,
                  ]))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sub-seção: Identificação */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Identificação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">RG</div>
                      <div className="font-medium text-gray-900">{resident.rg || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Órgão Emissor</div>
                      <div className="font-medium text-gray-900">{resident.rgIssuer || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">CNS</div>
                      <div className="font-medium text-gray-900">{resident.cns || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Sub-seção: Dados Demográficos */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Dados Demográficos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Estado Civil</div>
                      <div className="font-medium text-gray-900">{translateMaritalStatus(resident.civilStatus)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Religião</div>
                      <div className="font-medium text-gray-900">{resident.religion || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Escolaridade</div>
                      <div className="font-medium text-gray-900">{resident.education || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Profissão</div>
                      <div className="font-medium text-gray-900">{resident.profession || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Nacionalidade</div>
                      <div className="font-medium text-gray-900">{resident.nationality || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Naturalidade</div>
                      <div className="font-medium text-gray-900">
                        {resident.birthCity && resident.birthState
                          ? `${resident.birthCity}/${resident.birthState}`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-seção: Filiação */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Filiação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Nome da Mãe</div>
                      <div className="font-medium text-gray-900">{resident.motherName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Nome do Pai</div>
                      <div className="font-medium text-gray-900">{resident.fatherName || '-'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card: Endereços */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Endereços</CardTitle>
                  {getSectionCompletionBadge(getCompletionPercentage([
                    resident.currentStreet,
                    resident.currentCity,
                    resident.currentPhone,
                  ]))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Endereço Atual */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Endereço Atual</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm text-gray-500">Endereço</div>
                            <div className="font-medium">
                              {resident.currentStreet
                                ? `${resident.currentStreet}${
                                    resident.currentNumber ? `, ${resident.currentNumber}` : ''
                                  }${
                                    resident.currentComplement
                                      ? `, ${resident.currentComplement}`
                                      : ''
                                  }${
                                    resident.currentDistrict ? `, ${resident.currentDistrict}` : ''
                                  }${resident.currentCity ? `, ${resident.currentCity}` : ''}${
                                    resident.currentState ? `/${resident.currentState}` : ''
                                  }${resident.currentCep ? ` - CEP: ${resident.currentCep}` : ''}`
                                : 'Não informado'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">Telefone</div>
                            <div className="font-medium">
                              {resident.currentPhone || 'Não informado'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Endereço de Procedência */}
                  {resident.originStreet && (
                    <div className="pt-6 border-t">
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Endereço de Procedência
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-sm text-gray-500">Endereço</div>
                              <div className="font-medium">
                                {`${resident.originStreet}${
                                  resident.originNumber ? `, ${resident.originNumber}` : ''
                                }${
                                  resident.originComplement ? `, ${resident.originComplement}` : ''
                                }${resident.originDistrict ? `, ${resident.originDistrict}` : ''}${
                                  resident.originCity ? `, ${resident.originCity}` : ''
                                }${resident.originState ? `/${resident.originState}` : ''}${
                                  resident.originCep ? ` - CEP: ${resident.originCep}` : ''
                                }`}
                              </div>
                            </div>
                          </div>
                        </div>
                        {resident.originPhone && (
                          <div>
                            <div className="flex items-start gap-3">
                              <Phone className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="text-sm text-gray-500">Telefone</div>
                                <div className="font-medium">{resident.originPhone}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card: Contatos de Emergência */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contatos de Emergência</CardTitle>
                  {resident.emergencyContacts && resident.emergencyContacts.length > 0
                    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Preenchido</Badge>
                    : <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Não preenchido</Badge>
                  }
                </div>
              </CardHeader>
              <CardContent>
                {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
                  <div className="space-y-4">
                    {resident.emergencyContacts.map((contact, index) => (
                      <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-500">Nome</div>
                            <div className="font-medium">{contact.name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Telefone</div>
                            <div className="font-medium">{contact.phone}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Parentesco</div>
                            <div className="font-medium">{contact.relationship}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Nenhum contato de emergência cadastrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Responsável Legal */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Responsável Legal</CardTitle>
                  {getSectionCompletionBadge(getCompletionPercentage([
                    resident.legalGuardianName,
                    resident.legalGuardianCpf,
                    resident.legalGuardianPhone,
                  ]))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Nome</div>
                    <div className="font-medium">
                      {resident.legalGuardianName || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">CPF</div>
                    <div className="font-medium">
                      {resident.legalGuardianCpf || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">RG</div>
                    <div className="font-medium">{resident.legalGuardianRg || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tipo de Responsabilidade</div>
                    <div className="font-medium">
                      {resident.legalGuardianType || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Telefone</div>
                    <div className="font-medium">
                      {resident.legalGuardianPhone || 'Não informado'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">Endereço</div>
                    <div className="font-medium">
                      {resident.legalGuardianStreet
                        ? `${resident.legalGuardianStreet}${
                            resident.legalGuardianNumber ? `, ${resident.legalGuardianNumber}` : ''
                          }${
                            resident.legalGuardianComplement
                              ? `, ${resident.legalGuardianComplement}`
                              : ''
                          }${
                            resident.legalGuardianDistrict
                              ? `, ${resident.legalGuardianDistrict}`
                              : ''
                          }${resident.legalGuardianCity ? `, ${resident.legalGuardianCity}` : ''}${
                            resident.legalGuardianState ? `/${resident.legalGuardianState}` : ''
                          }${
                            resident.legalGuardianCep ? ` - CEP: ${resident.legalGuardianCep}` : ''
                          }`
                        : 'Não informado'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card: Admissão */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Admissão</CardTitle>
                  {getSectionCompletionBadge(getCompletionPercentage([
                    resident.admissionDate,
                    resident.admissionType,
                    resident.admissionReason,
                  ]))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Data de Admissão</div>
                    <div className="font-medium">
                      {resident.admissionDate
                        ? format(new Date(resident.admissionDate), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tipo de Admissão</div>
                    <div className="font-medium">{resident.admissionType || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tempo na Instituição</div>
                    <div className="font-medium">
                      {resident.admissionDate
                        ? `${Math.floor(
                            (new Date().getTime() - new Date(resident.admissionDate).getTime()) /
                              (1000 * 60 * 60 * 24 * 30)
                          )} meses`
                        : 'Não informado'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">Motivo da Admissão</div>
                    <div className="font-medium">{resident.admissionReason || 'Não informado'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">Condições de Admissão</div>
                    <div className="font-medium">
                      {resident.admissionConditions || 'Não informado'}
                    </div>
                  </div>
                  {resident.dischargeDate && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Data de Desligamento</div>
                        <div className="font-medium">
                          {format(new Date(resident.dischargeDate), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Motivo do Desligamento</div>
                        <div className="font-medium">
                          {resident.dischargeReason || 'Não informado'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card: Saúde e Condições Médicas */}
            <Card ref={healthConditionsCardRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Saúde e Condições Médicas</CardTitle>
                  {getSectionCompletionBadge(getCompletionPercentage([
                    resident.bloodType,
                    resident.height,
                    resident.weight,
                    resident.healthStatus,
                    resident.allergies,
                    resident.chronicConditions,
                  ]))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Sub-seção: Dados Gerais */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 pb-2 border-b">Dados Gerais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Tipo Sanguíneo</div>
                        <div className="font-medium">{translateBloodType(resident.bloodType)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Altura</div>
                        <div className="font-medium">
                          {resident.height ? `${resident.height} m` : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Peso</div>
                        <div className="font-medium">
                          {resident.weight ? `${resident.weight} kg` : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">IMC</div>
                        <div className="font-medium">
                          {calculateBMI(resident.weight, resident.height) || 'Não calculado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Grau de Dependência</div>
                        <div className="font-medium">
                          {resident.dependencyLevel || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Auxílio de Mobilidade</div>
                        <div className="font-medium">
                          {resident.mobilityAid !== undefined
                            ? resident.mobilityAid
                              ? 'Sim'
                              : 'Não'
                            : 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Condições e Observações */}
                  <div className="border-t pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Condições e Observações
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Estado de Saúde</div>
                        <div className="font-medium">
                          {resident.healthStatus || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Necessidades Especiais</div>
                        <div className="font-medium">
                          {resident.specialNeeds || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Aspectos Funcionais</div>
                        <div className="font-medium">
                          {resident.functionalAspects || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Restrições Alimentares</div>
                        <div className="font-medium">
                          {resident.dietaryRestrictions || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Alergias</div>
                        <div className="font-medium">{resident.allergies || 'Não informado'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Condições Crônicas</div>
                        <div className="font-medium">
                          {resident.chronicConditions || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Medicamentos na Admissão</div>
                        <div className="font-medium">
                          {resident.medicationsOnAdmission || 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card: Convênios e Planos de Saúde */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Convênios e Planos de Saúde</CardTitle>
                  {resident.healthPlans && resident.healthPlans.length > 0
                    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Preenchido</Badge>
                    : <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Não preenchido</Badge>
                  }
                </div>
              </CardHeader>
              <CardContent>
                {resident.healthPlans && resident.healthPlans.length > 0 ? (
                  <div className="space-y-4">
                    {resident.healthPlans.map((plan, index) => (
                      <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-500">Nome do Plano</div>
                            <div className="font-medium">{plan.name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Número da Carteirinha</div>
                            <div className="font-medium">{plan.cardNumber}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Nenhum convênio cadastrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Pertences */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pertences</CardTitle>
                  {resident.belongings && resident.belongings.length > 0
                    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Preenchido</Badge>
                    : <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Não preenchido</Badge>
                  }
                </div>
              </CardHeader>
              <CardContent>
                {resident.belongings && resident.belongings.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {resident.belongings.map((item, index) => (
                      <li key={index} className="text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-gray-500 py-4">Nenhum pertence cadastrado</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Vacinação */}
        <TabsContent value="vaccinations">
          <VaccinationList residentId={id || ''} />
        </TabsContent>

        {/* TAB 3: Prescrições */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle>Prescrições Médicas</CardTitle>
              <CardDescription>
                Prescrições registradas para {resident.fullName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptions.length > 0 ? (
                <div className="space-y-4">
                  {prescriptions.map((prescription: any) => (
                    <div
                      key={prescription.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/dashboard/prescricoes/${prescription.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Pill className="h-4 w-4 text-blue-600" />
                            <h4 className="font-semibold">
                              Prescrição de{' '}
                              {format(new Date(prescription.prescriptionDate), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </h4>
                            <Badge
                              variant={prescription.status === 'ACTIVE' ? 'default' : 'secondary'}
                            >
                              {prescription.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                            </Badge>
                            {prescription.hasControlled && (
                              <Badge variant="destructive">Controlado</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Médico:</span>{' '}
                              {prescription.doctorName}
                            </div>
                            <div>
                              <span className="font-medium">Tipo:</span>{' '}
                              {prescription.prescriptionType}
                            </div>
                            {prescription.expiryDate && (
                              <div>
                                <span className="font-medium">Validade:</span>{' '}
                                {format(new Date(prescription.expiryDate), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Medicamentos:</span>{' '}
                              {prescription.medications?.length || 0}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Pill className="h-12 w-12 text-gray-300" />
                  <div className="text-gray-500">Nenhuma prescrição cadastrada</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard/prescricoes/new')}
                  >
                    Criar primeira prescrição
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Registros Diários */}
        <TabsContent value="daily-records">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <CardTitle>Registros Diários</CardTitle>
                  <CardDescription>
                    {format(new Date(displayDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/dashboard/residentes/${id}/registros-calendario`)}
                >
                  Ver Todos os Registros
                </Button>
              </div>

              {/* Navegação entre dias */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousDay}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Dia anterior
                </Button>

                {!isToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                  >
                    Ir para hoje
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDay}
                  disabled={isToday}
                  className="flex items-center gap-2"
                >
                  Próximo dia
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dailyRecords.length > 0 ? (
                <div className="space-y-4">
                  {dailyRecords.map((record: any) => (
                    <div
                      key={record.id}
                      className={`border-l-4 pl-4 py-3 ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-gray-100'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-lg">{record.time}</span>
                            <Badge
                              variant="outline"
                              className={RECORD_TYPE_LABELS[record.type]?.color}
                            >
                              {RECORD_TYPE_LABELS[record.type]?.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-800 mb-1">
                            {renderRecordSummary(record)}
                          </div>
                          <p className="text-xs text-gray-600">
                            Registrado por: {record.recordedBy}
                          </p>
                          {record.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic border-l-2 border-gray-300 pl-2">
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Calendar className="h-12 w-12 text-gray-300" />
                  <div className="text-gray-500 font-medium">Nenhum registro encontrado</div>
                  {isToday && (
                    <p className="text-sm text-gray-400 text-center max-w-md">
                      Use o botão "Dia anterior" acima para navegar até o último registro realizado
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/registros-diarios?residentId=${id}&date=${displayDate}`)}
                  >
                    Criar novo registro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModal} onOpenChange={setDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o residente <strong>{resident.fullName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
