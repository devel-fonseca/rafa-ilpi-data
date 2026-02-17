/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDateLongSafe, getCurrentDate, normalizeUTCDate } from '@/utils/dateHelpers'
import {
  Plus,
  Loader2,
  AlertCircle,
  Activity,
  UtensilsCrossed,
  Heart,
  Droplets,
  Utensils,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAllergiesByResident } from '@/hooks/useAllergies'
import { useConditionsByResident } from '@/hooks/useConditions'
import type { Allergy } from '@/api/allergies.api'
import type { Condition } from '@/api/conditions.api'
import type { DietaryRestriction } from '@/api/dietary-restrictions.api'
import type {
  DailyRecord,
  AlimentacaoData,
  HidratacaoData,
  CreateDailyRecordInput,
  DailyRecordData,
} from '@/types/daily-records'
import type { DailyRecord as ApiDailyRecord } from '@/api/dailyRecords.api'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
import { useDailyRecordsRealtime } from '@/hooks/useDailyRecordsRealtime'
import { useLatestAnthropometry } from '@/hooks/useResidentHealth'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useConsolidatedVitalSigns } from '@/hooks/useConsolidatedVitalSigns'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { tenantKey } from '@/lib/query-keys'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { HigieneModal } from './modals/HigieneModal'
import { AlimentacaoModal } from './modals/AlimentacaoModal'
import { HidratacaoModal } from './modals/HidratacaoModal'
import { MonitoramentoModal } from './modals/MonitoramentoModal'
import { EliminacaoModal } from './modals/EliminacaoModal'
import { ComportamentoModal } from './modals/ComportamentoModal'
import { HumorModal } from './modals/HumorModal'
import { SonoModal } from './modals/SonoModal'
import { PesoModal } from './modals/PesoModal'
import { IntercorrenciaModal } from './modals/IntercorrenciaModal'
import { AtividadesModal } from './modals/AtividadesModal'
import { VisitaModal } from './modals/VisitaModal'
import { OutrosModal } from './modals/OutrosModal'
import { getRecordTypeLabel } from '@/utils/recordTypeLabels'
import { DailyTasksPanel } from '@/components/daily-records/DailyTasksPanel'
import { DailyAppointmentsPanel } from '@/components/daily-records/DailyAppointmentsPanel'
import { DailyRecordsTimeline } from '@/components/daily-records/DailyRecordsTimeline'
import { HybridTooltip, Page, PageHeader, Section } from '@/design-system/components'
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

// Helper para formatar gravidade da alergia
const formatSeverity = (severity: string | null) => {
  if (!severity) return null
  const severityMap: Record<string, string> = {
    LEVE: 'Leve',
    MODERADA: 'Moderada',
    GRAVE: 'Grave',
    ANAFILAXIA: 'Anafilaxia',
  }
  return severityMap[severity] || severity
}

// Helper para formatar tipo de restrição
const formatRestrictionType = (type: string) => {
  const typeMap: Record<string, string> = {
    ALERGIA_ALIMENTAR: 'Alergia Alimentar',
    INTOLERANCIA: 'Intolerância',
    RESTRICAO_MEDICA: 'Restrição Médica',
    RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
    DISFAGIA: 'Disfagia',
  }
  return typeMap[type] || type
}

