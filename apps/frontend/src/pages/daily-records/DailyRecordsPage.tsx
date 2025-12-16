import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateLong, getCurrentDateLocal } from '@/utils/timezone'
import { Download, Plus, Loader2, User, Calendar, Droplets, Utensils, ArrowLeft, Eye, AlertCircle, Activity, UtensilsCrossed } from 'lucide-react'
import { useAllergiesByResident } from '@/hooks/useAllergies'
import { useConditionsByResident } from '@/hooks/useConditions'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
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
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a daily-records
      queryClient.invalidateQueries({ queryKey: ['daily-records'] })
      // Invalidar queries específicas para atualizar os cards de estatísticas
      queryClient.invalidateQueries({ queryKey: ['daily-records', 'latest-by-residents'] })
      queryClient.invalidateQueries({ queryKey: ['daily-records', 'by-date'] })
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
          <h1 className="text-2xl font-bold text-gray-900">Registros Diários</h1>
          <p className="text-gray-600 mt-1">
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

      {/* Cards de Resumo em Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Card de Alergias */}
        <Card className="border-danger/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-danger/10 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6 text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  ⚠️ Alergias
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
                  <>
                    <p className="text-2xl font-bold text-blue-500">
                      {dietaryRestrictions.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dietaryRestrictions.length === 1 ? 'restrição registrada' : 'restrições registradas'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma restrição alimentar registrada
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo de Hidratação */}
        {records && records.length > 0 && (() => {
          // Calcula total de hidratação de registros de HIDRATACAO e ALIMENTACAO
          const totalHidratacao = records
            .filter((r) => r.type === 'HIDRATACAO')
            .reduce((sum, r) => sum + (r.data?.volumeMl || 0), 0)

          const totalAlimentacao = records
            .filter((r) => r.type === 'ALIMENTACAO' && r.data?.volumeMl)
            .reduce((sum, r) => sum + (r.data?.volumeMl || 0), 0)

          const totalGeral = totalHidratacao + totalAlimentacao

          return totalGeral > 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-info/10 rounded-lg">
                    <Droplets className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total de Líquidos Ingeridos</h3>
                    <p className="text-2xl font-bold text-info">
                      {totalGeral} ml
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
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
          ) : null
        })()}

        {/* Resumo de Alimentação */}
        {records && records.length > 0 && (() => {
          const refeicoesEsperadas = ['Café da Manhã', 'Colação', 'Almoço', 'Lanche', 'Jantar', 'Ceia']
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

          // Define cor baseada no percentual total usando Design System
          const getColor = (percentual: number) => {
            if (percentual >= 75) return { bg: 'bg-success/10', text: 'text-success' }
            if (percentual >= 50) return { bg: 'bg-warning/10', text: 'text-warning' }
            return { bg: 'bg-danger/10', text: 'text-danger' }
          }
          const color = getColor(percentualTotal)

          return (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 ${color.bg} rounded-lg`}>
                    <Utensils className={`h-6 w-6 ${color.text}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Aceitação Alimentar Total</h3>
                    <p className={`text-2xl font-bold ${color.text}`}>
                      {percentualTotal}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {registrosAlimentacao.length} de {refeicoesEsperadas.length} refeições registradas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Layout em 3 colunas: Tarefas do Dia (1/3) + Timeline (1/3) + Adicionar Registro (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Tarefas do Dia (1/3) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Tarefas do Dia</h2>
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Em breve</p>
                <p className="text-xs mt-1">Lista de tarefas aparecerá aqui</p>
              </div>
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
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={residentId}
          residentName={resident?.fullName || ''}
          date={selectedDate}
          currentUserName={user?.name || ''}
          existingRecords={records.filter((r) => r.type === 'ALIMENTACAO')}
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
