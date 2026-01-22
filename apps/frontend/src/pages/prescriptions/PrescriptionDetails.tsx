import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, addDays, subDays, parseISO } from 'date-fns'
import {
  Edit,
  FileText,
  User,
  Pill,
  AlertCircle,
  Calendar,
  Clock,
  Bed,
  Eye,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePrescription } from '@/hooks/usePrescriptions'
import { calculateAge } from '@/lib/utils'
import { formatBedFromResident } from '@/utils/formatters'
import { getSignedFileUrl } from '@/services/upload'
import { AdministerMedicationModal } from './components/AdministerMedicationModal'
import { usePermissions } from '@/hooks/usePermissions'
import { AdministerSOSModal } from './components/AdministerSOSModal'
import { ViewMedicationAdministrationModal } from './components/ViewMedicationAdministrationModal'
import { DeleteMedicationModal } from './modals/DeleteMedicationModal'
import { DeleteSOSMedicationModal } from './modals/DeleteSOSMedicationModal'
import type { Medication } from '@/api/medications.api'
import type { SOSMedication } from '@/api/sos-medications.api'
import {
  getCurrentDate,
  extractDateOnly,
  formatDateLongSafe,
  formatDateOnlySafe,
} from '@/utils/dateHelpers'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

const PRESCRIPTION_TYPE_LABELS: Record<string, string> = {
  ROTINA: 'Rotina',
  ALTERACAO_PONTUAL: 'Alteração Pontual',
  ANTIBIOTICO: 'Antibiótico',
  ALTO_RISCO: 'Alto Risco',
  CONTROLADO: 'Medicamento Controlado',
  OUTRO: 'Outro',
}

const ROUTE_LABELS: Record<string, string> = {
  VO: 'Via Oral',
  IM: 'Intramuscular',
  EV: 'Endovenosa',
  SC: 'Subcutânea',
  TOPICA: 'Tópica',
  SL: 'Sublingual',
  RETAL: 'Retal',
  OCULAR: 'Ocular',
  NASAL: 'Nasal',
  INALATORIA: 'Inalatória',
  OUTRA: 'Outra',
}

