import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateLong, getCurrentDateLocal } from '@/utils/timezone'
import { Download, Plus, Loader2, User, Calendar, Droplets, Utensils, ArrowLeft, Eye, AlertCircle, Activity, UtensilsCrossed, Heart } from 'lucide-react'
import { useAllergiesByResident } from '@/hooks/useAllergies'
import { useConditionsByResident } from '@/hooks/useConditions'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, getTenantInfo, getResidentInfo } from '@/services/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { generateDailyRecordsPDF } from '@/services/pdfGenerator'
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
import { ResidentSelectionGrid } from '@/components/residents/ResidentSelectionGrid'
import { useLatestRecordsByResidents } from '@/hooks/useDailyRecords'
import { RECORD_TYPE_LABELS, renderRecordSummary } from '@/utils/recordTypeLabels'
import { DailyRecordsOverviewStats } from './components/DailyRecordsOverviewStats'
import { DailyTasksPanel } from '@/components/daily-records/DailyTasksPanel'
import { getErrorMessage } from '@/utils/errorHandling'
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

export function DailyRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const residentId = searchParams.get('residentId')
  const selectedDate = searchParams.get('date') || getCurrentDateLocal()

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined)
  const [viewingRecord, setViewingRecord] = useState<any>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  // Buscar lista de residentes (para o seletor)
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      const response = await api.get('/residents')
      return response.data
    },
  })

  // Buscar residente selecionado
  const { data: resident } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: async () => {
      const response = await api.get(`/residents/${residentId}`)
      return response.data
    },
    enabled: !!residentId,
  })

  // Buscar registros do dia
  const { data: records, isLoading } = useQuery({
    queryKey: ['daily-records', residentId, selectedDate],
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${residentId}/date/${selectedDate}`,
      )
      return response.data
    },
    enabled: !!residentId,
  })

  // Mutation para criar registro
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/daily-records', data)
    },
    onSuccess: (response) => {
      // ✅ NOVO PADRÃO: Helper centralizado de invalidação
      // Invalida: daily-records, daily-tasks, audit, notifications
      const recordData = response.data
      invalidateAfterDailyRecordMutation(
        queryClient,
        recordData.residentId || residentId,
        recordData.date || selectedDate
      )
      setActiveModal(null)
      toast.success('Registro adicionado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao adicionar registro')
    },
  })

  const handleCreateRecord = (data: any) => {
    createMutation.mutate(data)
  }

  const handleViewRecord = (record: any) => {
    setViewingRecord(record)
    setViewModalOpen(true)
  }

  const handleExportPDF = async () => {
    try {
      if (!residentId || !resident || !user?.tenantId) {
        toast.error('Dados insuficientes para exportar PDF')
        return
      }

      if (!records || records.length === 0) {
        toast.warning('Não há registros para exportar')
        return
      }

      toast.info('Gerando PDF...')

      // Buscar dados do tenant e residente completos
      const [tenantInfo, residentInfo] = await Promise.all([
        getTenantInfo(user.tenantId),
        getResidentInfo(residentId),
      ])

      // Gerar PDF
      await generateDailyRecordsPDF({
        tenant: {
          name: tenantInfo.name || 'ILPI',
          addressStreet: tenantInfo.addressStreet,
          addressNumber: tenantInfo.addressNumber,
          addressCity: tenantInfo.addressCity,
          addressState: tenantInfo.addressState,
        },
        resident: {
          fullName: residentInfo.fullName,
          birthDate: residentInfo.birthDate,
          cns: residentInfo.cns,
          admissionDate: residentInfo.admissionDate,
          emergencyContacts: residentInfo.emergencyContacts || [],
          weight: residentInfo.weight,
          height: residentInfo.height,
          roomId: residentInfo.roomId,
          bedId: residentInfo.bedId,
        },
        date: selectedDate,
        records: records,
      })

      toast.success('PDF gerado com sucesso!')
    } catch (error: unknown) {
      console.error('Erro ao gerar PDF:', error)
      toast.error(error?.message || 'Erro ao gerar PDF')
    }
  }

  const handleResidentSelect = (newResidentId: string) => {
    setSearchParams({
      residentId: newResidentId,
      date: selectedDate,
    })
  }

  const handleBack = () => {
    setSearchParams({
      date: selectedDate,
    })
  }

  const handleDateChange = (newDate: string) => {
    if (residentId) {
      setSearchParams({
        residentId,
        date: newDate,
      })
    }
  }

  // Hook para buscar últimos registros
  const { data: latestRecords = [], isLoading: isLoadingLatest } =
    useLatestRecordsByResidents()

  // Hook para buscar alergias do residente
  const { data: allergies = [] } = useAllergiesByResident(residentId || '')

  // Hook para buscar condições crônicas do residente
  const { data: conditions = [] } = useConditionsByResident(residentId || '')

  // Hook para buscar restrições alimentares do residente
  const { data: dietaryRestrictions = [] } = useDietaryRestrictionsByResident(residentId || '')

  // Se não houver residente selecionado, mostrar grid de seleção
  if (!residentId) {
    return (
      <div className="space-y-6">
        <ResidentSelectionGrid
          residents={residentsData?.data || []}
          latestRecords={latestRecords}
          onSelectResident={handleResidentSelect}
          isLoading={isLoadingResidents || isLoadingLatest}
          statsComponent={
            <DailyRecordsOverviewStats
              residents={residentsData?.data || []}
              latestRecords={latestRecords}
            />
          }
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Registros Diários</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {resident?.fullName} |{' '}
            {formatDateLong(selectedDate + 'T00:00:00')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Clínico em Grid */}
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
                  <div className="space-y-1">
                    {allergies.slice(0, 3).map((allergy: any) => (
                      <div key={allergy.id} className="flex items-start gap-2">
                        <Badge
                          variant="destructive"
                          className="text-xs shrink-0"
                        >
                          {allergy.severity || 'LEVE'}
                        </Badge>
                        <p className="text-sm font-medium text-danger truncate">
                          {allergy.substance}
                        </p>
                      </div>
                    ))}
                    {allergies.length > 3 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        +{allergies.length - 3} outras alergias
                      </p>
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

        {/* Card de Condições Crônicas - Segunda linha, 1 coluna */}
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
                    {conditions.slice(0, 3).map((condition: any) => (
                      <Badge
                        key={condition.id}
                        variant="outline"
                        className="border-warning text-warning"
                      >
                        {condition.condition}
                      </Badge>
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
        <Card className="border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-lg shrink-0">
                <UtensilsCrossed className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Restrições Alimentares
                </h3>
                {dietaryRestrictions && dietaryRestrictions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dietaryRestrictions.slice(0, 3).map((restriction: any) => (
                      <Badge
                        key={restriction.id}
                        variant="outline"
                        className="border-blue-500 text-blue-500"
                      >
                        {restriction.description}
                      </Badge>
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

      {/* Layout em 3 colunas: Tarefas do Dia (1/3) + Timeline (1/3) + Adicionar Registro (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Coluna 1: Tarefas do Dia (1/3) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Tarefas do Dia</h2>
              <DailyTasksPanel
                residentId={residentId}
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
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  <span className="ml-2 text-gray-500">Carregando...</span>
                </div>
              ) : records && records.length > 0 ? (
                <div className="space-y-2">
                  {records.map((record: any) => (
                    <div
                      key={record.id}
                      onClick={() => handleViewRecord(record)}
                      className={`border-l-4 pl-3 py-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] rounded-r-md ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-gray-100'}`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Horário */}
                        <span className="font-semibold text-sm min-w-[40px]">{record.time}</span>

                        <div className="flex-1 min-w-0">
                          {/* Badge do Tipo */}
                          <Badge
                            variant="outline"
                            className={`${RECORD_TYPE_LABELS[record.type]?.color} text-xs mb-1`}
                          >
                            {RECORD_TYPE_LABELS[record.type]?.label}
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
                <div className="text-center py-8 text-gray-500">
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
              <div className="flex flex-col gap-2">
                <Button onClick={() => setActiveModal('HIGIENE')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Higiene
                </Button>
                <Button onClick={() => setActiveModal('ALIMENTACAO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Alimentação
                </Button>
                <Button onClick={() => setActiveModal('HIDRATACAO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Hidratação
                </Button>
                <Button onClick={() => setActiveModal('MONITORAMENTO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Monitoramento
                </Button>
                <Button onClick={() => setActiveModal('ELIMINACAO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Eliminação
                </Button>
                <Button onClick={() => setActiveModal('COMPORTAMENTO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Estado Emocional
                </Button>
                <Button onClick={() => setActiveModal('HUMOR')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Humor
                </Button>
                <Button onClick={() => setActiveModal('SONO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Sono
                </Button>
                <Button onClick={() => setActiveModal('PESO')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Peso/Altura
                </Button>
                <Button onClick={() => setActiveModal('INTERCORRENCIA')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Intercorrência
                </Button>
                <Button onClick={() => setActiveModal('ATIVIDADES')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Atividades
                </Button>
                <Button onClick={() => setActiveModal('VISITA')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Visita
                </Button>
                <Button onClick={() => setActiveModal('OUTROS')} variant="outline" size="sm" className="justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Outros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid de Cards de Resumo (Sinais Vitais, Alimentação e Hidratação) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Card de Sinais Vitais e Antropometria */}
        <Card className="border-purple-500/20 dark:border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg shrink-0">
                <Heart className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Sinais Vitais e Antropometria
                </h3>
                {(() => {
                  // Buscar último registro de PESO
                  const ultimoPesoRecord = records
                    ?.filter((r) => r.type === 'PESO')
                    .sort((a, b) => b.time.localeCompare(a.time))[0]

                  // Buscar último registro de MONITORAMENTO
                  const ultimoMonitoramento = records
                    ?.filter((r) => r.type === 'MONITORAMENTO')
                    .sort((a, b) => b.time.localeCompare(a.time))[0]

                  // Processar peso (pode vir como string "66" ou número)
                  let pesoNum: number | null = null
                  const pesoRaw = ultimoPesoRecord?.data?.peso || resident?.weight
                  if (pesoRaw) {
                    pesoNum = typeof pesoRaw === 'string' ? parseFloat(pesoRaw.replace(',', '.')) : pesoRaw
                  }

                  // Processar altura (pode vir em cm como 160 ou em metros como 1.60)
                  let alturaCm: number | null = null
                  const alturaRaw = ultimoPesoRecord?.data?.altura || resident?.height
                  if (alturaRaw) {
                    const alturaNum = typeof alturaRaw === 'string' ? parseFloat(alturaRaw.replace(',', '.')) : alturaRaw
                    // Se o valor for menor que 10, provavelmente está em metros (ex: 1.60), converter para cm
                    alturaCm = alturaNum < 10 ? alturaNum * 100 : alturaNum
                  }

                  // Calcular IMC se tiver peso e altura
                  let imc: number | null = null
                  let imcClassificacao: { texto: string; cor: string } | null = null

                  if (pesoNum && alturaCm) {
                    const alturaMetros = alturaCm / 100
                    imc = pesoNum / (alturaMetros * alturaMetros)

                    if (imc < 18.5) {
                      imcClassificacao = { texto: 'Baixo peso', cor: 'text-yellow-600 dark:text-yellow-400' }
                    } else if (imc < 25) {
                      imcClassificacao = { texto: 'Peso normal', cor: 'text-green-600 dark:text-green-400' }
                    } else if (imc < 30) {
                      imcClassificacao = { texto: 'Sobrepeso', cor: 'text-orange-600 dark:text-orange-400' }
                    } else {
                      imcClassificacao = { texto: 'Obesidade', cor: 'text-red-600 dark:text-red-400' }
                    }
                  }

                  // Dados de sinais vitais
                  const pressaoArterial = ultimoMonitoramento?.data?.pressaoArterial
                  const temperatura = ultimoMonitoramento?.data?.temperatura
                  const frequenciaCardiaca = ultimoMonitoramento?.data?.frequenciaCardiaca
                  const saturacaoO2 = ultimoMonitoramento?.data?.saturacaoO2
                  const glicemia = ultimoMonitoramento?.data?.glicemia

                  const temAntropometria = pesoNum || alturaCm
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
                          {pesoNum && alturaCm && <span className="mx-2">•</span>}
                          {alturaCm && <span className="font-medium">{(alturaCm / 100).toFixed(2)} m</span>}
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
          const registrosAlimentacao = records.filter((r) => r.type === 'ALIMENTACAO')

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
            (sum, r) => sum + converteIngestao(r.data?.ingeriu || 'Recusou'),
            0
          )
          const percentualTotal = Math.round((totalIngestao / 600) * 100)

          return (
            <Card className="border-orange-500/20 dark:border-orange-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg shrink-0">
                    <Utensils className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Aceitação Alimentar Total
                    </h3>
                    <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">
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
          const totalHidratacao = records
            .filter((r) => r.type === 'HIDRATACAO')
            .reduce((sum, r) => sum + (r.data?.volumeMl || 0), 0)

          const totalAlimentacao = records
            .filter((r) => r.type === 'ALIMENTACAO' && r.data?.volumeMl)
            .reduce((sum, r) => sum + (r.data?.volumeMl || 0), 0)

          const totalGeral = totalHidratacao + totalAlimentacao

          if (totalGeral === 0) return null

          return (
            <Card className="border-info/20 dark:border-info/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-info/10 dark:bg-info/20 rounded-lg shrink-0">
                    <Droplets className="h-6 w-6 text-info dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Total de Líquidos Ingeridos
                    </h3>
                    <p className="text-3xl font-bold text-info dark:text-blue-400">
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

      {/* Modais */}
      {activeModal === 'HIGIENE' && (
        <HigieneModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId}
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
            setSelectedMealType(undefined) // ✅ Limpar seleção ao fechar
          }}
          onSubmit={handleCreateRecord}
          residentId={residentId}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
          existingRecords={records.filter((r) => r.type === 'ALIMENTACAO')}
          defaultMealType={selectedMealType} // ✅ Passar mealType pré-selecionado
        />
      )}
      {activeModal === 'HIDRATACAO' && (
        <HidratacaoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
          residentId={residentId}
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
    </div>
  )
}

export default DailyRecordsPage
