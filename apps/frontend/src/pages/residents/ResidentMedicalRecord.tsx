import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useResident } from '@/hooks/useResidents'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Page, PageHeader } from '@/design-system/components'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import {
  AlertCircle,
  Loader2,
  Pill,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Activity,
  ShieldAlert,
  ArrowLeft,
  Lock,
  Zap,
  User,
  HeartPulse,
  Syringe,
  NotebookPen,
  ClipboardList,
} from 'lucide-react'
import { addDays, subDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getRecordTypeLabel } from '@/utils/recordTypeLabels'
import { ResidentScheduleTab } from '@/components/resident-schedule/ResidentScheduleTab'
import { formatBedFromResident, formatCNS } from '@/utils/formatters'
import { getCurrentDate, formatDateLongSafe, formatDateOnlySafe, extractDateOnly } from '@/utils/dateHelpers'
import { VaccinationList } from '@/components/vaccinations/VaccinationList'
import { ClinicalNotesList } from '@/components/clinical-notes'
import { ClinicalProfileTab } from '@/components/clinical-data/ClinicalProfileTab'
import { HealthDocumentsTab } from '@/components/medical-record/HealthDocumentsTab'
import { useFeatures } from '@/hooks/useFeatures'
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
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useBloodType, useCurrentDependencyAssessment } from '@/hooks/useResidentHealth'
import { BLOOD_TYPE_LABELS, DEPENDENCY_LEVEL_LABELS } from '@/api/resident-health.api'
import { DailyRecordsTimeline } from '@/components/daily-records/DailyRecordsTimeline'
import type { DailyRecord } from '@/api/dailyRecords.api'
import type { Allergy } from '@/api/allergies.api'
import type { Prescription, Medication } from '@/api/prescriptions.api'

