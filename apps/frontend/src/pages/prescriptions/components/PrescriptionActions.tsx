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
import { Prescription } from '@/api/prescriptions.api'
import { EditPrescriptionModal } from '../modals/EditPrescriptionModal'
import { DeletePrescriptionModal } from '../modals/DeletePrescriptionModal'
import { PrescriptionHistoryModal } from '@/components/PrescriptionHistoryModal'
import { usePermissions } from '@/hooks/usePermissions'

interface PrescriptionActionsProps {
  prescription: Prescription
  onActionComplete?: () => void
}

/**
 * Componente de ações para Prescriptions
 * Fornece botões de edição, exclusão e visualização de histórico com validação de changeReason
 *
 * Features:
 * - Edição com validação de changeReason (min 10 chars)
 * - Exclusão com validação de deleteReason (min 10 chars)
 * - Visualização de histórico completo de auditoria
 *
 * @example
 * ```tsx
 * <PrescriptionActions
 *   prescription={prescription}
 *   onActionComplete={() => {
 *     queryClient.invalidateQueries(['prescriptions'])
 *   }}
 * />
 * ```
 */
export function PrescriptionActions({
  prescription,
  onActionComplete,
}: PrescriptionActionsProps) {
  const { isTechnicalManager } = usePermissions()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  // Apenas RT pode editar e excluir prescrições
  const canManagePrescriptions = isTechnicalManager()

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
          {canManagePrescriptions && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Prescrição
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteModalOpen(true)}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Prescrição
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modais */}
      {canManagePrescriptions && (
        <>
          <EditPrescriptionModal
            prescription={prescription}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onSuccess={handleSuccess}
          />

          <DeletePrescriptionModal
            prescription={prescription}
            open={deleteModalOpen}
            onOpenChange={setDeleteModalOpen}
            onSuccess={handleSuccess}
          />
        </>
      )}

      <PrescriptionHistoryModal
        prescriptionId={prescription.id}
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        onPrescriptionUpdated={handleSuccess}
      />
    </>
  )
}