const formatMeasurementDateTime = (value: string | null | undefined) => {
  if (!value) return null
  const date = normalizeUTCDate(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const toValidNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const extractAnthropometryFromDailyRecordData = (data: unknown) => {
  const source = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const weight = toValidNumber(source.peso ?? source.weight ?? source.pesoKg ?? source.weightKg)
  const height = toValidNumber(source.altura ?? source.height ?? source.alturaM ?? source.heightM)
  const bmi = toValidNumber(source.imc ?? source.bmi)

  return { weight, height, bmi }
}

const RECORD_QUICK_ACTIONS = [
  { type: 'HIGIENE', label: 'Higiene', description: 'Indica as condições de higiene e os cuidados realizados, refletindo o nível de autonomia do residente e suas necessidades de apoio.' },
  { type: 'ALIMENTACAO', label: 'Alimentação', description: 'Refere-se à aceitação alimentar e ao modo como o residente se alimenta, permitindo acompanhar padrões e possíveis alterações.' },
  { type: 'HIDRATACAO', label: 'Hidratação', description: 'Indica a ingestão de líquidos ao longo do período, contribuindo para o monitoramento do equilíbrio hídrico e prevenção de intercorrências.' },
  { type: 'MONITORAMENTO', label: 'Monitoramento', description: 'Reúne parâmetros observados durante o cuidado, auxiliando na identificação precoce de alterações do estado de saúde.' },
  { type: 'ELIMINACAO', label: 'Eliminação', description: 'Refere-se ao padrão urinário e intestinal do residente, permitindo reconhecer mudanças relevantes no funcionamento fisiológico.' },
  { type: 'COMPORTAMENTO', label: 'Comportamento', description: 'Refere-se à forma como o residente se apresenta no momento da avaliação, podendo variar conforme o contexto e as condições do dia.' },
  { type: 'HUMOR', label: 'Humor', description: 'Indica o estado emocional predominante do residente, geralmente mais estável que o comportamento momentâneo.' },
  { type: 'SONO', label: 'Sono', description: 'Indica a qualidade e o padrão do sono, favorecendo a identificação de alterações que possam impactar o bem-estar e a saúde.' },
  { type: 'PESO', label: 'Peso/Altura', description: 'Permite acompanhar medidas corporais relevantes para a avaliação nutricional e o monitoramento das condições gerais de saúde.' },
  { type: 'INTERCORRENCIA', label: 'Intercorrência', description: 'Registra ocorrências inesperadas ou alterações do estado habitual, subsidiando a avaliação e a tomada de decisão pela equipe.' },
  { type: 'ATIVIDADES', label: 'Atividades', description: 'Refere-se à participação do residente nas atividades propostas, contribuindo para a avaliação do engajamento e da funcionalidade.' },
  { type: 'VISITA', label: 'Visita', description: 'Registra a ocorrência de visitas ao residente.' },
  { type: 'OUTROS', label: 'Outros', description: 'Destinado ao registro de informações relevantes para o cuidado que não se enquadrem nas categorias anteriores.' },
] as const

export default function ResidentRecordsPage() {
  const { residentId } = useParams<{ residentId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { hasPermission } = usePermissions()
  const canViewClinicalProfile = hasPermission(PermissionType.VIEW_CLINICAL_PROFILE)

  const selectedDate = searchParams.get('date') || getCurrentDate()

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined)
  const [viewingRecord, setViewingRecord] = useState<DailyRecord | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [timelinePage, setTimelinePage] = useState(1)
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  )
  const summaryCardsRef = useRef<HTMLDivElement | null>(null)
  const [activeSummaryPage, setActiveSummaryPage] = useState(0)
  const [totalSummaryPages, setTotalSummaryPages] = useState(0)

  // Hook de atualização em tempo real via WebSocket (Sprint 3)
  useDailyRecordsRealtime(residentId, selectedDate)

  // Buscar residente selecionado
  const { data: resident, isLoading } = useQuery({
    queryKey: tenantKey('residents', residentId),
    queryFn: async () => {
      const response = await api.get(`/residents/${residentId}`)
      return response.data
    },
    enabled: !!residentId,
  })

  // Buscar registros do dia
  const { data: records } = useQuery({
    queryKey: tenantKey('daily-records', 'resident', residentId, selectedDate),
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${residentId}/date/${selectedDate}`,
      )
      return response.data
    },
    enabled: !!residentId,
  })

  const tasksPageSize = windowWidth < 768 ? 5 : windowWidth < 1280 ? 7 : 8
  const appointmentsPageSize = windowWidth < 768 ? 4 : windowWidth < 1280 ? 5 : 6
  const timelinePageSize = windowWidth < 768 ? 8 : windowWidth < 1280 ? 10 : 12
  const safeRecords = (records as DailyRecord[] | undefined) || []
  const totalTimelinePages = Math.max(1, Math.ceil(safeRecords.length / timelinePageSize))
  const paginatedTimelineRecords = safeRecords.slice(
    (timelinePage - 1) * timelinePageSize,
    timelinePage * timelinePageSize,
  )

  // Hook para buscar alergias do residente
  const { data: allergies = [] } = useAllergiesByResident(residentId || '')

  // Hook para buscar condições crônicas do residente
  const { data: conditions = [] } = useConditionsByResident(residentId || '')

  // Hook para buscar restrições alimentares do residente
  const { data: dietaryRestrictions = [] } = useDietaryRestrictionsByResident(residentId || '')

  // Hook para buscar última medição antropométrica da nova tabela
  const { data: latestAnthropometryClinical } = useLatestAnthropometry(
    residentId || '',
    canViewClinicalProfile,
  )

  // Buscar sinais vitais consolidados (mesma fonte da Visualização Rápida)
  const { data: consolidatedVitalSigns } = useConsolidatedVitalSigns(residentId)

  // Buscar último registro antropométrico (PESO) para fallback quando endpoint clínico não estiver disponível
  const { data: latestAnthropometryRecordFallback } = useQuery<ApiDailyRecord | null>({
    queryKey: tenantKey('daily-records', 'resident', residentId, 'latest-anthropometry', 'fallback'),
    queryFn: async () => {
      const response = await api.get(`/daily-records/resident/${residentId}/latest-anthropometry`)
      return response.data || null
    },
    enabled: !!residentId,
    staleTime: 5 * 60 * 1000,
  })

  // Mutation para criar registro
  const createMutation = useMutation({
    mutationFn: async (data: CreateDailyRecordInput<DailyRecordData>) => {
      return await api.post('/daily-records', data)
    },
    onSuccess: (response) => {
      const recordData = response.data
      invalidateAfterDailyRecordMutation(
        queryClient,
        recordData.residentId || residentId,
        recordData.date || selectedDate
      )
      setActiveModal(null)
      toast.success('Registro adicionado com sucesso!')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error(errorResponse?.data?.message || 'Erro ao adicionar registro')
    },
  })

  const handleCreateRecord = (data: CreateDailyRecordInput<DailyRecordData>) => {
    createMutation.mutate(data)
  }

  const handleViewRecord = (record: DailyRecord) => {
    setViewingRecord(record)
    setViewModalOpen(true)
  }

  const handleBack = () => {
    navigate('/dashboard/registros-diarios')
  }

  const handleOpenQuickAction = (recordType: string) => {
    setQuickAddOpen(false)
    setSelectedMealType(undefined)
    setActiveModal(recordType)
  }

  const scrollSummaryCards = (direction: 'prev' | 'next') => {
    if (!summaryCardsRef.current) return

    const container = summaryCardsRef.current
    const scrollAmount = container.clientWidth

    container.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    })
  }

  const goToSummaryPage = (index: number) => {
    if (!summaryCardsRef.current) return

    const container = summaryCardsRef.current
    container.scrollTo({
      left: index * container.clientWidth,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const container = summaryCardsRef.current
    if (!container) return

    const updateSummaryCarouselState = () => {
      const slides = container.querySelectorAll('[data-summary-slide]').length
      if (slides === 0) {
        setTotalSummaryPages(0)
        setActiveSummaryPage(0)
        return
      }

      const cardsPerPage = window.matchMedia('(min-width: 768px)').matches ? 2 : 1
      const pages = Math.ceil(slides / cardsPerPage)
      setTotalSummaryPages(pages)

      const containerWidth = container.clientWidth || 1
      const rawPage = Math.round(container.scrollLeft / containerWidth)
      const boundedPage = Math.max(0, Math.min(rawPage, pages - 1))
      setActiveSummaryPage(boundedPage)
    }

    updateSummaryCarouselState()
    container.addEventListener('scroll', updateSummaryCarouselState, { passive: true })
    window.addEventListener('resize', updateSummaryCarouselState)

    return () => {
      container.removeEventListener('scroll', updateSummaryCarouselState)
      window.removeEventListener('resize', updateSummaryCarouselState)
    }
  }, [records, allergies.length, conditions.length, dietaryRestrictions.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setTimelinePage(1)
  }, [residentId, selectedDate, safeRecords.length, timelinePageSize])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-danger" />
        <div className="text-muted-foreground">Residente não encontrado</div>
        <Button variant="outline" onClick={handleBack}>
          Voltar para a lista
        </Button>
      </div>
    )
  }

  return (
    <Page maxWidth="wide">
      <PageHeader
        title="Registros Diários"
        subtitle={`${resident?.fullName} | ${formatDateLongSafe(selectedDate + 'T00:00:00')}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Registros Diários', href: '/dashboard/registros-diarios' },
          { label: resident?.fullName || 'Residente' },
        ]}
      />

      {/* Cards de Resumo Clínico em Carrossel */}
      <Section>
      <TooltipProvider delayDuration={300}>
        <div className="mb-8">
        <div className="flex justify-end gap-2 mb-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => scrollSummaryCards('prev')}
            aria-label="Card anterior"
            disabled={activeSummaryPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => scrollSummaryCards('next')}
            aria-label="Próximo card"
            disabled={activeSummaryPage >= Math.max(0, totalSummaryPages - 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={summaryCardsRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth"
        >
        <div data-summary-slide className="order-3 w-full md:w-[calc((100%-1rem)/2)] shrink-0 snap-start">
        {/* Card de Alergias */}
        <Card className="border-danger/20 h-full">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-danger/10 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6 text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Alergias
                </h3>
                {allergies && allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allergies.slice(0, 3).map((allergy: Allergy) => (
                      <Tooltip key={allergy.id}>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Badge
                              variant="outline"
                              className="border-danger text-danger cursor-help"
                            >
                              {allergy.substance}
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="font-semibold">{allergy.substance}</p>
                            {allergy.severity && (
                              <p className="text-xs">
                                <span className="font-medium">Gravidade:</span> {formatSeverity(allergy.severity)}
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
                    ))}
                    {allergies.length > 3 && (
                      <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                        +{allergies.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma alergia registrada
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <div data-summary-slide className="order-2 w-full md:w-[calc((100%-1rem)/2)] shrink-0 snap-start">
        {/* Card de Condições Crônicas */}
        <Card className="border-warning/20 h-full">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg shrink-0">
                <Activity className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Condições Crônicas
                </h3>
                {conditions && conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {conditions.slice(0, 3).map((condition: Condition) => (
                      <Tooltip key={condition.id}>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Badge
                              variant="outline"
                              className="border-warning text-warning cursor-help"
                            >
                              {condition.condition}
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="font-semibold">{condition.condition}</p>
                            {condition.icdCode && (
                              <p className="text-xs">
                                <span className="font-medium">CID:</span> {condition.icdCode}
                              </p>
                            )}
                            {condition.notes && (
                              <p className="text-xs">
                                <span className="font-medium">Observações Clínicas:</span> {condition.notes}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {conditions.length > 3 && (
                      <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                        +{conditions.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma condição crônica registrada
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <div data-summary-slide className="order-4 w-full md:w-[calc((100%-1rem)/2)] shrink-0 snap-start">
        {/* Card de Restrições Alimentares */}
        <Card className="border-primary/20 h-full">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg shrink-0">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Restrições Alimentares
                </h3>
                {dietaryRestrictions && dietaryRestrictions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dietaryRestrictions.slice(0, 3).map((restriction: DietaryRestriction) => (
                      <Tooltip key={restriction.id}>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Badge
                              variant="outline"
                              className="border-primary text-primary cursor-help"
                            >
                              {restriction.description}
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="font-semibold">{restriction.description}</p>
                            {restriction.restrictionType && (
                              <p className="text-xs">
                                <span className="font-medium">Tipo:</span> {formatRestrictionType(restriction.restrictionType)}
                              </p>
                            )}
                            {restriction.notes && (
                              <p className="text-xs">
                                <span className="font-medium">Observações do Nutricionista:</span> {restriction.notes}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {dietaryRestrictions.length > 3 && (
                      <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                        +{dietaryRestrictions.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma restrição alimentar registrada
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <div data-summary-slide className="order-1 w-full md:w-[calc((100%-1rem)/2)] shrink-0 snap-start">
        {/* Card de Sinais Vitais e Antropometria */}
        <Card className="border-medication-controlled/20 dark:border-medication-controlled/30 h-full">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-medication-controlled/10 dark:bg-medication-controlled/20 rounded-lg shrink-0">
                <Heart className="h-6 w-6 text-medication-controlled dark:text-medication-controlled/40" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Sinais Vitais e Antropometria
                </h3>
                {(() => {
                  const latestPesoRecord = latestAnthropometryRecordFallback
                  const latestPesoData = extractAnthropometryFromDailyRecordData(latestPesoRecord?.data)
                  const residentAnthropometry = resident?.latestAnthropometry as
                    | {
                        height?: number | string | null
                        weight?: number | string | null
                        bmi?: number | string | null
                        measurementDate?: string | null
                        createdAt?: string | null
                      }
                    | undefined

                  // Dados antropométricos vêm da nova tabela (latestAnthropometry)
                  // Fallback: usar último registro de PESO quando necessário
                  const pesoNum = latestAnthropometryClinical?.weight
                    ? Number(latestAnthropometryClinical.weight)
                    : (toValidNumber(residentAnthropometry?.weight) ?? latestPesoData.weight)
                  const alturaMetros = latestAnthropometryClinical?.height
                    ? Number(latestAnthropometryClinical.height)
                    : (toValidNumber(residentAnthropometry?.height) ?? latestPesoData.height)
                  const imc = latestAnthropometryClinical?.bmi
                    ? Number(latestAnthropometryClinical.bmi)
                    : (toValidNumber(residentAnthropometry?.bmi) ?? latestPesoData.bmi)

                  // Classificação do IMC
                  let imcClassificacao: { texto: string; cor: string } | null = null
                  if (imc) {
                    if (imc < 18.5) {
                      imcClassificacao = { texto: 'Baixo peso', cor: 'text-warning dark:text-warning/40' }
                    } else if (imc < 25) {
                      imcClassificacao = { texto: 'Peso normal', cor: 'text-success dark:text-success/40' }
                    } else if (imc < 30) {
                      imcClassificacao = { texto: 'Sobrepeso', cor: 'text-severity-warning dark:text-severity-warning/40' }
                    } else {
                      imcClassificacao = { texto: 'Obesidade', cor: 'text-danger dark:text-danger/40' }
                    }
                  }

                  // Dados de sinais vitais consolidados (último valor global por parâmetro)
                  const pressaoArterial = consolidatedVitalSigns?.bloodPressure
                    ? `${consolidatedVitalSigns.bloodPressure.systolic}/${consolidatedVitalSigns.bloodPressure.diastolic}`
                    : null
                  const temperatura = consolidatedVitalSigns?.temperature?.value
                  const frequenciaCardiaca = consolidatedVitalSigns?.heartRate?.value
                  const saturacaoO2 = consolidatedVitalSigns?.oxygenSaturation?.value
                  const glicemia = consolidatedVitalSigns?.bloodGlucose?.value

                  const temAntropometria = pesoNum || alturaMetros
                  const temSinaisVitais = pressaoArterial || temperatura || frequenciaCardiaca || saturacaoO2 || glicemia
                  const anthropometryTimestamp =
                    latestAnthropometryClinical?.measurementDate ||
                    latestAnthropometryClinical?.createdAt ||
                    residentAnthropometry?.measurementDate ||
                    residentAnthropometry?.createdAt ||
                    (latestPesoRecord?.date && latestPesoRecord?.time
                      ? `${String(latestPesoRecord.date).split('T')[0]}T${latestPesoRecord.time}:00`
                      : latestPesoRecord?.createdAt)

                  if (!temAntropometria && !temSinaisVitais) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        Nenhum dado registrado
                      </p>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      {/* Linha 1: Antropometria */}
                      {temAntropometria && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {pesoNum && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Badge variant="outline" className={`font-medium ${anthropometryTimestamp ? 'cursor-help' : ''}`}>
                                    Peso {pesoNum} kg
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              {anthropometryTimestamp && (
                                <TooltipContent>
                                  <p>Medição em {formatMeasurementDateTime(anthropometryTimestamp)}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {alturaMetros && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Badge variant="outline" className={`font-medium ${anthropometryTimestamp ? 'cursor-help' : ''}`}>
                                    Altura {alturaMetros.toFixed(2)} m
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              {anthropometryTimestamp && (
                                <TooltipContent>
                                  <p>Medição em {formatMeasurementDateTime(anthropometryTimestamp)}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {imc && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Badge variant="outline" className={`font-medium ${anthropometryTimestamp ? 'cursor-help' : ''}`}>
                                    IMC {imc.toFixed(1)}
                                    {imcClassificacao ? ` (${imcClassificacao.texto})` : ''}
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              {anthropometryTimestamp && (
                                <TooltipContent>
                                  <p>Medição em {formatMeasurementDateTime(anthropometryTimestamp)}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                        </div>
                      )}

                      {/* Separador */}
                      {temAntropometria && temSinaisVitais && (
                        <div className="border-t border-border my-2" />
                      )}

                      {/* Linha 2: Sinais Vitais - Cardiovascular */}
                      {(pressaoArterial || frequenciaCardiaca || saturacaoO2) && (
                        <div className="text-sm space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {pressaoArterial && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Badge variant="outline" className="font-medium">
                                      PA {pressaoArterial} mmHg
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                {consolidatedVitalSigns?.bloodPressure?.timestamp && (
                                  <TooltipContent>
                                    <p>Medição em {formatMeasurementDateTime(consolidatedVitalSigns.bloodPressure.timestamp)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            )}
                            {frequenciaCardiaca && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Badge variant="outline" className="font-medium">
                                      FC {frequenciaCardiaca} bpm
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                {consolidatedVitalSigns?.heartRate?.timestamp && (
                                  <TooltipContent>
                                    <p>Medição em {formatMeasurementDateTime(consolidatedVitalSigns.heartRate.timestamp)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            )}
                            {saturacaoO2 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Badge variant="outline" className="font-medium">
                                      SpO₂ {saturacaoO2}%
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                {consolidatedVitalSigns?.oxygenSaturation?.timestamp && (
                                  <TooltipContent>
                                    <p>Medição em {formatMeasurementDateTime(consolidatedVitalSigns.oxygenSaturation.timestamp)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Linha 3: Sinais Vitais - Metabólico */}
                      {(temperatura || glicemia) && (
                        <div className="text-sm space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {temperatura && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Badge variant="outline" className="font-medium">
                                      Temp {temperatura} °C
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                {consolidatedVitalSigns?.temperature?.timestamp && (
                                  <TooltipContent>
                                    <p>Medição em {formatMeasurementDateTime(consolidatedVitalSigns.temperature.timestamp)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            )}
                            {glicemia && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Badge variant="outline" className="font-medium">
                                      Glicemia {glicemia} mg/dL
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                {consolidatedVitalSigns?.bloodGlucose?.timestamp && (
                                  <TooltipContent>
                                    <p>Medição em {formatMeasurementDateTime(consolidatedVitalSigns.bloodGlucose.timestamp)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Card de Aceitação Alimentar */}
        {records && records.length > 0 && (() => {
          const registrosAlimentacao = (records as DailyRecord[]).filter((r) => r.type === 'ALIMENTACAO')

          if (registrosAlimentacao.length === 0) return null

          // Converte porcentagem de ingestão em número
          const converteIngestao = (ingeriu: string): number => {
            switch (ingeriu) {
              case '100%': return 100
              case '75%': return 75
              case '50%': return 50
              case '<25%': return 25
              case 'Recusou': return 0
              default: return 0
            }
          }

          // Calcula percentual total baseado em 600 pontos (6 refeições × 100%)
          const totalIngestao = registrosAlimentacao.reduce(
            (sum: number, r) => sum + converteIngestao((r.data as AlimentacaoData)?.ingeriu || 'Recusou'),
            0
          )
          const percentualTotal = Math.round((totalIngestao / 600) * 100)

          return (
            <div data-summary-slide className="order-5 w-full md:w-[calc((100%-1rem)/2)] shrink-0 snap-start">
            <Card className="border-severity-warning/20 dark:border-severity-warning/30 h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-severity-warning/10 dark:bg-severity-warning/20 rounded-lg shrink-0">
                    <Utensils className="h-6 w-6 text-severity-warning dark:text-severity-warning/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Aceitação Alimentar Total
                    </h3>
                    <p className="text-3xl font-bold text-severity-warning dark:text-severity-warning/40">
                      {percentualTotal}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {registrosAlimentacao.length} de 6 refeições registradas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )
        })()}

        {/* Card de Líquidos Ingeridos */}
        {records && records.length > 0 && (() => {
          // Calcula total de hidratação de registros de HIDRATACAO e ALIMENTACAO
          const typedRecords = records as DailyRecord[]
          const totalHidratacao = typedRecords
            .filter((r) => r.type === 'HIDRATACAO')
            .reduce((sum: number, r) => sum + (Number((r.data as HidratacaoData)?.volumeMl) || 0), 0)

          const totalAlimentacao = typedRecords
            .filter((r) => r.type === 'ALIMENTACAO' && (r.data as AlimentacaoData)?.volumeMl)
            .reduce((sum: number, r) => sum + (Number((r.data as AlimentacaoData)?.volumeMl) || 0), 0)

          const totalGeral = totalHidratacao + totalAlimentacao

          if (totalGeral === 0) return null

          return (
            <div data-summary-slide className="order-6 w-full md:w-[calc((100%-1rem)/2)] shrink-0 snap-start">
            <Card className="border-info/20 dark:border-info/30 h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-info/10 dark:bg-info/20 rounded-lg shrink-0">
                    <Droplets className="h-6 w-6 text-info dark:text-primary/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Total de Líquidos Ingeridos
                    </h3>
                    <p className="text-3xl font-bold text-info dark:text-primary/40">
                      {totalGeral} ml
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      {totalHidratacao > 0 && (
                        <span>Hidratação: {totalHidratacao}ml</span>
                      )}
                      {totalAlimentacao > 0 && (
                        <span>Durante refeições: {totalAlimentacao}ml</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )
        })()}
        </div>
        {totalSummaryPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {Array.from({ length: totalSummaryPages }).map((_, index) => (
              <button
                key={`summary-page-dot-${index}`}
                type="button"
                onClick={() => goToSummaryPage(index)}
                aria-label={`Ir para página ${index + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  index === activeSummaryPage ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
        </div>
      </TooltipProvider>
      </Section>

      {safeRecords.length > 0 && (
        <div className="mb-6">
          <DailyRecordsTimeline
            records={safeRecords as unknown as ApiDailyRecord[]}
            onRecordClick={(record) => handleViewRecord(record as unknown as DailyRecord)}
          />
        </div>
      )}

      {/* Layout em 2 colunas: Tarefas do Dia + Timeline */}
      <Section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Coluna 1: Tarefas do Dia */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Tarefas do Dia</h2>
                <Button variant="outline" size="sm" onClick={() => setQuickAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registro avulso
                </Button>
              </div>
              <div className="max-h-[640px] overflow-y-auto pr-1">
                <DailyTasksPanel
                  residentId={residentId || ''}
                  selectedDate={selectedDate}
                  pageSize={tasksPageSize}
                  onRegisterRecord={(recordType, mealType) => {
                    setActiveModal(recordType)
                    setSelectedMealType(mealType)
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <DailyAppointmentsPanel
                residentId={residentId || ''}
                selectedDate={selectedDate}
                pageSize={appointmentsPageSize}
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Timeline de Registros */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Timeline do Dia</h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando...</span>
                </div>
              ) : safeRecords.length > 0 ? (
                <div className="space-y-3">
                  <div className="max-h-[640px] overflow-y-auto pr-1 space-y-2">
                  {paginatedTimelineRecords.map((record: DailyRecord) => (
                    <div
                      key={record.id}
                      onClick={() => handleViewRecord(record)}
                      className={`border-l-4 pl-3 py-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] rounded-r-md ${getRecordTypeLabel(record.type || '').bgColor}`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Horário */}
                        <span className="font-semibold text-sm min-w-[40px]">{record.time}</span>

                        <div className="flex-1 min-w-0">
                          {/* Badge do Tipo */}
                          <Badge
                            variant="outline"
                            className={`${getRecordTypeLabel(record.type || '').color} text-xs mb-1`}
                          >
                            {getRecordTypeLabel(record.type || '').label}
                          </Badge>

                          {/* Responsável */}
                          <p className="text-xs text-muted-foreground truncate">
                            {record.recordedBy}
                          </p>
                        </div>

                      </div>
                    </div>
                  ))}
                  </div>

                  {totalTimelinePages > 1 && (
                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Mostrando {(timelinePage - 1) * timelinePageSize + 1}-
                        {Math.min(timelinePage * timelinePageSize, safeRecords.length)} de {safeRecords.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setTimelinePage((prev) => Math.max(1, prev - 1))}
                          disabled={timelinePage === 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setTimelinePage((prev) => Math.min(totalTimelinePages, prev + 1))}
                          disabled={timelinePage === totalTimelinePages}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhum registro para este dia</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </Section>

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Registro</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {RECORD_QUICK_ACTIONS.map((action) => (
              <HybridTooltip
                key={action.type}
                content={<p>{action.description}</p>}
                popoverClassName="w-72"
              >
                <Button
                  onClick={() => handleOpenQuickAction(action.type)}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              </HybridTooltip>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Adicionar registro"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Modais */}
      {activeModal === 'HIGIENE' && (
        <HigieneModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'ALIMENTACAO' && (
        <AlimentacaoModal
          open={true}
          onClose={() => {
            setActiveModal(null)
            setSelectedMealType(undefined)
          }}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
          existingRecords={((records as DailyRecord[] | undefined) || [])
            .filter((r) => r.type === 'ALIMENTACAO' && typeof (r.data as AlimentacaoData)?.refeicao === 'string')
            .map((r) => ({ data: { refeicao: String((r.data as AlimentacaoData).refeicao) } }))}
          defaultMealType={selectedMealType}
        />
      )}
      {activeModal === 'HIDRATACAO' && (
        <HidratacaoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'MONITORAMENTO' && (
        <MonitoramentoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'ELIMINACAO' && (
        <EliminacaoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'COMPORTAMENTO' && (
        <ComportamentoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'HUMOR' && (
        <HumorModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'SONO' && (
        <SonoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'PESO' && (
        <PesoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'INTERCORRENCIA' && (
        <IntercorrenciaModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'ATIVIDADES' && (
        <AtividadesModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'VISITA' && (
        <VisitaModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'OUTROS' && (
        <OutrosModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId || ''}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
        />
      )}

      {/* Modais de Visualização */}
      {viewingRecord?.type === 'HIGIENE' && (
        <ViewHigieneModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'ALIMENTACAO' && (
        <ViewAlimentacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'HIDRATACAO' && (
        <ViewHidratacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'MONITORAMENTO' && (
        <ViewMonitoramentoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'ELIMINACAO' && (
        <ViewEliminacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'COMPORTAMENTO' && (
        <ViewComportamentoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'HUMOR' && (
        <ViewHumorModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'SONO' && (
        <ViewSonoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'PESO' && (
        <ViewPesoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'INTERCORRENCIA' && (
        <ViewIntercorrenciaModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'ATIVIDADES' && (
        <ViewAtividadesModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'VISITA' && (
        <ViewVisitaModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}

      {viewingRecord?.type === 'OUTROS' && (
        <ViewOutrosModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as any}
        />
      )}
    </Page>
  )
}
