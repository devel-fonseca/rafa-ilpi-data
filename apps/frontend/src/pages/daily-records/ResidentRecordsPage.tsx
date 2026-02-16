/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDateLongSafe, getCurrentDate } from '@/utils/dateHelpers'
import { Plus, Loader2, Eye, AlertCircle, Activity, UtensilsCrossed, Heart, Droplets, Utensils } from 'lucide-react'
import { useAllergiesByResident } from '@/hooks/useAllergies'
import { useConditionsByResident } from '@/hooks/useConditions'
import type { Allergy } from '@/api/allergies.api'
import type { Condition } from '@/api/conditions.api'
import type { DietaryRestriction } from '@/api/dietary-restrictions.api'
import type {
  DailyRecord,
  AlimentacaoData,
  HidratacaoData,
  MonitoramentoData,
  CreateDailyRecordInput,
  DailyRecordData,
} from '@/types/daily-records'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
import { useDailyRecordsRealtime } from '@/hooks/useDailyRecordsRealtime'
import { useLatestAnthropometry } from '@/hooks/useResidentHealth'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Page, PageHeader, Section } from '@/design-system/components'
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

export default function ResidentRecordsPage() {
  const { residentId } = useParams<{ residentId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const selectedDate = searchParams.get('date') || getCurrentDate()

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined)
  const [viewingRecord, setViewingRecord] = useState<DailyRecord | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

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

  // Hook para buscar alergias do residente
  const { data: allergies = [] } = useAllergiesByResident(residentId || '')

  // Hook para buscar condições crônicas do residente
  const { data: conditions = [] } = useConditionsByResident(residentId || '')

  // Hook para buscar restrições alimentares do residente
  const { data: dietaryRestrictions = [] } = useDietaryRestrictionsByResident(residentId || '')

  // Hook para buscar última medição antropométrica da nova tabela
  const { data: latestAnthropometry } = useLatestAnthropometry(residentId || '')

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

      {/* Cards de Resumo Clínico em Grid */}
      <Section title="Resumo Clínico">
      <TooltipProvider delayDuration={300}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Card de Alergias */}
        <Card className="border-danger/20">
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

        {/* Card de Condições Crônicas */}
        <Card className="border-warning/20">
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

        {/* Card de Restrições Alimentares */}
        <Card className="border-primary/20">
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
      </TooltipProvider>
      </Section>

      {/* Layout em 3 colunas: Tarefas do Dia (1/3) + Timeline (1/3) + Adicionar Registro (1/3) */}
      <Section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Coluna 1: Tarefas do Dia (1/3) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Tarefas do Dia</h2>
              <DailyTasksPanel
                residentId={residentId || ''}
                selectedDate={selectedDate}
                onRegisterRecord={(recordType, mealType) => {
                  setActiveModal(recordType)
                  setSelectedMealType(mealType)
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Timeline de Registros (1/3) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Timeline do Dia</h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando...</span>
                </div>
              ) : records && records.length > 0 ? (
                <div className="space-y-2">
                  {records.map((record: DailyRecord) => (
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

                        {/* Ícone de visualização */}
                        <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhum registro para este dia</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Botões de Ação (1/3) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Adicionar Registro</h2>
              <TooltipProvider>
                <div className="flex flex-col gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('HIGIENE')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Higiene
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Indica as condições de higiene e os cuidados realizados, refletindo o nível de autonomia do residente e suas necessidades de apoio.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('ALIMENTACAO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Alimentação
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Refere-se à aceitação alimentar e ao modo como o residente se alimenta, permitindo acompanhar padrões e possíveis alterações.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('HIDRATACAO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Hidratação
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Indica a ingestão de líquidos ao longo do período, contribuindo para o monitoramento do equilíbrio hídrico e prevenção de intercorrências.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('MONITORAMENTO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Monitoramento
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Reúne parâmetros observados durante o cuidado, auxiliando na identificação precoce de alterações do estado de saúde.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('ELIMINACAO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Eliminação
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Refere-se ao padrão urinário e intestinal do residente, permitindo reconhecer mudanças relevantes no funcionamento fisiológico.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('COMPORTAMENTO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Comportamento
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Refere-se à forma como o residente se apresenta no momento da avaliação, podendo variar conforme o contexto e as condições do dia.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('HUMOR')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Humor
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Indica o estado emocional predominante do residente, geralmente mais estável que o comportamento momentâneo.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('SONO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Sono
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Indica a qualidade e o padrão do sono, favorecendo a identificação de alterações que possam impactar o bem-estar e a saúde.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('PESO')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Peso/Altura
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Permite acompanhar medidas corporais relevantes para a avaliação nutricional e o monitoramento das condições gerais de saúde.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('INTERCORRENCIA')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Intercorrência
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Registra ocorrências inesperadas ou alterações do estado habitual, subsidiando a avaliação e a tomada de decisão pela equipe.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('ATIVIDADES')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Atividades
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Refere-se à participação do residente nas atividades propostas, contribuindo para a avaliação do engajamento e da funcionalidade.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('VISITA')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Visita
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Registra a ocorrência de visitas ao residente.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveModal('OUTROS')} variant="outline" size="sm" className="justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Outros
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>Destinado ao registro de informações relevantes para o cuidado que não se enquadrem nas categorias anteriores.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>
      </div>
      </Section>

      {/* Grid de Cards de Resumo (Sinais Vitais, Alimentação e Hidratação) */}
      <Section title="Resumo do Dia">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Card de Sinais Vitais e Antropometria */}
        <Card className="border-medication-controlled/20 dark:border-medication-controlled/30">
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
                  // Buscar último registro de MONITORAMENTO do dia (sinais vitais)
                  const ultimoMonitoramento = records
                    ?.filter((r: DailyRecord) => r.type === 'MONITORAMENTO')
                    .sort((a: DailyRecord, b: DailyRecord) => b.time.localeCompare(a.time))[0] as { data: MonitoramentoData } | undefined

                  // Dados antropométricos vêm da nova tabela (latestAnthropometry)
                  // Essa tabela é atualizada automaticamente quando um registro PESO é criado
                  const pesoNum = latestAnthropometry?.weight ? Number(latestAnthropometry.weight) : null
                  const alturaMetros = latestAnthropometry?.height ? Number(latestAnthropometry.height) : null
                  const imc = latestAnthropometry?.bmi ? Number(latestAnthropometry.bmi) : null

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

                  // Dados de sinais vitais do registro diário
                  const pressaoArterial = ultimoMonitoramento?.data?.pressaoArterial
                  const temperatura = ultimoMonitoramento?.data?.temperatura
                  const frequenciaCardiaca = ultimoMonitoramento?.data?.frequenciaCardiaca
                  const saturacaoO2 = ultimoMonitoramento?.data?.saturacaoO2
                  const glicemia = ultimoMonitoramento?.data?.glicemia

                  const temAntropometria = pesoNum || alturaMetros
                  const temSinaisVitais = pressaoArterial || temperatura || frequenciaCardiaca || saturacaoO2 || glicemia

                  if (!temAntropometria && !temSinaisVitais) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        Nenhum dado registrado
                      </p>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      {/* Linha 1: Antropometria em formato inline */}
                      {temAntropometria && (
                        <div className="text-base">
                          {pesoNum && <span className="font-medium">{pesoNum} kg</span>}
                          {pesoNum && alturaMetros && <span className="mx-2">•</span>}
                          {alturaMetros && <span className="font-medium">{alturaMetros.toFixed(2)} m</span>}
                          {imc && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="font-bold">IMC {imc.toFixed(1)}</span>
                              {imcClassificacao && (
                                <span className={`ml-2 text-sm ${imcClassificacao.cor}`}>
                                  ({imcClassificacao.texto})
                                </span>
                              )}
                            </>
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
                          <div className="flex items-center gap-3 flex-wrap">
                            {pressaoArterial && (
                              <span>
                                <span className="text-muted-foreground">PA:</span>{' '}
                                <span className="font-medium">{pressaoArterial}</span>
                                <span className="text-muted-foreground text-xs ml-1">mmHg</span>
                              </span>
                            )}
                            {frequenciaCardiaca && (
                              <span>
                                <span className="text-muted-foreground">FC:</span>{' '}
                                <span className="font-medium">{frequenciaCardiaca}</span>
                                <span className="text-muted-foreground text-xs ml-1">bpm</span>
                              </span>
                            )}
                            {saturacaoO2 && (
                              <span>
                                <span className="text-muted-foreground">SpO₂:</span>{' '}
                                <span className="font-medium">{saturacaoO2}%</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Linha 3: Sinais Vitais - Metabólico */}
                      {(temperatura || glicemia) && (
                        <div className="text-sm space-y-0.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            {temperatura && (
                              <span>
                                <span className="text-muted-foreground">Temp:</span>{' '}
                                <span className="font-medium">{temperatura}°C</span>
                              </span>
                            )}
                            {glicemia && (
                              <span>
                                <span className="text-muted-foreground">Glicemia:</span>{' '}
                                <span className="font-medium">{glicemia}</span>
                                <span className="text-muted-foreground text-xs ml-1">mg/dL</span>
                              </span>
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
            <Card className="border-severity-warning/20 dark:border-severity-warning/30">
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
            <Card className="border-info/20 dark:border-info/30">
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
          )
        })()}
      </div>
      </Section>

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
