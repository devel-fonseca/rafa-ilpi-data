import { useState } from 'react'
import { MoreVertical, Edit, Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DailyRecord } from '@/api/dailyRecords.api'
import { EditDailyRecordModal } from '../modals/EditDailyRecordModal'
import { DeleteDailyRecordModal } from '../modals/DeleteDailyRecordModal'
import { DailyRecordHistoryModal } from '@/components/DailyRecordHistoryModal'

interface DailyRecordActionsProps {
  record: DailyRecord
  onActionComplete?: () => void
}

/**
 * Componente de ações para Daily Records
 * Fornece botões de edição, exclusão e visualização de histórico com validação de changeReason
 *
 * Features:
 * - Edição com validação de editReason (min 10 chars)
 * - Exclusão com validação de deleteReason (min 10 chars)
 * - Visualização de histórico completo de auditoria
 *
 * @example
 * ```tsx
 * <DailyRecordActions
 *   record={record}
 *   onActionComplete={() => {
 *     queryClient.invalidateQueries(['daily-records'])
 *   }}
 * />
 * ```
 */
export function DailyRecordActions({ record, onActionComplete }: DailyRecordActionsProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const handleSuccess = () => {
    onActionComplete?.()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setHistoryModalOpen(true)}>
            <History className="mr-2 h-4 w-4" />
            Ver Histórico
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Registro
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteModalOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Registro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modais */}
      <EditDailyRecordModal
        record={record}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={handleSuccess}
      />

      <DeleteDailyRecordModal
        record={record}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleSuccess}
      />

      <DailyRecordHistoryModal
        recordId={record.id}
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        onRecordUpdated={handleSuccess}
      />
    </>
  )
}
