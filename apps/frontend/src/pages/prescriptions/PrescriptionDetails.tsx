import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePrescription } from '@/hooks/usePrescriptions'
import { calculateAge } from '@/lib/utils'
import { formatBedFromResident } from '@/utils/formatters'
import { getSignedFileUrl } from '@/services/upload'
import { getCurrentDateLocal } from '@/utils/timezone'
import { AdministerMedicationModal } from './components/AdministerMedicationModal'
import { AdministerSOSModal } from './components/AdministerSOSModal'
import { ViewMedicationAdministrationModal } from './components/ViewMedicationAdministrationModal'

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
  const { data: prescription, isLoading } = usePrescription(id)

  // Estados de modais de registro
  const [administerModalOpen, setAdministerModalOpen] = useState(false)
  const [administerSOSModalOpen, setAdministerSOSModalOpen] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<any>(null)
  const [selectedSOSMedication, setSelectedSOSMedication] = useState<any>(null)

  // Estados de modal de visualização (NOVO)
  const [viewAdministrationModalOpen, setViewAdministrationModalOpen] = useState(false)
  const [selectedAdministration, setSelectedAdministration] = useState<any>(null)

  // Estados de navegação e filtros (NOVO)
  const [viewDate, setViewDate] = useState(getCurrentDateLocal())
  const [sortMode, setSortMode] = useState<'medication' | 'time'>('medication')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'administered'>('all')

  // Handlers de navegação por data (NOVO)
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
    setViewDate(getCurrentDateLocal())
  }

  const isViewingToday = viewDate === getCurrentDateLocal()

  // Handler para visualizar administração existente (NOVO)
  const handleViewAdministration = (administration: any, medication: any) => {
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
  const handleRegisterAdministration = (medication: any, scheduledTime: string) => {
    setSelectedMedication({
      ...medication,
      preselectedScheduledTime: scheduledTime,
    })
    setAdministerModalOpen(true)
  }

  const handleAdministerMedication = (medication: any) => {
    setSelectedMedication(medication)
    setAdministerModalOpen(true)
  }

  const handleAdministerSOS = (sosMedication: any) => {
    setSelectedSOSMedication(sosMedication)
    setAdministerSOSModalOpen(true)
  }

  // Processar medicações expandidas por horário com filtros (NOVO)
  const expandedMedicationCards = useMemo(() => {
    if (!prescription?.data?.medications || prescription.data.medications.length === 0) {
      return []
    }

    const prescriptionData = prescription.data

    const cards = prescriptionData.medications.flatMap((medication: any) =>
      medication.scheduledTimes?.map((scheduledTime: string) => {
        // Buscar administração para ESTE horário específico na data visualizada
        const administrationForTime = medication.administrations?.find(
          (admin: any) => {
            const adminDate = format(new Date(admin.date), 'yyyy-MM-dd')
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
  }, [prescription?.data?.medications, viewDate, statusFilter, sortMode])

  // Calcular contadores para as tabs de status
  const statusCounts = useMemo(() => {
    if (!prescription?.data?.medications || prescription.data.medications.length === 0) {
      return { all: 0, pending: 0, administered: 0 }
    }

    const prescriptionData = prescription.data

    const allCards = prescriptionData.medications.flatMap((medication: any) =>
      medication.scheduledTimes?.map((scheduledTime: string) => {
        const administrationForTime = medication.administrations?.find(
          (admin: any) =>
            format(new Date(admin.date), 'yyyy-MM-dd') === viewDate &&
            admin.scheduledTime === scheduledTime
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
  }, [prescription?.data?.medications, viewDate])

  // Early returns após hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
          <span className="text-gray-600">Carregando prescrição...</span>
        </div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-gray-400" />
        <p className="text-gray-600">Prescrição não encontrada</p>
        <Button onClick={() => navigate('/dashboard/prescricoes')}>
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  const prescriptionData = prescription.data

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Detalhes da Prescrição
            </h1>
            <Badge
              variant={prescriptionData.isActive ? 'default' : 'secondary'}
            >
              {prescriptionData.isActive ? 'Ativa' : 'Inativa'}
            </Badge>
            <Badge variant="outline">
              {PRESCRIPTION_TYPE_LABELS[prescriptionData.prescriptionType] ||
                prescriptionData.prescriptionType}
            </Badge>
          </div>
          <p className="text-gray-600">
            Prescrição de {prescriptionData.resident?.fullName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/prescricoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate(`/dashboard/prescricoes/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Informações Principais */}
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
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-semibold">
                  {prescriptionData.resident?.fullName}
                </p>
              </div>
              {prescriptionData.resident?.birthDate && (
                <div>
                  <p className="text-sm text-gray-600">Idade</p>
                  <p className="font-medium">
                    {calculateAge(prescriptionData.resident.birthDate)} anos
                  </p>
                </div>
              )}
              {prescriptionData.resident?.chronicConditions && (
                <div>
                  <p className="text-sm text-gray-600">Condições Crônicas</p>
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
                <p className="text-sm text-gray-600">Médico</p>
                <p className="font-semibold">{prescriptionData.doctorName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CRM</p>
                <p className="font-medium">
                  {prescriptionData.doctorCrm} / {prescriptionData.doctorCrmState}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data da Prescrição</p>
                <p className="font-medium">
                  {format(parseISO(prescriptionData.prescriptionDate), 'dd/MM/yyyy')}
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
                      {format(parseISO(prescriptionData.validUntil), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {new Date(prescriptionData.validUntil) > new Date() ? (
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
                      {format(parseISO(prescriptionData.reviewDate), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status da revisão</p>
                    {new Date(prescriptionData.reviewDate) > new Date() ? (
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

      {/* Dados de Controlado */}
      {prescriptionData.prescriptionType === 'CONTROLADO' && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base text-purple-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Informações de Medicamento Controlado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Classe</p>
                <p className="font-medium text-purple-900">
                  {prescriptionData.controlledClass || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Notificação</p>
                <p className="font-medium text-purple-900">
                  {prescriptionData.notificationNumber || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de Notificação</p>
                <p className="font-medium text-purple-900">
                  {prescriptionData.notificationType || '-'}
                </p>
              </div>
              {prescriptionData.prescriptionImageUrl && (
                <div>
                  <p className="text-sm text-gray-600">Receita</p>
                  <a
                    href={prescriptionData.prescriptionImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-700 hover:underline"
                  >
                    Ver arquivo
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Medicamentos e Histórico */}
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
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/30 p-4 rounded-lg">
            {/* Navegação por Data */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[200px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(viewDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
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
                >
                  Hoje
                </Button>
              )}
            </div>

            {/* Toggle de Ordenação */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordenar por:</span>
              <Button
                variant={sortMode === 'medication' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('medication')}
              >
                Medicamento
              </Button>
              <Button
                variant={sortMode === 'time' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('time')}
              >
                Horário
              </Button>
            </div>
          </div>

          {/* Tabs de Filtro por Status */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-full">
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
              <CardContent className="p-6 text-center text-gray-600">
                Nenhum medicamento contínuo cadastrado
              </CardContent>
            </Card>
          ) : expandedMedicationCards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-600">
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
              const ButtonIcon = config.buttonIcon

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
                          <Pill className="h-5 w-5 text-blue-600 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg">{medication.name}</h3>
                              {/* Horário Destacado */}
                              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-lg text-blue-900">
                                  {scheduledTime}
                                </span>
                              </div>
                              {/* Badge de Status */}
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {medication.presentation} - {medication.concentration}
                            </p>
                            {/* Badges de Características */}
                            <div className="flex gap-2 mt-2">
                              {medication.isControlled && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  Controlado
                                </Badge>
                              )}
                              {medication.isHighRisk && (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  Alto Risco
                                </Badge>
                              )}
                              {medication.requiresDoubleCheck && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                  Dupla Checagem
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Grid de Informações */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-gray-600">Dose:</span>
                            <p className="font-medium">{medication.dose}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Via:</span>
                            <p className="font-medium">
                              {ROUTE_LABELS[medication.route] || medication.route}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Frequência:</span>
                            <p className="font-medium">{medication.frequency}</p>
                          </div>
                        </div>

                        {/* Instruções Especiais */}
                        {medication.instructions && (
                          <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
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

                      {/* Botão de Ação Condicional */}
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
                        variant={config.buttonVariant}
                      >
                        <ButtonIcon className="h-4 w-4 mr-2" />
                        {config.buttonLabel}
                      </Button>
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
              <CardContent className="p-6 text-center text-gray-600">
                Nenhuma medicação SOS cadastrada
              </CardContent>
            </Card>
          ) : (
            prescriptionData.sosMedications.map((sos: any) => (
              <Card key={sos.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <h3 className="font-semibold text-lg">{sos.name}</h3>
                          <p className="text-sm text-gray-600">
                            {sos.presentation} - {sos.concentration}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          SOS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Indicação:</span>
                          <p className="font-medium">{sos.indication}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Dose:</span>
                          <p className="font-medium">{sos.dose}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Intervalo Mín.:</span>
                          <p className="font-medium">{sos.minInterval}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Máx. Diária:</span>
                          <p className="font-medium">{sos.maxDailyDoses}x</p>
                        </div>
                      </div>

                      {sos.indicationDetails && (
                        <div className="p-3 bg-orange-50 rounded border border-orange-200 text-sm">
                          <span className="font-medium">Detalhes:</span> {sos.indicationDetails}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAdministerSOS(sos)}
                      size="sm"
                      variant="outline"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Administrar SOS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Observações */}
      {prescriptionData.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{prescriptionData.notes}</p>
          </CardContent>
        </Card>
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
    </div>
  )
}
