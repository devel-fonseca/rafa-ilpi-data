import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Resident } from '@/api/residents.api'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { formatBedFromResident } from '@/utils/formatters'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { AssignBedDialog } from '@/components/beds/AssignBedDialog'
import { AssignGuardianDialog } from '@/components/residents/AssignGuardianDialog'
import { AssignEmergencyContactDialog } from '@/components/residents/AssignEmergencyContactDialog'
import { tenantKey } from '@/lib/query-keys'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { toast } from 'sonner'

interface ResidentAlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: 'critical' | 'warning' | 'info'
  residents: Resident[]
  actionType?: 'assign-bed' | 'assign-guardian' | 'assign-emergency-contact'
}

export function ResidentAlertModal({
  isOpen,
  onClose,
  title,
  description,
  type,
  residents,
  actionType,
}: ResidentAlertModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canUpdateResidents = hasPermission(PermissionType.UPDATE_RESIDENTS)
  const [assignBedResident, setAssignBedResident] = useState<Resident | null>(null)
  const [assignGuardianResident, setAssignGuardianResident] = useState<Resident | null>(null)
  const [assignContactResident, setAssignContactResident] = useState<Resident | null>(null)

  const handleResidentClick = (resident: Resident) => {
    if (actionType && !canUpdateResidents) {
      toast.error('Sem permissão', {
        description: 'Você não tem permissão para editar cadastros de residentes.',
      })
      return
    }

    if (actionType === 'assign-bed') {
      setAssignBedResident(resident)
    } else if (actionType === 'assign-guardian') {
      setAssignGuardianResident(resident)
    } else if (actionType === 'assign-emergency-contact') {
      setAssignContactResident(resident)
    } else {
      navigate(`/dashboard/residentes/${resident.id}/view`)
      onClose()
    }
  }

  const handleAssignBedSuccess = () => {
    queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
    queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
    queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
    onClose()
  }

  const handleAssignGuardianSuccess = () => {
    queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
    queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
    onClose()
  }

  const handleAssignContactSuccess = () => {
    queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
    queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
    onClose()
  }

  const getIcon = () => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-danger" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case 'info':
        return <Info className="h-5 w-5 text-primary" />
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case 'critical':
        return 'text-danger'
      case 'warning':
        return 'text-warning'
      case 'info':
        return 'text-primary'
    }
  }

  const modalTitle = actionType === 'assign-bed'
    ? 'Atribuir leito'
    : actionType === 'assign-guardian'
      ? 'Cadastrar responsável legal'
      : actionType === 'assign-emergency-contact'
        ? 'Cadastrar contato de emergência'
        : title
  const modalDescription = actionType === 'assign-bed'
    ? 'Selecione um residente para atribuir um leito disponível.'
    : actionType === 'assign-guardian'
      ? 'Selecione um residente para cadastrar o responsável legal.'
      : actionType === 'assign-emergency-contact'
        ? 'Selecione um residente para cadastrar o contato de emergência.'
        : description

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {getIcon()}
              <DialogTitle className={getTypeColor()}>{modalTitle}</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">{modalDescription}</p>
            {actionType && !canUpdateResidents && (
              <p className="text-xs text-danger mt-1">
                Você não tem permissão para editar cadastros de residentes.
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {residents.map((resident) => (
                <div
                  key={resident.id}
                  onClick={() => handleResidentClick(resident)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <PhotoViewer
                    photoUrl={resident.fotoUrl}
                    altText={resident.fullName}
                    size="sm"
                    rounded={true}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{resident.fullName || 'Nome não informado'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {resident.bedId && (
                        <span className="font-mono">
                          {formatBedFromResident(resident)}
                        </span>
                      )}
                      {resident.bedId && resident.cpf && <span>•</span>}
                      {resident.cpf && <span>CPF: {resident.cpf}</span>}
                    </div>
                  </div>

                  <Badge variant={resident.status === 'Ativo' ? 'default' : 'secondary'}>
                    {resident.status || 'N/A'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t text-sm text-muted-foreground">
            Total: <span className="font-semibold">{residents.length}</span>{' '}
            {residents.length === 1 ? 'residente' : 'residentes'}
          </div>
        </DialogContent>
      </Dialog>

      {assignBedResident && (
        <AssignBedDialog
          open={!!assignBedResident}
          onOpenChange={(open) => {
            if (!open) setAssignBedResident(null)
          }}
          residentId={assignBedResident.id}
          residentName={assignBedResident.fullName}
          onSuccess={handleAssignBedSuccess}
        />
      )}

      {assignGuardianResident && (
        <AssignGuardianDialog
          open={!!assignGuardianResident}
          onOpenChange={(open) => {
            if (!open) setAssignGuardianResident(null)
          }}
          residentId={assignGuardianResident.id}
          residentName={assignGuardianResident.fullName}
          onSuccess={handleAssignGuardianSuccess}
        />
      )}

      {assignContactResident && (
        <AssignEmergencyContactDialog
          open={!!assignContactResident}
          onOpenChange={(open) => {
            if (!open) setAssignContactResident(null)
          }}
          residentId={assignContactResident.id}
          residentName={assignContactResident.fullName}
          onSuccess={handleAssignContactSuccess}
        />
      )}
    </>
  )
}
