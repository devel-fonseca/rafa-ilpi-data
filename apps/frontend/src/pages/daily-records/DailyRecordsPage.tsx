import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateLong, getCurrentDateLocal } from '@/utils/timezone'
import { Download, Plus, Loader2, User, Calendar, Droplets, Utensils, ArrowLeft, Eye } from 'lucide-react'
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
import { IntercorrenciaModal } from './modals/IntercorrenciaModal'
import { AtividadesModal } from './modals/AtividadesModal'
import { VisitaModal } from './modals/VisitaModal'
import { OutrosModal } from './modals/OutrosModal'
import { ResidentSelectionGrid } from '@/components/residents/ResidentSelectionGrid'
import { useLatestRecordsByResidents } from '@/hooks/useDailyRecords'
import { RECORD_TYPE_LABELS, renderRecordSummary } from '@/utils/recordTypeLabels'
import { DailyRecordsOverviewStats } from './components/DailyRecordsOverviewStats'
import {
import { getErrorMessage } from '@/utils/errorHandling'
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
      <div className="grid grid-cols-2 gap-6 mb-8">
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

      {/* Botões de Ação */}
      <div className="mb-8">
        <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">Adicionar Registro</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveModal('HIGIENE')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Higiene
            </Button>
            <Button onClick={() => setActiveModal('ALIMENTACAO')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Alimentação
            </Button>
            <Button onClick={() => setActiveModal('HIDRATACAO')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Hidratação
            </Button>
            <Button onClick={() => setActiveModal('MONITORAMENTO')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Monitoramento
            </Button>
            <Button onClick={() => setActiveModal('ELIMINACAO')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Eliminação
            </Button>
            <Button onClick={() => setActiveModal('COMPORTAMENTO')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Comportamento
            </Button>
            <Button onClick={() => setActiveModal('INTERCORRENCIA')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Intercorrência
            </Button>
            <Button onClick={() => setActiveModal('ATIVIDADES')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Atividades
            </Button>
            <Button onClick={() => setActiveModal('VISITA')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Visita
            </Button>
            <Button onClick={() => setActiveModal('OUTROS')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Outros
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Timeline de Registros */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">Timeline do Dia</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Carregando registros...</span>
            </div>
          ) : records && records.length > 0 ? (
            <div className="space-y-2">
              {records.map((record: any) => (
                <div
                  key={record.id}
                  onClick={() => handleViewRecord(record)}
                  className={`border-l-4 pl-4 py-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] rounded-r-md ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-gray-100'}`}
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
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum registro para este dia</p>
              <p className="text-sm mt-1">Clique em um dos botões acima para adicionar</p>
            </div>
          )}
        </CardContent>
      </Card>

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
