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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { ResidentScheduleTab } from '@/components/resident-schedule/ResidentScheduleTab'
import { formatBedFromResident, formatCNS } from '@/utils/formatters'
import { getCurrentDate, formatDateLongSafe, formatDateOnlySafe } from '@/utils/dateHelpers'
import { VaccinationList } from '@/components/vaccinations/VaccinationList'
import { ClinicalNotesList } from '@/components/clinical-notes'
import { ClinicalProfileTab } from '@/components/clinical-data/ClinicalProfileTab'
import { HealthDocumentsTab } from '@/components/medical-record/HealthDocumentsTab'
import {
  ViewHigieneModal,
  ViewAlimentacaoModal,
  ViewHidratacaoModal,
  ViewMonitoramentoModal,
  ViewEliminacaoModal,
  ViewComportamentoModal,
  ViewHumorModal,
  ViewSonoModal,
  ViewPesoModal,
  ViewIntercorrenciaModal,
  ViewAtividadesModal,
  ViewVisitaModal,
  ViewOutrosModal,
} from '@/components/view-modals'
import { VitalSignsModal } from '@/components/vital-signs/VitalSignsModal'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { ShieldAlert } from 'lucide-react'

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
  const { hasPermission } = usePermissions()

  // Verificar se o usuário tem permissão para visualizar prontuário
  const canViewMedicalRecord = hasPermission(PermissionType.VIEW_CLINICAL_PROFILE)

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

  // Verificar se o usuário tem permissão para visualizar prontuário
  if (!canViewMedicalRecord) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <div className="text-2xl font-semibold">Acesso Negado</div>
        <div className="text-muted-foreground text-center max-w-md">
          Você não tem permissão para visualizar o prontuário médico dos residentes.
          <br />
          Entre em contato com o administrador caso precise de acesso.
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/residentes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Residentes
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
          <TabsList className="inline-flex w-full md:grid md:grid-cols-8 min-w-max">
            <TabsTrigger value="personal" className="whitespace-nowrap">Dados do Residente</TabsTrigger>
            <TabsTrigger value="clinical-profile" className="whitespace-nowrap">Perfil Clínico</TabsTrigger>
            <TabsTrigger value="vaccinations" className="whitespace-nowrap">Vacinação</TabsTrigger>
            <TabsTrigger value="health-documents" className="whitespace-nowrap">Documentos de Saúde</TabsTrigger>
            <TabsTrigger value="clinical-notes" className="whitespace-nowrap">Evoluções Clínicas</TabsTrigger>
            <TabsTrigger value="prescriptions" className="whitespace-nowrap">Prescrições</TabsTrigger>
            <TabsTrigger value="daily-records" className="whitespace-nowrap">Registros Diários</TabsTrigger>
            <TabsTrigger value="schedule" className="whitespace-nowrap">Agenda do Residente</TabsTrigger>
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
                      // Formatar pressão arterial combinando sistólica e diastólica
                      const pressaoArterial = lastVitalSignData.systolicBloodPressure && lastVitalSignData.diastolicBloodPressure
                        ? `${lastVitalSignData.systolicBloodPressure}/${lastVitalSignData.diastolicBloodPressure} mmHg`
                        : null

                      // Formatar timestamp para data e hora
                      const timestamp = new Date(lastVitalSignData.timestamp)
                      const dateStr = formatDateOnlySafe(lastVitalSignData.timestamp)
                      const timeStr = format(timestamp, 'HH:mm')

                      return (
                        <div className="border-t pt-4">
                          <div className="text-sm text-muted-foreground mb-2">
                            Sinais Vitais em {dateStr} às {timeStr}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pressaoArterial && (
                              <Badge variant="outline" className="text-xs">PA: {pressaoArterial}</Badge>
                            )}
                            {lastVitalSignData.temperature && (
                              <Badge variant="outline" className="text-xs">Temp: {lastVitalSignData.temperature}°C</Badge>
                            )}
                            {lastVitalSignData.heartRate && (
                              <Badge variant="outline" className="text-xs">FC: {lastVitalSignData.heartRate} bpm</Badge>
                            )}
                            {lastVitalSignData.oxygenSaturation && (
                              <Badge variant="outline" className="text-xs">SpO₂: {lastVitalSignData.oxygenSaturation}%</Badge>
                            )}
                            {lastVitalSignData.bloodGlucose && (
                              <Badge variant="outline" className="text-xs">Glicemia: {lastVitalSignData.bloodGlucose} mg/dL</Badge>
                            )}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="border-t pt-4">
                        <div className="text-sm text-muted-foreground">Sinais Vitais</div>
                        <div className="text-sm text-muted-foreground italic">Nenhum registro de sinais vitais</div>
                      </div>
                    )
                  })()}

                  {resident.allergies && Array.isArray(resident.allergies) && resident.allergies.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="text-sm text-muted-foreground mb-2">Alergias</div>
                      <TooltipProvider delayDuration={200}>
                        <div className="flex flex-wrap gap-2">
                          {resident.allergies.map((allergy: any) => {
                            // Construir conteúdo do tooltip dinamicamente
                            const hasDetails = allergy.reaction || allergy.severity || allergy.notes

                            return hasDetails ? (
                              <Tooltip key={allergy.id}>
                                <TooltipTrigger asChild>
                                  <div className="inline-block">
                                    <Badge variant="destructive" className="text-xs cursor-help">
                                      {allergy.substance}
                                    </Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8}>
                                  <div className="space-y-1.5 max-w-xs">
                                    <p className="font-semibold text-sm">{allergy.substance}</p>
                                    {allergy.severity && (
                                      <p className="text-xs">
                                        <span className="font-medium">Severidade:</span>{' '}
                                        {allergy.severity === 'LEVE' && 'Leve'}
                                        {allergy.severity === 'MODERADA' && 'Moderada'}
                                        {allergy.severity === 'GRAVE' && 'Grave'}
                                        {allergy.severity === 'ANAFILAXIA' && 'Anafilaxia'}
                                      </p>
                                    )}
                                    {allergy.reaction && (
                                      <p className="text-xs">
                                        <span className="font-medium">Reação:</span> {allergy.reaction}
                                      </p>
                                    )}
                                    {allergy.notes && (
                                      <p className="text-xs">
                                        <span className="font-medium">Observações:</span> {allergy.notes}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge key={allergy.id} variant="destructive" className="text-xs">
                                {allergy.substance}
                              </Badge>
                            )
                          })}
                        </div>
                      </TooltipProvider>
                    </div>
                  )}
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

        </TabsContent>

        {/* TAB 2: Perfil Clínico */}
        <TabsContent value="clinical-profile">
          <ClinicalProfileTab residentId={id || ''} />
        </TabsContent>

        {/* TAB 3: Vacinação */}
        <TabsContent value="vaccinations">
          <VaccinationList residentId={id || ''} residentName={resident.fullName} />
        </TabsContent>

        {/* TAB 4: Documentos de Saúde */}
        <TabsContent value="health-documents">
          <HealthDocumentsTab residentId={id || ''} />
        </TabsContent>

        {/* TAB 5: Evoluções Clínicas (SOAP) */}
        <TabsContent value="clinical-notes">
          <ClinicalNotesList residentId={id || ''} residentName={resident.fullName} />
        </TabsContent>

        {/* TAB 6: Prescrições */}
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

        {/* TAB 7: Registros Diários */}
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

        {/* TAB 8: Agenda do Residente */}
        <TabsContent value="schedule">
          {resident && (
            <ResidentScheduleTab
              residentId={resident.id}
              residentName={resident.fullName}
            />
          )}
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

      {viewingRecord?.type === 'HUMOR' && (
        <ViewHumorModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'SONO' && (
        <ViewSonoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord}
        />
      )}

      {viewingRecord?.type === 'PESO' && (
        <ViewPesoModal
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