export default function ResidentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [viewDate, setViewDate] = useState<string>(getCurrentDate()) // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
  const healthConditionsCardRef = useRef<HTMLDivElement>(null)

  // View modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<DailyRecord | null>(null)
  const [vitalSignsBlockedModalOpen, setVitalSignsBlockedModalOpen] = useState(false)
  const [currentEmergencyContactIndex, setCurrentEmergencyContactIndex] = useState(0)

  const { data: resident, isLoading, error } = useResident(id || '')
  const { hasPermission } = usePermissions()
  const { hasFeature } = useFeatures()

  // Buscar tipo sanguíneo da nova tabela
  const { data: bloodTypeData } = useBloodType(id || '')
  const bloodTypeLabel = bloodTypeData?.bloodType
    ? BLOOD_TYPE_LABELS[bloodTypeData.bloodType as keyof typeof BLOOD_TYPE_LABELS]
    : 'Não informado'

  // Buscar avaliação de dependência atual da nova tabela
  const { data: dependencyAssessment } = useCurrentDependencyAssessment(id || '')
  const dependencyLevelLabel = dependencyAssessment?.dependencyLevel
    ? DEPENDENCY_LEVEL_LABELS[dependencyAssessment.dependencyLevel as keyof typeof DEPENDENCY_LEVEL_LABELS]
    : '-'

  // Verificar se o usuário tem permissão para visualizar prontuário
  const canViewMedicalRecord = hasPermission(PermissionType.VIEW_CLINICAL_PROFILE)

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

  const handleViewRecord = (record: DailyRecord) => {
    setViewingRecord(record)
    setViewModalOpen(true)
  }

  const handleVitalSignsClick = () => {
    if (hasFeature('sinais_vitais')) {
      navigate(`/dashboard/sinais-vitais/${id}`)
    } else {
      setVitalSignsBlockedModalOpen(true)
    }
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
    queryKey: tenantKey('daily-records', 'resident-profile', id, viewDate),
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
    queryKey: tenantKey('daily-records', 'resident-profile', id, 'last-vital'),
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
    // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
    const dayKey = extractDateOnly(birthDate)
    const birth = new Date(dayKey + 'T12:00:00')
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculateTimeInInstitution = (admissionDate: string) => {
    const today = new Date()
    // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
    const dayKey = extractDateOnly(admissionDate)
    const admission = new Date(dayKey + 'T12:00:00')

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

  return (
    <Page maxWidth="wide">
      <PageHeader
        title={resident.fullName}
        subtitle={
          <div className="flex items-center gap-3">
            <Badge className={getStatusBadgeColor(resident.status)}>{resident.status}</Badge>
            <span className="text-muted-foreground">{calculateAge(resident.birthDate)} anos</span>
            {resident.cpf && <span className="text-muted-foreground">CPF: {resident.cpf}</span>}
          </div>
        }
        onBack={() => navigate('/dashboard/residentes')}
        actions={
          <Button variant="outline" onClick={() => navigate(`/dashboard/residentes/${id}/view`)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Cadastro
          </Button>
        }
      />

      {/* Main Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-max">
            <TabsTrigger value="personal" className="flex items-center gap-2 whitespace-nowrap">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dados do Residente</span>
            </TabsTrigger>
            <TabsTrigger value="clinical-profile" className="flex items-center gap-2 whitespace-nowrap">
              <HeartPulse className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil Clínico</span>
            </TabsTrigger>
            <TabsTrigger value="vaccinations" className="flex items-center gap-2 whitespace-nowrap">
              <Syringe className="h-4 w-4" />
              <span className="hidden sm:inline">Vacinação</span>
            </TabsTrigger>
            <TabsTrigger value="health-documents" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documentos de Saúde</span>
            </TabsTrigger>
            <TabsTrigger value="clinical-notes" className="flex items-center gap-2 whitespace-nowrap">
              <NotebookPen className="h-4 w-4" />
              <span className="hidden sm:inline">Evoluções Clínicas</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-2 whitespace-nowrap">
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">Prescrições</span>
            </TabsTrigger>
            <TabsTrigger value="daily-records" className="flex items-center gap-2 whitespace-nowrap">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Registros Diários</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda do Residente</span>
            </TabsTrigger>
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
                        <div className="font-medium text-foreground">{dependencyLevelLabel}</div>
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
                      onClick={handleVitalSignsClick}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Ver Sinais Vitais
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo Sanguíneo</div>
                    <div className="font-semibold text-lg text-danger">{bloodTypeLabel}</div>
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
                          {resident.allergies.map((allergy: Allergy) => {
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
                        Nenhum contato de emergência cadastrado
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
                    <div className="space-y-3 py-4">
                      <div className="text-center font-medium text-foreground">
                        Leito não informado
                      </div>
                      <div className="text-sm text-muted-foreground text-center px-4">
                        A vinculação de um leito ao residente é um requisito operacional e uma boa prática essencial para a organização da assistência, a rastreabilidade do cuidado e o manejo adequado de rotinas e intercorrências. Informe o leito no cadastro do residente.
                      </div>
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
          {!hasFeature('evolucoes_clinicas') ? (
            <Card>
              <CardContent className="py-16 px-4">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div className="text-center space-y-2 max-w-md">
                    <h3 className="text-lg font-semibold">Recurso Bloqueado</h3>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Evoluções clínicas multiprofissionais</strong> não está disponível no seu plano atual.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Registro SOAP de evoluções clínicas por médicos, enfermeiros, fisioterapeutas, nutricionistas e outros profissionais. Histórico completo e organizado por data.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border border-border max-w-md">
                    <p className="text-xs text-muted-foreground text-center">
                      💡 Faça upgrade do seu plano para desbloquear este e outros recursos avançados
                    </p>
                  </div>
                  <Button onClick={() => navigate('/settings/billing')}>
                    <Zap className="mr-2 h-4 w-4" />
                    Fazer Upgrade
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ClinicalNotesList residentId={id || ''} residentName={resident.fullName} />
          )}
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
                {hasFeature('medicacoes') && (
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
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!hasFeature('medicacoes') ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div className="text-center space-y-2 max-w-md">
                    <h3 className="text-lg font-semibold">Recurso Bloqueado</h3>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Prescrições e medicamentos</strong> não está disponível no seu plano atual.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Gerencie prescrições médicas, controle de medicamentos contínuos e SOS, histórico de administrações, calendário de medicações e alertas de vencimento.
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border border-border max-w-md">
                    <p className="text-xs text-muted-foreground text-center">
                      💡 Faça upgrade do seu plano para desbloquear este e outros recursos avançados
                    </p>
                  </div>
                  <Button onClick={() => navigate('/settings/billing')}>
                    <Zap className="mr-2 h-4 w-4" />
                    Fazer Upgrade
                  </Button>
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="space-y-4">
                  {prescriptions.map((prescription: Prescription) => (
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
                              {format(new Date(extractDateOnly(prescription.prescriptionDate) + 'T12:00:00'), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </h4>
                            <Badge
                              variant={prescription.isActive ? 'default' : 'secondary'}
                            >
                              {prescription.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            {prescription.medications?.some((med: Medication) => med.isControlled) && (
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
                                {format(new Date(extractDateOnly(prescription.expiryDate) + 'T12:00:00'), 'dd/MM/yyyy', {
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
                <>
                  {/* Timeline de Registros */}
                  <DailyRecordsTimeline
                    records={dailyRecords}
                    onRecordClick={handleViewRecord}
                  />

                  {/* Lista de Registros */}
                  <div className="space-y-2">
                    {dailyRecords.map((record: DailyRecord) => (
                      <div
                        key={record.id}
                        onClick={() => handleViewRecord(record)}
                        className={`border-l-4 pl-4 py-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] rounded-r-md ${getRecordTypeLabel(record.type).bgColor}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Horário */}
                          <span className="font-semibold text-base min-w-[50px]">{record.time}</span>

                          {/* Badge do Tipo */}
                          <Badge
                            variant="outline"
                            className={`${getRecordTypeLabel(record.type).color} text-xs`}
                          >
                            {getRecordTypeLabel(record.type).label}
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
                </>
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
                    onClick={() => navigate(`/dashboard/registros-diarios/${id}?date=${displayDate}`)}
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

      {/* Modal de Feature Bloqueada - Sinais Vitais */}
      {resident && (
        <>
          <Dialog open={vitalSignsBlockedModalOpen} onOpenChange={() => setVitalSignsBlockedModalOpen(false)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Lock className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                </div>
                <DialogTitle className="text-center">Recurso Bloqueado</DialogTitle>
                <DialogDescription className="text-center">
                  <strong className="text-foreground">Sinais Vitais</strong> não está disponível no seu plano atual.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Visualização de gráficos, tabelas e histórico completo de sinais vitais para análise e monitoramento clínico.
                </p>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    💡 Faça upgrade do seu plano para desbloquear este e outros recursos avançados
                  </p>
                </div>
              </div>

              <DialogFooter className="sm:justify-center gap-2">
                <Button variant="outline" onClick={() => setVitalSignsBlockedModalOpen(false)}>
                  Voltar
                </Button>
                <Button
                  onClick={() => {
                    setVitalSignsBlockedModalOpen(false);
                    navigate('/settings/billing');
                  }}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Fazer Upgrade
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Page>
  )
}
