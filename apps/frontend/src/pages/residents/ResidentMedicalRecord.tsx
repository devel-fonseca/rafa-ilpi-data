import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useResident } from '@/hooks/useResidents'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { useMyProfile } from '@/hooks/queries/useUserProfile'
import { PositionCode } from '@/types/permissions'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoViewer } from '@/components/form/PhotoViewer'
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
  FileText,
  Eye,
  Activity,
} from 'lucide-react'
import { addDays, subDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'
import { RECORD_TYPE_LABELS, renderRecordSummary } from '@/utils/recordTypeLabels'
import { formatBedFromResident, formatCNS } from '@/utils/formatters'
import { getCurrentDate, formatDateLongSafe, formatDateOnlySafe } from '@/utils/dateHelpers'
import { VaccinationList } from '@/components/vaccinations/VaccinationList'
import { ClinicalNotesList } from '@/components/clinical-notes'
import {
  ViewHigieneModal,
  ViewAlimentacaoModal,
  ViewHidratacaoModal,
  ViewMonitoramentoModal,
  ViewEliminacaoModal,
  ViewComportamentoModal,
  ViewIntercorrenciaModal,
  ViewAtividadesModal,
  ViewVisitaModal,
  ViewOutrosModal,
} from '@/components/view-modals'
import { VitalSignsModal } from '@/components/vital-signs/VitalSignsModal'

export default function ResidentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [deleteModal, setDeleteModal] = useState(false)
  const [viewDate, setViewDate] = useState<string>(getCurrentDate()) // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
  const healthConditionsCardRef = useRef<HTMLDivElement>(null)

  // View modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any>(null)
  const [vitalSignsModalOpen, setVitalSignsModalOpen] = useState(false)
  const [currentEmergencyContactIndex, setCurrentEmergencyContactIndex] = useState(0)

  const { data: resident, isLoading, error } = useResident(id || '')
  const { data: userProfile } = useMyProfile()

  // Verificar se o usuário tem permissão para remover (apenas Administrador e Responsável Técnico)
  const canDelete = userProfile?.positionCode === PositionCode.ADMINISTRATOR ||
                    userProfile?.positionCode === PositionCode.TECHNICAL_MANAGER

  // Funções de navegação entre datas
  const goToPreviousDay = () => {
    // ✅ REFATORADO: Usar parseISO + subDays do date-fns para evitar timezone issues
    const currentDate = parseISO(viewDate + 'T12:00:00') // Force noon local
    const previousDay = subDays(currentDate, 1)
    setViewDate(format(previousDay, 'yyyy-MM-dd'))
  }

  const goToNextDay = () => {
    // ✅ REFATORADO: Usar parseISO + addDays do date-fns para evitar timezone issues
    const currentDate = parseISO(viewDate + 'T12:00:00') // Force noon local
    const nextDay = addDays(currentDate, 1)
    setViewDate(format(nextDay, 'yyyy-MM-dd'))
  }

  const goToToday = () => {
    // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
    setViewDate(getCurrentDate())
  }

  const handleViewRecord = (record: any) => {
    setViewingRecord(record)
    setViewModalOpen(true)
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

  const calculateTimeInInstitution = (admissionDate: string) => {
    const today = new Date()
    const admission = new Date(admissionDate)

    let years = today.getFullYear() - admission.getFullYear()
    let months = today.getMonth() - admission.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    if (years > 0) {
      return years === 1 ? '1 ano' : `${years} anos`
    } else if (months > 0) {
      return months === 1 ? '1 mês' : `${months} meses`
    } else {
      const days = Math.floor((today.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24))
      return days === 1 ? '1 dia' : `${days} dias`
    }
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
        return 'bg-success/10 text-success border-success/30'
      case 'INATIVO':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'ALTA':
        return 'bg-info/10 text-info border-info/30'
      case 'OBITO':
        return 'bg-muted text-muted-foreground border-border'
      case 'TRANSFERIDO':
        return 'bg-accent/10 text-accent border-accent/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
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
      return <Badge variant="warning" className="text-xs">Não preenchido</Badge>
    }
    return <Badge variant="success" className="text-xs">Completo</Badge>
  }

  // Helper para calcular percentual de preenchimento
  const getCompletionPercentage = (fields: any[]) => {
    const filledCount = fields.filter(f => f && f !== 'Não informado' && f !== '-').length
    return Math.round((filledCount / fields.length) * 100)
  }

  // Helper para mostrar badge de status geral da seção
  const getSectionCompletionBadge = (completionPercent: number) => {
    if (completionPercent === 100) {
      return <Badge variant="success">100% Completo</Badge>
    } else if (completionPercent >= 50) {
      return <Badge variant="info">{completionPercent}% Preenchido</Badge>
    } else {
      return <Badge variant="warning">{completionPercent}% Incompleto</Badge>
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-danger" />
        <div className="text-muted-foreground">Residente não encontrado</div>
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
            <h1 className="text-3xl font-bold text-foreground">{resident.fullName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={getStatusBadgeColor(resident.status)}>{resident.status}</Badge>
              <span className="text-muted-foreground">{calculateAge(resident.birthDate)} anos</span>
              {resident.cpf && <span className="text-muted-foreground">CPF: {resident.cpf}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/dashboard/residentes/${id}/view`)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Cadastro
          </Button>
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteModal(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-5 min-w-max">
            <TabsTrigger value="personal" className="whitespace-nowrap">Dados do Residente</TabsTrigger>
            <TabsTrigger value="vaccinations" className="whitespace-nowrap">Vacinação</TabsTrigger>
            <TabsTrigger value="clinical-notes" className="whitespace-nowrap">Evoluções Clínicas</TabsTrigger>
            <TabsTrigger value="prescriptions" className="whitespace-nowrap">Prescrições</TabsTrigger>
            <TabsTrigger value="daily-records" className="whitespace-nowrap">Registros Diários</TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Dados do Residente */}
        <TabsContent value="personal" className="space-y-6">
          {/* Seção: Dados Essenciais */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card: Dados do Residente */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Dados do Residente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <PhotoViewer
                        photoUrl={resident.fotoUrl}
                        altText={resident.fullName}
                        size="md"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground">Nome Completo</div>
                        <div className="font-semibold text-lg text-foreground">{resident.fullName}</div>
                        {resident.socialName && (
                          <>
                            <div className="text-sm text-muted-foreground mt-2">Nome Social</div>
                            <div className="font-medium text-foreground">{resident.socialName}</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Grid 1: Data de Admissão, Tempo na Instituição e Grau de Dependência */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Data de Admissão</div>
                        <div className="font-medium text-foreground">
                          {resident.admissionDate ? formatDateOnlySafe(resident.admissionDate) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tempo na Instituição</div>
                        <div className="font-medium text-foreground">
                          {resident.admissionDate ? calculateTimeInInstitution(resident.admissionDate) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Grau de Dependência</div>
                        <div className="font-medium text-foreground">{resident.dependencyLevel || '-'}</div>
                      </div>
                    </div>

                    {/* Grid 2: Data de Nascimento, Idade e Gênero */}
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Data de Nascimento</div>
                        <div className="font-medium text-foreground">
                          {formatDateOnlySafe(resident.birthDate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Idade</div>
                        <div className="font-medium text-foreground">{calculateAge(resident.birthDate)} anos</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Gênero</div>
                        <div className="font-medium text-foreground">{translateGender(resident.gender)}</div>
                      </div>
                    </div>

                    {/* Grid 3: CNS, CPF e RG */}
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">CNS</div>
                        <div className="font-medium text-foreground">{formatCNS(resident.cns)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">CPF</div>
                        <div className="font-medium text-foreground">{resident.cpf || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">RG</div>
                        <div className="font-medium text-foreground">
                          {resident.rg ? (
                            <>
                              {resident.rg}
                              {resident.rgIssuer && <span className="text-muted-foreground"> / {resident.rgIssuer}</span>}
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Saúde */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Saúde</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVitalSignsModalOpen(true)}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Ver Sinais Vitais
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo Sanguíneo</div>
                    <div className="font-semibold text-lg text-danger">{translateBloodType(resident.bloodType)}</div>
                  </div>

                  {/* Sinais Vitais */}
                  {(() => {
                    if (lastVitalSignData) {
                      const vitalData = lastVitalSignData.data || {}
                      return (
                        <div className="border-t pt-4">
                          <div className="text-sm text-muted-foreground mb-2">
                            Sinais Vitais{lastVitalSignData.date && ` em ${formatDateOnlySafe(lastVitalSignData.date)}`}{lastVitalSignData.time && ` às ${lastVitalSignData.time}`}
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
                        <div className="text-sm text-muted-foreground">Sinais Vitais</div>
                        <div className="text-sm text-muted-foreground italic">Nenhum registro de monitoramento</div>
                      </div>
                    )
                  })()}

                  {resident.allergies && (() => {
                    const { text: truncatedAllergies, isTruncated: allergiesTruncated } = truncateText(resident.allergies)
                    return (
                      <div className="border-t pt-4">
                        <div className="text-sm text-muted-foreground mb-1">Alergias</div>
                        <div className="text-sm bg-danger/10 border border-danger/30 rounded p-2 text-danger">
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
                        <div className="text-sm text-muted-foreground mb-1">Condições Crônicas</div>
                        <div className="text-sm text-foreground">{truncatedConditions}</div>
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

              {/* Card: Contatos de Emergência */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Contatos de Emergência</CardTitle>
                    {resident.emergencyContacts && resident.emergencyContacts.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentEmergencyContactIndex((prev) =>
                            prev === 0 ? resident.emergencyContacts!.length - 1 : prev - 1
                          )}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {currentEmergencyContactIndex + 1} / {resident.emergencyContacts.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentEmergencyContactIndex((prev) =>
                            prev === resident.emergencyContacts!.length - 1 ? 0 : prev + 1
                          )}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {resident.emergencyContacts && resident.emergencyContacts.length > 0 ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Nome</div>
                        <div className="font-medium text-foreground">
                          {resident.emergencyContacts[currentEmergencyContactIndex].name}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">Telefone</div>
                        <div className="font-medium text-foreground">
                          {resident.emergencyContacts[currentEmergencyContactIndex].phone}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">Parentesco</div>
                        <div className="font-medium text-foreground">
                          {resident.emergencyContacts[currentEmergencyContactIndex].relationship}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4">
                      <div className="text-center font-medium text-foreground">
                        Nenhum contato de emergência cadastrado.
                      </div>
                      <div className="text-sm text-muted-foreground text-center px-4">
                        A indicação de pelo menos um contato é um requisito operacional e uma boa prática essencial para o manejo adequado de urgências e emergências. Cadastre um contato para garantir segurança e continuidade do cuidado.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card: Acomodação */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Acomodação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resident.bed ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Leito:</span>
                        <Badge className="font-mono">{formatBedFromResident(resident)}</Badge>
                      </div>
                      {resident.building && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Prédio:</span>
                          <span>{resident.building.name}</span>
                        </div>
                      )}
                      {resident.floor && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Andar:</span>
                          <span>{resident.floor.name}</span>
                        </div>
                      )}
                      {resident.room && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Quarto:</span>
                          <span>{resident.room.name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="font-semibold text-lg text-foreground">
                      Sem acomodação definida
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Placeholder para futuras informações */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground italic">
                    Espaço reservado para informações adicionais
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Seção: Informações Detalhadas */}
          <div className="space-y-4">
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
                    <div className="text-sm text-muted-foreground">Nome</div>
                    <div className="font-medium">
                      {resident.legalGuardianName || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">CPF</div>
                    <div className="font-medium">
                      {resident.legalGuardianCpf || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">RG</div>
                    <div className="font-medium">{resident.legalGuardianRg || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo de Responsabilidade</div>
                    <div className="font-medium">
                      {resident.legalGuardianType || 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Telefone</div>
                    <div className="font-medium">
                      {resident.legalGuardianPhone || 'Não informado'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Endereço</div>
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
                    <div className="text-sm text-muted-foreground">Data de Admissão</div>
                    <div className="font-medium">
                      {resident.admissionDate
                        ? formatDateOnlySafe(resident.admissionDate)
                        : 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo de Admissão</div>
                    <div className="font-medium">{resident.admissionType || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tempo na Instituição</div>
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
                    <div className="text-sm text-muted-foreground">Motivo da Admissão</div>
                    <div className="font-medium">{resident.admissionReason || 'Não informado'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Condições de Admissão</div>
                    <div className="font-medium">
                      {resident.admissionConditions || 'Não informado'}
                    </div>
                  </div>
                  {resident.dischargeDate && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Data de Desligamento</div>
                        <div className="font-medium">
                          {formatDateOnlySafe(resident.dischargeDate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Motivo do Desligamento</div>
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
                    <h4 className="font-semibold text-foreground mb-3 pb-2 border-b">Dados Gerais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Tipo Sanguíneo</div>
                        <div className="font-medium">{translateBloodType(resident.bloodType)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Altura</div>
                        <div className="font-medium">
                          {resident.height ? `${resident.height} m` : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Peso</div>
                        <div className="font-medium">
                          {resident.weight ? `${resident.weight} kg` : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">IMC</div>
                        <div className="font-medium">
                          {calculateBMI(resident.weight, resident.height) || 'Não calculado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Grau de Dependência</div>
                        <div className="font-medium">
                          {resident.dependencyLevel || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Auxílio de Mobilidade</div>
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
                    <h4 className="text-md font-semibold text-foreground mb-3">
                      Condições e Observações
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Estado de Saúde</div>
                        <div className="font-medium">
                          {resident.healthStatus || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Necessidades Especiais</div>
                        <div className="font-medium">
                          {resident.specialNeeds || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Aspectos Funcionais</div>
                        <div className="font-medium">
                          {resident.functionalAspects || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Restrições Alimentares</div>
                        <div className="font-medium">
                          {resident.dietaryRestrictions || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Alergias</div>
                        <div className="font-medium">{resident.allergies || 'Não informado'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Condições Crônicas</div>
                        <div className="font-medium">
                          {resident.chronicConditions || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Medicamentos na Admissão</div>
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
                    ? <Badge variant="success">Preenchido</Badge>
                    : <Badge variant="warning">Não preenchido</Badge>
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
                            <div className="text-sm text-muted-foreground">Nome do Plano</div>
                            <div className="font-medium">{plan.name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Número da Carteirinha</div>
                            <div className="font-medium">{plan.cardNumber}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum convênio cadastrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Vacinação */}
        <TabsContent value="vaccinations">
          <VaccinationList residentId={id || ''} residentName={resident.fullName} />
        </TabsContent>

        {/* TAB 3: Evoluções Clínicas (SOAP) */}
        <TabsContent value="clinical-notes">
          <ClinicalNotesList residentId={id || ''} residentName={resident.fullName} />
        </TabsContent>

        {/* TAB 4: Prescrições */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Prescrições Médicas</CardTitle>
                  <CardDescription>
                    Prescrições registradas para {resident.fullName}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/dashboard/residentes/${id}/medicacoes-calendario`)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Administrações
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/dashboard/medicacoes-ativas/${id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Ficha de Medicações
                  </Button>
                </div>
              </div>
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
                            <Pill className="h-4 w-4 text-info" />
                            <h4 className="font-semibold">
                              Prescrição de{' '}
                              {format(new Date(prescription.prescriptionDate), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </h4>
                            <Badge
                              variant={prescription.isActive ? 'default' : 'secondary'}
                            >
                              {prescription.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            {prescription.medications?.some((med: any) => med.isControlled) && (
                              <Badge variant="destructive">Controlado</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
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
                  <Pill className="h-12 w-12 text-muted-foreground" />
                  <div className="text-muted-foreground">Nenhuma prescrição cadastrada</div>
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
                    {/* ✅ REFATORADO: Usar formatDateLongSafe do dateHelpers */}
                    {formatDateLongSafe(displayDate + 'T12:00:00')}
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
                <div className="space-y-2">
                  {dailyRecords.map((record: any) => (
                    <div
                      key={record.id}
                      onClick={() => handleViewRecord(record)}
                      className={`border-l-4 pl-4 py-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] rounded-r-md ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-muted'}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Horário */}
                        <span className="font-semibold text-base min-w-[50px]">{record.time}</span>

                        {/* Badge do Tipo */}
                        <Badge
                          variant="outline"
                          className={`${RECORD_TYPE_LABELS[record.type]?.color} text-xs`}
                        >
                          {RECORD_TYPE_LABELS[record.type]?.label}
                        </Badge>

                        {/* Responsável */}
                        <span className="text-xs text-muted-foreground">
                          {record.recordedBy}
                        </span>

                        {/* Ícone de visualização */}
                        <Eye className="h-4 w-4 text-muted-foreground ml-auto mr-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                  <div className="text-muted-foreground font-medium">Nenhum registro encontrado</div>
                  {isToday && (
                    <p className="text-sm text-muted-foreground text-center max-w-md">
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
            <AlertDialogTitle>Funcionalidade não implementada</AlertDialogTitle>
            <AlertDialogDescription>
              A funcionalidade de remoção de residentes ainda não foi implementada.
              Esta funcionalidade estará disponível em uma próxima atualização do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modais de Visualização */}
      {viewingRecord?.type === 'HIGIENE' && (
        <ViewHigieneModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'ALIMENTACAO' && (
        <ViewAlimentacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'HIDRATACAO' && (
        <ViewHidratacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'MONITORAMENTO' && (
        <ViewMonitoramentoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'ELIMINACAO' && (
        <ViewEliminacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'COMPORTAMENTO' && (
        <ViewComportamentoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'INTERCORRENCIA' && (
        <ViewIntercorrenciaModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'ATIVIDADES' && (
        <ViewAtividadesModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'VISITA' && (
        <ViewVisitaModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'OUTROS' && (
        <ViewOutrosModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {/* Modal de Sinais Vitais */}
      {resident && (
        <VitalSignsModal
          open={vitalSignsModalOpen}
          onClose={() => setVitalSignsModalOpen(false)}
          residentId={resident.id}
          residentName={resident.fullName}
        />
      )}
    </div>
  )
}
