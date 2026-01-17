import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Loader2, History, Edit, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateTimeSafe, formatDateLongSafe } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Page, PageHeader } from '@/design-system/components'
import { tenantKey } from '@/lib/query-keys'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/services/api'
import { RecordCalendar } from '@/components/calendar/RecordCalendar'
import { useResidentRecordDates } from '@/hooks/useResidentRecordDates'
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels'
import { DailyRecordHistoryModal } from '@/components/DailyRecordHistoryModal'
import { dailyRecordsAPI, type DailyRecord, type RecordType } from '@/api/dailyRecords.api'
import { toast } from 'sonner'
import { getErrorMessage } from '@/utils/errorHandling'
import {
  EditAlimentacaoModal,
  EditMonitoramentoModal,
  EditHigieneModal,
  EditHidratacaoModal,
  EditEliminacaoModal,
  EditComportamentoModal,
  EditHumorModal,
  EditSonoModal,
  EditPesoModal,
  EditIntercorrenciaModal,
  EditAtividadesModal,
  EditVisitaModal,
  EditOutrosModal,
} from '@/components/edit-modals'
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

export default function ResidentDailyRecordsCalendar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  // Edit states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<DailyRecord | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // View states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<DailyRecord | null>(null)

  const handleOpenHistory = (recordId: string) => {
    setSelectedRecordId(recordId)
    setHistoryModalOpen(true)
  }

  const handleOpenEdit = (record: DailyRecord) => {
    setEditingRecord(record)
    setEditModalOpen(true)
  }

  const handleOpenDelete = (record: DailyRecord) => {
    setDeletingRecord(record)
    setDeleteReason('')
    setDeleteModalOpen(true)
  }

  const handleViewRecord = (record: DailyRecord) => {
    setViewingRecord(record)
    setViewModalOpen(true)
  }

  const handleConfirmEdit = async (payload: {
    type?: RecordType
    date?: string
    time?: string
    data?: Record<string, unknown>
    recordedBy?: string
    notes?: string
    editReason: string
  }) => {
    if (!editingRecord) {
      toast.error('Nenhum registro selecionado para edição')
      return
    }

    try {
      setIsUpdating(true)
      await dailyRecordsAPI.update(editingRecord.id, payload)

      toast.success('Registro atualizado com sucesso')
      setEditModalOpen(false)
      setEditingRecord(null)
      refetchRecords()
    } catch (err: unknown) {
      console.error('Erro ao atualizar registro:', err)
      toast.error(getErrorMessage(err, 'Erro ao atualizar registro'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingRecord || deleteReason.length < 10) {
      toast.error('O motivo da exclusão deve ter pelo menos 10 caracteres')
      return
    }

    try {
      setIsDeleting(true)
      await dailyRecordsAPI.delete(deletingRecord.id, deleteReason)

      toast.success('Registro excluído com sucesso')
      setDeleteModalOpen(false)
      setDeletingRecord(null)
      setDeleteReason('')
      refetchRecords()
    } catch (err: unknown) {
      console.error('Erro ao excluir registro:', err)
      toast.error(getErrorMessage(err, 'Erro ao excluir registro'))
    } finally {
      setIsDeleting(false)
    }
  }

  // Buscar dados do residente
  const { data: resident, isLoading: isLoadingResident } = useQuery({
    queryKey: tenantKey('residents', id),
    queryFn: async () => {
      const response = await api.get(`/residents/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  // Buscar datas com registros para o mês atual visualizado no calendário
  const { data: datesWithRecords = [], isLoading: isLoadingDates } = useResidentRecordDates(
    id,
    currentYear,
    currentMonth,
  )

  // Handler para quando o usuário navega entre meses no calendário
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  // Buscar registros do dia selecionado
  const { data: records = [], isLoading: isLoadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: tenantKey('daily-records', 'resident', id, format(selectedDate, 'yyyy-MM-dd')),
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${id}/date/${format(selectedDate, 'yyyy-MM-dd')}`,
      )
      return response.data
    },
    enabled: !!id,
  })

  const handleRecordUpdated = () => {
    // Recarregar registros após restauração
    refetchRecords()
  }

  if (isLoadingResident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Page>
      <PageHeader
        title={resident?.fullName || 'Residente'}
        subtitle="Registros Diários - Calendário"
        onBack={() => navigate(`/dashboard/residentes/${id}`)}
      />

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Calendário */}
        <div>
          <RecordCalendar
            datesWithRecords={datesWithRecords}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onMonthChange={handleMonthChange}
            isLoading={isLoadingDates}
          />
        </div>

        {/* Coluna 2: Registros do Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecords ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length > 0 ? (
              <div className="space-y-2">
                {records.map((record: DailyRecord) => (
                  <div
                    key={record.id}
                    className={`border-l-4 pl-4 py-2 rounded-r-md ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-muted'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Conteúdo principal - clicável para visualizar */}
                      <div
                        className="flex flex-col gap-1 flex-1 cursor-pointer"
                        onClick={() => handleViewRecord(record)}
                      >
                        {/* Linha 1: Horário, Badge e Ícone */}
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-base min-w-[50px]">{record.time}</span>
                          <Badge
                            variant="outline"
                            className={`${RECORD_TYPE_LABELS[record.type]?.color} text-xs`}
                          >
                            {RECORD_TYPE_LABELS[record.type]?.label}
                          </Badge>
                          <Eye className="h-4 w-4 text-muted-foreground ml-auto" />
                        </div>

                        {/* Linha 2: Informações de quem e quando registrou */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Registrado por {record.recordedBy}</span>
                          <span>•</span>
                          <span>{formatDateTimeSafe(record.createdAt)}</span>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(record)
                          }}
                          className="h-7 w-7 p-0"
                          title="Editar registro"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenHistory(record.id)
                          }}
                          className="h-7 w-7 p-0"
                          title="Ver histórico de alterações"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDelete(record)
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Excluir registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <div className="text-muted-foreground font-medium">Nenhum registro encontrado</div>
                <p className="text-sm text-muted-foreground/70 text-center max-w-sm">
                  Selecione uma data com indicador verde para visualizar registros
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Histórico */}
      {selectedRecordId && (
        <DailyRecordHistoryModal
          recordId={selectedRecordId}
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          onRecordUpdated={handleRecordUpdated}
        />
      )}

      {/* Modais de Edição Específicos por Tipo */}
      {editingRecord?.type === 'ALIMENTACAO' && (
        <EditAlimentacaoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'MONITORAMENTO' && (
        <EditMonitoramentoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'HIGIENE' && (
        <EditHigieneModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'HIDRATACAO' && (
        <EditHidratacaoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'ELIMINACAO' && (
        <EditEliminacaoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'COMPORTAMENTO' && (
        <EditComportamentoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'HUMOR' && (
        <EditHumorModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'SONO' && (
        <EditSonoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'PESO' && (
        <EditPesoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'INTERCORRENCIA' && (
        <EditIntercorrenciaModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'ATIVIDADES' && (
        <EditAtividadesModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'VISITA' && (
        <EditVisitaModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'OUTROS' && (
        <EditOutrosModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleConfirmEdit}
          record={editingRecord}
          isUpdating={isUpdating}
        />
      )}

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Registro
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O registro será marcado como excluído e salvo no histórico para fins de auditoria.
            </DialogDescription>
          </DialogHeader>

          {deletingRecord && (
            <div className="space-y-4 py-4">
              {/* Informações do registro */}
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={RECORD_TYPE_LABELS[deletingRecord.type]?.color}
                  >
                    {RECORD_TYPE_LABELS[deletingRecord.type]?.label}
                  </Badge>
                  <span className="text-sm font-semibold">{deletingRecord.time}</span>
                </div>
                <p className="text-sm">
                  {formatDateLongSafe(deletingRecord.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Registrado por: {deletingRecord.recordedBy}
                </p>
              </div>

              {/* Campo Motivo da Exclusão */}
              <div className="space-y-2">
                <Label htmlFor="deleteReason" className="text-sm font-medium">
                  Motivo da exclusão <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="deleteReason"
                  placeholder="Descreva o motivo da exclusão (mínimo 10 caracteres)..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {deleteReason.length}/10 caracteres mínimos
                </p>
              </div>

              {deleteReason.length > 0 && deleteReason.length < 10 && (
                <p className="text-xs text-destructive">
                  O motivo deve ter pelo menos 10 caracteres
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting || deleteReason.length < 10}
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </Page>
  )
}
