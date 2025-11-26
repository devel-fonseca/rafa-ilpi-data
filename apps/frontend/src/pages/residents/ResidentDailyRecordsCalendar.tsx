import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Loader2, History, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { RecordCalendar } from '@/components/calendar/RecordCalendar'
import { useResidentRecordDates } from '@/hooks/useResidentRecordDates'
import { RECORD_TYPE_LABELS, renderRecordSummary } from '@/utils/recordTypeLabels'
import { DailyRecordHistoryModal } from '@/components/DailyRecordHistoryModal'
import { dailyRecordsAPI } from '@/api/dailyRecords.api'
import { toast } from 'sonner'
import {
  EditAlimentacaoModal,
  EditMonitoramentoModal,
  EditHigieneModal,
  EditHidratacaoModal,
  EditEliminacaoModal,
  EditComportamentoModal,
  EditIntercorrenciaModal,
  EditAtividadesModal,
  EditVisitaModal,
  EditOutrosModal,
} from '@/components/edit-modals'

export default function ResidentDailyRecordsCalendar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  // Edit states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleOpenHistory = (recordId: string) => {
    setSelectedRecordId(recordId)
    setHistoryModalOpen(true)
  }

  const handleOpenEdit = (record: any) => {
    setEditingRecord(record)
    setEditModalOpen(true)
  }

  const handleOpenDelete = (record: any) => {
    setDeletingRecord(record)
    setDeleteReason('')
    setDeleteModalOpen(true)
  }

  const handleConfirmEdit = async (payload: any) => {
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
    } catch (err: any) {
      console.error('Erro ao atualizar registro:', err)
      toast.error(err.response?.data?.message || 'Erro ao atualizar registro')
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
    } catch (err: any) {
      console.error('Erro ao excluir registro:', err)
      toast.error(err.response?.data?.message || 'Erro ao excluir registro')
    } finally {
      setIsDeleting(false)
    }
  }

  // Buscar dados do residente
  const { data: resident, isLoading: isLoadingResident } = useQuery({
    queryKey: ['resident', id],
    queryFn: async () => {
      const response = await api.get(`/residents/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  // Buscar datas com registros para o mês selecionado
  const { data: datesWithRecords = [], isLoading: isLoadingDates } = useResidentRecordDates(
    id,
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
  )

  // Buscar registros do dia selecionado
  const { data: records = [], isLoading: isLoadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['daily-records', id, format(selectedDate, 'yyyy-MM-dd')],
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/residentes/${id}`)}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{resident?.fullName || 'Residente'}</h1>
          <p className="text-sm text-gray-600">Registros Diários - Calendário</p>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Calendário */}
        <div>
          <RecordCalendar
            datesWithRecords={datesWithRecords}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
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
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : records.length > 0 ? (
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
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(record)}
                          className="h-8 w-8 p-0"
                          title="Editar registro"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenHistory(record.id)}
                          className="h-8 w-8 p-0"
                          title="Ver histórico de alterações"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(record)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Excluir registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Calendar className="h-12 w-12 text-gray-300" />
                <div className="text-gray-500 font-medium">Nenhum registro encontrado</div>
                <p className="text-sm text-gray-400 text-center max-w-sm">
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
                  {format(new Date(deletingRecord.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
    </div>
  )
}
