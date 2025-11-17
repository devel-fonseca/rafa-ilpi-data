import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, Plus, Loader2, User, Calendar, Droplets, Utensils, ArrowLeft } from 'lucide-react'
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

const RECORD_TYPE_LABELS: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  HIGIENE: {
    label: 'Higiene',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
  },
  ALIMENTACAO: {
    label: 'Alimentação',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
  },
  HIDRATACAO: {
    label: 'Hidratação',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100 border-cyan-300',
  },
  MONITORAMENTO: {
    label: 'Monitoramento',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
  },
  ELIMINACAO: {
    label: 'Eliminação',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
  },
  COMPORTAMENTO: {
    label: 'Comportamento',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
  },
  INTERCORRENCIA: {
    label: 'Intercorrência',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
  },
  ATIVIDADES: {
    label: 'Atividades',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 border-indigo-300',
  },
  VISITA: {
    label: 'Visita',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100 border-pink-300',
  },
  OUTROS: {
    label: 'Outros',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100 border-slate-300',
  },
}

function renderRecordSummary(record: any): string {
  switch (record.type) {
    case 'HIGIENE':
      return `Banho: ${record.data.tipoBanho} | Pele: ${record.data.condicaoPele}`
    case 'ALIMENTACAO':
      return `${record.data.refeicao}: ${record.data.ingeriu}`
    case 'HIDRATACAO':
      return `Hidratação: ${record.data.volumeMl} ml${record.data.tipo ? ` (${record.data.tipo})` : ''}`
    case 'MONITORAMENTO':
      const vitals = []
      if (record.data.pressaoArterial) vitals.push(`PA: ${record.data.pressaoArterial}`)
      if (record.data.temperatura) vitals.push(`Temp: ${record.data.temperatura}°C`)
      if (record.data.frequenciaCardiaca) vitals.push(`FC: ${record.data.frequenciaCardiaca}`)
      if (record.data.saturacaoO2) vitals.push(`SpO2: ${record.data.saturacaoO2}%`)
      if (record.data.glicemia) vitals.push(`Glicemia: ${record.data.glicemia}`)
      return vitals.join(' | ') || 'Monitoramento realizado'
    case 'ELIMINACAO':
      return `${record.data.tipo}${record.data.frequencia ? ` (${record.data.frequencia}x)` : ''}`
    case 'COMPORTAMENTO':
      return record.data.descricao.substring(0, 80) + (record.data.descricao.length > 80 ? '...' : '')
    case 'INTERCORRENCIA':
      return `${record.data.descricao} - ${record.data.acaoTomada}`.substring(0, 80) + '...'
    case 'ATIVIDADES':
      return record.data.atividade
    case 'VISITA':
      return `Visitante: ${record.data.visitante}`
    case 'OUTROS':
      return record.data.descricao.substring(0, 80) + (record.data.descricao.length > 80 ? '...' : '')
    default:
      return 'Registro'
  }
}

export function DailyRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const residentId = searchParams.get('residentId')
  const selectedDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')

  const [activeModal, setActiveModal] = useState<string | null>(null)

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
      queryClient.invalidateQueries({ queryKey: ['daily-records'] })
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
    } catch (error: any) {
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
      <div className="space-y-6 p-6">
        <ResidentSelectionGrid
          residents={residentsData?.data || []}
          latestRecords={latestRecords}
          onSelectResident={handleResidentSelect}
          isLoading={isLoadingResidents || isLoadingLatest}
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
            {format(new Date(selectedDate + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
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
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                    <Droplets className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Total de Líquidos Ingeridos</h3>
                    <p className="text-2xl font-bold text-blue-600">
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

          // Define cor baseada no percentual total
          const getColor = (percentual: number) => {
            if (percentual >= 75) return { bg: 'bg-green-100', text: 'text-green-600' }
            if (percentual >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-600' }
            return { bg: 'bg-red-100', text: 'text-red-600' }
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
                    <h3 className="text-sm font-medium text-gray-600">Aceitação Alimentar Total</h3>
                    <p className={`text-2xl font-bold ${color.text}`}>
                      {percentualTotal}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
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
            <div className="space-y-4">
              {records.map((record: any) => (
                <div
                  key={record.id}
                  className={`border-l-4 pl-4 py-3 ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-gray-100'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg">{record.time}</span>
                        <Badge
                          variant="outline"
                          className={RECORD_TYPE_LABELS[record.type]?.color}
                        >
                          {RECORD_TYPE_LABELS[record.type]?.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-800 mb-1">
                        {renderRecordSummary(record)}
                      </div>
                      <p className="text-xs text-gray-600">
                        Registrado por: {record.recordedBy}
                      </p>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic border-l-2 border-gray-300 pl-2">
                          {record.notes}
                        </p>
                      )}
                    </div>
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
    </div>
  )
}

export default DailyRecordsPage