export default function PrescriptionDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isTechnicalManager } = usePermissions()
  const { data: prescription, isLoading } = usePrescription(id)

  const canManagePrescriptions = isTechnicalManager()

  // Estados de modais de registro
  const [administerModalOpen, setAdministerModalOpen] = useState(false)
  const [administerSOSModalOpen, setAdministerSOSModalOpen] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<Record<string, unknown> | null>(null)
  const [selectedSOSMedication, setSelectedSOSMedication] = useState<Record<string, unknown> | null>(null)

  // Estados de modal de visualização (NOVO)
  const [viewAdministrationModalOpen, setViewAdministrationModalOpen] = useState(false)
  const [selectedAdministration, setSelectedAdministration] = useState<Record<string, unknown> | null>(null)

  // Estados de modais de versionamento (delete)
  const [deleteMedicationModalOpen, setDeleteMedicationModalOpen] = useState(false)
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null)
  const [deleteSOSModalOpen, setDeleteSOSModalOpen] = useState(false)
  const [sosMedicationToDelete, setSOSMedicationToDelete] = useState<SOSMedication | null>(null)

  // Estados de navegação e filtros (NOVO)
  const [viewDate, setViewDate] = useState(getCurrentDate())
  const [sortMode, setSortMode] = useState<'medication' | 'time'>('medication')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'administered'>('all')


  // Handlers de navegação por data (NOVO)
  const goToPreviousDay = () => {
    // ✅ REFATORADO: Usar parseISO + addDays do date-fns para evitar timezone issues
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
    setViewDate(getCurrentDate())
  }

  const isViewingToday = viewDate === getCurrentDate()

  // Handler para visualizar administração existente (NOVO)
  const handleViewAdministration = (administration: Record<string, unknown>, medication: Record<string, unknown>) => {
    setSelectedAdministration({
      ...administration,
      medication: {
        name: medication.name,
        presentation: medication.presentation,
        concentration: medication.concentration,
        dose: medication.dose,
        route: medication.route,
        requiresDoubleCheck: medication.requiresDoubleCheck,
      },
    })
    setViewAdministrationModalOpen(true)
  }

  // Handler para registrar nova administração (MODIFICADO)
  const handleRegisterAdministration = (medication: Record<string, unknown>, scheduledTime: string) => {
    setSelectedMedication({
      ...medication,
      preselectedScheduledTime: scheduledTime,
    })
    setAdministerModalOpen(true)
  }

  const handleAdministerSOS = (sosMedication: Record<string, unknown>) => {
    setSelectedSOSMedication(sosMedication)
    setAdministerSOSModalOpen(true)
  }

  // Handlers para delete com versionamento
  const handleDeleteMedication = (medication: Medication) => {
    setMedicationToDelete(medication)
    setDeleteMedicationModalOpen(true)
  }

  const handleDeleteSOSMedication = (sosMedication: SOSMedication) => {
    setSOSMedicationToDelete(sosMedication)
    setDeleteSOSModalOpen(true)
  }

  const handleDeleteSuccess = () => {
    // Recarregar dados da prescrição após exclusão
    queryClient.invalidateQueries({ queryKey: ['prescription', id] })
  }

  // Processar medicações expandidas por horário com filtros (NOVO)
  const expandedMedicationCards = useMemo(() => {
    if (!prescription?.data?.medications || prescription.data.medications.length === 0) {
      return []
    }

    const prescriptionData = prescription.data

    const cards = prescriptionData.medications.flatMap((medication: Record<string, unknown>) =>
      (medication.scheduledTimes as string[] | undefined)?.map((scheduledTime: string) => {
        // Buscar administração para ESTE horário específico na data visualizada
        const administrationForTime = (medication.administrations as Array<Record<string, unknown>> | undefined)?.find(
          (admin: Record<string, unknown>) => {
            // ✅ REFATORADO: Usar extractDateOnly do dateHelpers para conversão segura
            const adminDate = extractDateOnly(admin.date as string)
            return adminDate === viewDate && admin.scheduledTime === scheduledTime
          }
        )

        // Determinar status visual
        let status: 'administered' | 'pending' | 'missed' = 'pending'
        if (administrationForTime) {
          status = administrationForTime.wasAdministered ? 'administered' : 'missed'
        } else {
          // Se passou do horário e não foi administrado, marcar como "missed"
          const now = new Date()
          const scheduledDateTime = new Date(`${viewDate}T${scheduledTime}`)
          if (now > scheduledDateTime) {
            status = 'missed'
          }
        }

        return {
          medication,
          scheduledTime,
          administration: administrationForTime,
          status,
        }
      }) || []
    )

    // Aplicar filtro de status
    const filteredCards = cards.filter((card) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'pending') return card.status === 'pending' || card.status === 'missed'
      if (statusFilter === 'administered') return card.status === 'administered'
      return true
    })

    // Aplicar ordenação
    if (sortMode === 'medication') {
      return filteredCards.sort((a, b) => {
        const medCompare = a.medication.name.localeCompare(b.medication.name)
        if (medCompare !== 0) return medCompare
        return a.scheduledTime.localeCompare(b.scheduledTime)
      })
    } else {
      return filteredCards.sort((a, b) => {
        const timeCompare = a.scheduledTime.localeCompare(b.scheduledTime)
        if (timeCompare !== 0) return timeCompare
        return a.medication.name.localeCompare(b.medication.name)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription?.data?.medications, viewDate, statusFilter, sortMode])

  // Calcular contadores para as tabs de status
  const statusCounts = useMemo(() => {
    if (!prescription?.data?.medications || prescription.data.medications.length === 0) {
      return { all: 0, pending: 0, administered: 0 }
    }

    const prescriptionData = prescription.data

    const allCards = prescriptionData.medications.flatMap((medication: Record<string, unknown>) =>
      (medication.scheduledTimes as string[] | undefined)?.map((scheduledTime: string) => {
        const administrationForTime = (medication.administrations as Array<Record<string, unknown>> | undefined)?.find(
          (admin: Record<string, unknown>) => {
            // ✅ REFATORADO: Usar extractDateOnly do dateHelpers para conversão segura
            const adminDate = extractDateOnly(admin.date as string)
            return adminDate === viewDate && admin.scheduledTime === scheduledTime
          }
        )

        let status: 'administered' | 'pending' | 'missed' = 'pending'
        if (administrationForTime) {
          status = administrationForTime.wasAdministered ? 'administered' : 'missed'
        } else {
          const now = new Date()
          const scheduledDateTime = new Date(`${viewDate}T${scheduledTime}`)
          if (now > scheduledDateTime) {
            status = 'missed'
          }
        }

        return status
      }) || []
    )

    return {
      all: allCards.length,
      pending: allCards.filter((s) => s === 'pending' || s === 'missed').length,
      administered: allCards.filter((s) => s === 'administered').length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription?.data?.medications, viewDate])

  // Early returns após hooks
  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Detalhes da Prescrição"
          subtitle="Carregando informações..."
          backButton={{ onClick: () => navigate('/dashboard/prescricoes') }}
        />
        <EmptyState
          icon={FileText}
          title="Carregando prescrição..."
          description="Aguarde enquanto buscamos os detalhes"
          variant="loading"
        />
      </Page>
    )
  }

  if (!prescription) {
    return (
      <Page>
        <PageHeader
          title="Detalhes da Prescrição"
          subtitle="Prescrição não encontrada"
          backButton={{ onClick: () => navigate('/dashboard/prescricoes') }}
        />
        <EmptyState
          icon={AlertCircle}
          title="Prescrição não encontrada"
          description="A prescrição que você está procurando não existe ou foi removida."
          action={
            <Button onClick={() => navigate('/dashboard/prescricoes')}>
              Voltar ao Dashboard
            </Button>
          }
        />
      </Page>
    )
  }

  const prescriptionData = prescription.data

  return (
    <Page maxWidth="wide">
      <PageHeader
        title="Detalhes da Prescrição"
        subtitle={`Prescrição de ${prescriptionData.resident?.fullName}`}
        badge={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={prescriptionData.isActive ? 'default' : 'secondary'}>
              {prescriptionData.isActive ? 'Ativa' : 'Inativa'}
            </Badge>
            <Badge variant="outline">
              {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType] ||
                prescriptionData.prescriptionType}
            </Badge>
          </div>
        }
        backButton={{ onClick: () => navigate('/dashboard/prescricoes') }}
        actions={
          canManagePrescriptions && (
            <Button onClick={() => navigate(`/dashboard/prescricoes/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )
        }
      />

      {/* Informações Principais */}
      <Section title="Informações Principais">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Residente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5" />
              Residente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-semibold">
                  {prescriptionData.resident?.fullName}
                </p>
              </div>
              {prescriptionData.resident?.birthDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Idade</p>
                  <p className="font-medium">
                    {calculateAge(prescriptionData.resident.birthDate)} anos
                  </p>
                </div>
              )}
              {prescriptionData.resident?.chronicConditions && (
                <div>
                  <p className="text-sm text-muted-foreground">Condições Crônicas</p>
                  <p className="font-medium text-sm">
                    {prescriptionData.resident.chronicConditions}
                  </p>
                </div>
              )}
              {prescriptionData.resident?.bed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bed className="h-4 w-4" />
                  <span className="font-mono">
                    {formatBedFromResident(prescriptionData.resident)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prescritor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescritor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Médico</p>
                <p className="font-semibold">{prescriptionData.doctorName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CRM</p>
                <p className="font-medium">
                  {prescriptionData.doctorCrm} / {prescriptionData.doctorCrmState}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data da Prescrição</p>
                <p className="font-medium">
                  {/* ✅ REFATORADO: Usar formatDateOnlySafe do dateHelpers */}
                  {formatDateOnlySafe(prescriptionData.prescriptionDate)}
                </p>
              </div>
              {prescriptionData.prescriptionImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const fileUrl = prescriptionData.prescriptionImageUrl!

                      // Se já é uma URL completa (http/https), abrir diretamente
                      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                        window.open(fileUrl, '_blank')
                        return
                      }

                      // Caso contrário, obter URL assinada do MinIO
                      const signedUrl = await getSignedFileUrl(fileUrl)
                      window.open(signedUrl, '_blank')
                    } catch (error) {
                      console.error('Erro ao abrir prescrição:', error)
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver prescrição
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validade e Revisão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Validade e Revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prescriptionData.validUntil ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Válida até</p>
                    <p className="font-semibold">
                      {/* ✅ REFATORADO: Usar formatDateLongSafe do dateHelpers */}
                      {formatDateLongSafe(prescriptionData.validUntil)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {new Date(extractDateOnly(prescriptionData.validUntil) + 'T12:00:00') >= new Date(new Date().toDateString()) ? (
                      <Badge variant="success">
                        Dentro da validade
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Vencida</Badge>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sem data de validade</p>
              )}

              {prescriptionData.reviewDate && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Revisão estimada para</p>
                    <p className="font-semibold">
                      {/* ✅ REFATORADO: Usar formatDateLongSafe do dateHelpers */}
                      {formatDateLongSafe(prescriptionData.reviewDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status da revisão</p>
                    {new Date(extractDateOnly(prescriptionData.reviewDate) + 'T12:00:00') >= new Date(new Date().toDateString()) ? (
                      <Badge variant="info">
                        Dentro do prazo
                      </Badge>
                    ) : (
                      <Badge variant="warning">Revisão pendente</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </Section>

      {/* Dados de Controlado */}
      {prescriptionData.prescriptionType === 'CONTROLADO' && (
        <Section title="Informações de Medicamento Controlado">
          <Card className="border-medication-controlled/30 bg-medication-controlled/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Classe</p>
                <p className="font-medium text-medication-controlled/95">
                  {prescriptionData.controlledClass || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notificação</p>
                <p className="font-medium text-medication-controlled/95">
                  {prescriptionData.notificationNumber || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Notificação</p>
                <p className="font-medium text-medication-controlled/95">
                  {prescriptionData.notificationType || '-'}
                </p>
              </div>
              {prescriptionData.prescriptionImageUrl && (
                <div>
                  <p className="text-sm text-muted-foreground">Receita</p>
                  <a
                    href={prescriptionData.prescriptionImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-medication-controlled/80 hover:underline"
                  >
                    Ver arquivo
                  </a>
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </Section>
      )}

      {/* Tabs - Medicamentos e Histórico */}
      <Section title="Medicamentos">
        <Tabs defaultValue="medications" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-2 min-w-max">
            <TabsTrigger value="medications" className="whitespace-nowrap">
              Medicamentos Contínuos ({prescriptionData.medications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sos" className="whitespace-nowrap">
              Medicações SOS ({prescriptionData.sosMedications?.length || 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="medications" className="space-y-4 mt-6">
          {/* Controles de Navegação por Data e Filtros */}
          <div className="flex flex-col gap-3 bg-muted/30 p-3 sm:p-4 rounded-lg">
            {/* Navegação por Data */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousDay}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 justify-center flex-1 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm sm:text-base truncate">
                  {/* ✅ REFATORADO: Usar formatDateLongSafe do dateHelpers */}
                  {formatDateLongSafe(viewDate + 'T12:00:00')}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDay}
                  disabled={isViewingToday}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {!isViewingToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="hidden sm:flex"
                  >
                    Hoje
                  </Button>
                )}
              </div>
            </div>

            {/* Toggle de Ordenação */}
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-xs sm:text-sm text-muted-foreground shrink-0">Ordenar:</span>
              <Button
                variant={sortMode === 'medication' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('medication')}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                Medicamento
              </Button>
              <Button
                variant={sortMode === 'time' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('time')}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                Horário
              </Button>
            </div>
          </div>

          {/* Tabs de Filtro por Status */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'pending' | 'administered')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Todos ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pendentes ({statusCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="administered">
                Administrados ({statusCounts.administered})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Cards Expandidos por Horário */}
          {!prescriptionData.medications || prescriptionData.medications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum medicamento contínuo cadastrado
              </CardContent>
            </Card>
          ) : expandedMedicationCards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma medicação encontrada para os filtros selecionados
              </CardContent>
            </Card>
          ) : (
            expandedMedicationCards.map((card, idx) => {
              const { medication, scheduledTime, administration, status } = card

              // Configuração visual por status
              const statusConfig = {
                administered: {
                  icon: CheckCircle2,
                  color: 'text-success',
                  bgColor: 'bg-success/10 border-success/30',
                  borderLeft: 'border-l-success',
                  label: 'Administrado',
                  buttonLabel: 'Ver Administração',
                  buttonVariant: 'outline' as const,
                  buttonIcon: Eye,
                },
                pending: {
                  icon: Circle,
                  color: 'text-muted-foreground',
                  bgColor: 'bg-muted/10 border-muted',
                  borderLeft: 'border-l-blue-500',
                  label: 'Pendente',
                  buttonLabel: 'Administrar',
                  buttonVariant: 'default' as const,
                  buttonIcon: Clock,
                },
                missed: {
                  icon: XCircle,
                  color: 'text-danger',
                  bgColor: 'bg-danger/10 border-danger/30',
                  borderLeft: 'border-l-danger',
                  label: 'Não Administrado',
                  buttonLabel: 'Administrar',
                  buttonVariant: 'default' as const,
                  buttonIcon: Clock,
                },
              }

              const config = statusConfig[status]
              const StatusIcon = config.icon

              // Override da configuração do botão para status 'missed'
              // Se existe registro de não administração (recusa, contraindicação, etc.)
              // → mostrar "Ver Administração" (outline)
              // Se não existe registro (apenas passou do horário)
              // → mostrar "Administrar" (default)
              let buttonLabel = config.buttonLabel
              let buttonVariant = config.buttonVariant
              let ButtonIcon = config.buttonIcon

              if (status === 'missed' && administration) {
                // Tem registro de não administração → Ver Administração
                buttonLabel = 'Ver Administração'
                buttonVariant = 'outline' as const
                ButtonIcon = Eye
              }

              return (
                <Card
                  key={`${medication.id}-${scheduledTime}-${idx}`}
                  className={`border-l-4 ${config.borderLeft} ${config.bgColor}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Cabeçalho do Card */}
                        <div className="flex items-start gap-3 mb-3">
                          <Pill className="h-5 w-5 text-primary mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg">{medication.name}</h3>
                              {/* Horário Destacado */}
                              <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/30">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-lg text-primary/95">
                                  {scheduledTime}
                                </span>
                              </div>
                              {/* Badge de Status */}
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {medication.presentation} - {medication.concentration}
                            </p>
                            {/* Badges de Características */}
                            <div className="flex gap-2 mt-2">
                              {medication.isControlled && (
                                <Badge variant="outline" className="bg-medication-controlled/5 text-medication-controlled/80">
                                  Controlado
                                </Badge>
                              )}
                              {medication.isHighRisk && (
                                <Badge variant="outline" className="bg-danger/5 text-danger/80">
                                  Alto Risco
                                </Badge>
                              )}
                              {medication.requiresDoubleCheck && (
                                <Badge variant="outline" className="bg-severity-warning/5 text-severity-warning/80">
                                  Dupla Checagem
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Grid de Informações */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-muted-foreground">Dose:</span>
                            <p className="font-medium">{medication.dose}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Via:</span>
                            <p className="font-medium">
                              {ROUTE_LABELS[medication.route] || medication.route}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Frequência:</span>
                            <p className="font-medium">{medication.frequency}</p>
                          </div>
                        </div>

                        {/* Instruções Especiais */}
                        {medication.instructions && (
                          <div className="p-3 bg-muted/50 rounded border border-border text-sm">
                            <span className="font-medium">Instruções:</span> {medication.instructions}
                          </div>
                        )}

                        {/* Informação da Administração (se já foi administrado) */}
                        {administration && (
                          <div className="mt-3 p-3 bg-muted/20 rounded border text-sm">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                <strong>Administrado por:</strong> {administration.administeredBy}
                              </span>
                              {administration.actualTime && (
                                <span>
                                  <strong>Horário real:</strong> {administration.actualTime}
                                </span>
                              )}
                              {administration.checkedBy && (
                                <span>
                                  <strong>Checado por:</strong> {administration.checkedBy}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (administration) {
                              // Já foi administrado → Abrir modal de visualização
                              handleViewAdministration(administration, medication)
                            } else {
                              // Pendente ou atrasado → Abrir modal de registro
                              handleRegisterAdministration(medication, scheduledTime)
                            }
                          }}
                          size="sm"
                          variant={buttonVariant}
                        >
                          <ButtonIcon className="h-4 w-4 mr-2" />
                          {buttonLabel}
                        </Button>

                        {/* Menu de Ações (Delete/History) - Somente RT */}
                        {canManagePrescriptions && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteMedication(medication)}
                                className="text-danger focus:text-danger"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Medicamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="sos" className="space-y-4 mt-6">
          {!prescriptionData.sosMedications || prescriptionData.sosMedications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhuma medicação SOS cadastrada
              </CardContent>
            </Card>
          ) : (
            prescriptionData.sosMedications.map((sos: Record<string, unknown>) => (
              <Card key={sos.id as string} className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertCircle className="h-5 w-5 text-severity-warning" />
                        <div>
                          <h3 className="font-semibold text-lg">{sos.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {sos.presentation} - {sos.concentration}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-severity-warning/5 text-severity-warning/80">
                          SOS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Indicação:</span>
                          <p className="font-medium">{sos.indication}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dose:</span>
                          <p className="font-medium">{sos.dose}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Intervalo Mín.:</span>
                          <p className="font-medium">{sos.minInterval}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Máx. Diária:</span>
                          <p className="font-medium">{sos.maxDailyDoses}x</p>
                        </div>
                      </div>

                      {sos.indicationDetails && (
                        <div className="p-3 bg-severity-warning/5 rounded border border-severity-warning/30 text-sm">
                          <span className="font-medium">Detalhes:</span> {sos.indicationDetails}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAdministerSOS(sos)}
                        size="sm"
                        variant="outline"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Administrar SOS
                      </Button>

                      {/* Menu de Ações (Delete/History) - Somente RT */}
                      {canManagePrescriptions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteSOSMedication(sos)}
                              className="text-danger focus:text-danger"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir SOS
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        </Tabs>
      </Section>

      {/* Observações */}
      {prescriptionData.notes && (
        <Section title="Observações">
          <Card>
          <CardContent className="pt-6">
            <p className="text-foreground/80">{prescriptionData.notes}</p>
          </CardContent>
          </Card>
        </Section>
      )}

      {/* Modais */}
      {/* Modal de Visualização de Administração (NOVO) */}
      {selectedAdministration && (
        <ViewMedicationAdministrationModal
          open={viewAdministrationModalOpen}
          onClose={() => {
            setViewAdministrationModalOpen(false)
            setSelectedAdministration(null)
          }}
          administration={selectedAdministration}
          medication={selectedAdministration.medication}
        />
      )}

      {/* Modal de Registro de Administração */}
      {selectedMedication && (
        <AdministerMedicationModal
          open={administerModalOpen}
          onClose={() => {
            setAdministerModalOpen(false)
            setSelectedMedication(null)
          }}
          medication={selectedMedication}
        />
      )}

      {/* Modal de Administração SOS */}
      {selectedSOSMedication && (
        <AdministerSOSModal
          open={administerSOSModalOpen}
          onClose={() => {
            setAdministerSOSModalOpen(false)
            setSelectedSOSMedication(null)
          }}
          sosMedication={selectedSOSMedication}
        />
      )}

      {/* Modais de Delete com Versionamento */}
      {medicationToDelete && (
        <DeleteMedicationModal
          medication={medicationToDelete}
          open={deleteMedicationModalOpen}
          onOpenChange={setDeleteMedicationModalOpen}
          onSuccess={() => {
            handleDeleteSuccess()
            setMedicationToDelete(null)
          }}
        />
      )}

      {sosMedicationToDelete && (
        <DeleteSOSMedicationModal
          sosMedication={sosMedicationToDelete}
          open={deleteSOSModalOpen}
          onOpenChange={setDeleteSOSModalOpen}
          onSuccess={() => {
            handleDeleteSuccess()
            setSOSMedicationToDelete(null)
          }}
        />
      )}
    </Page>
  )
}
