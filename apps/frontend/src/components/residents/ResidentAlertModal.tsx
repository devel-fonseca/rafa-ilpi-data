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
import { AssignPhotoDialog } from '@/components/residents/AssignPhotoDialog'
import { AnthropometryModal } from '@/components/clinical-data/AnthropometryModal'
import { tenantKey } from '@/lib/query-keys'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import { extractDateOnly } from '@/utils/dateHelpers'

interface ResidentAlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: 'critical' | 'warning' | 'info'
  residents: Resident[]
  alertFilter?: string
  actionType?:
    | 'assign-bed'
    | 'assign-guardian'
    | 'assign-emergency-contact'
    | 'register-anthropometry'
    | 'upload-photo'
}

export function ResidentAlertModal({
  isOpen,
  onClose,
  title,
  description,
  type,
  residents,
  alertFilter,
  actionType,
}: ResidentAlertModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canUpdateResidents = hasPermission(PermissionType.UPDATE_RESIDENTS)
  const canViewClinicalProfile = hasPermission(PermissionType.VIEW_CLINICAL_PROFILE)
  const canUpdateClinicalProfile = hasPermission(PermissionType.UPDATE_CLINICAL_PROFILE)
  const canCreateClinicalProfile = hasPermission(PermissionType.CREATE_CLINICAL_PROFILE)
  const canRegisterAnthropometry =
    canViewClinicalProfile && (canUpdateClinicalProfile || canCreateClinicalProfile)
  const [assignBedResident, setAssignBedResident] = useState<Resident | null>(null)
  const [assignGuardianResident, setAssignGuardianResident] = useState<Resident | null>(null)
  const [assignContactResident, setAssignContactResident] = useState<Resident | null>(null)
  const [anthropometryResident, setAnthropometryResident] = useState<Resident | null>(null)
  const [uploadPhotoResident, setUploadPhotoResident] = useState<Resident | null>(null)

  const handleResidentClick = (resident: Resident) => {
    const needsResidentUpdatePermission =
      actionType === 'assign-bed' ||
      actionType === 'assign-guardian' ||
      actionType === 'assign-emergency-contact' ||
      actionType === 'upload-photo'

    if (needsResidentUpdatePermission && !canUpdateResidents) {
      toast.error('Sem permissão', {
        description: 'Você não tem permissão para editar cadastros de residentes.',
      })
      return
    }

    if (actionType === 'register-anthropometry' && !canRegisterAnthropometry) {
      toast.error('Sem permissão', {
        description: 'Você não tem permissão para registrar antropometria no prontuário.',
      })
      return
    }

    if (actionType === 'assign-bed') {
      setAssignBedResident(resident)
    } else if (actionType === 'assign-guardian') {
      setAssignGuardianResident(resident)
    } else if (actionType === 'assign-emergency-contact') {
      setAssignContactResident(resident)
    } else if (actionType === 'upload-photo') {
      setUploadPhotoResident(resident)
    } else if (actionType === 'register-anthropometry') {
      setAnthropometryResident(resident)
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

  const handleAnthropometrySuccess = () => {
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

  const isBirthdayAlert = alertFilter === 'birthdays-month'

  const getBirthdayDetails = (resident: Resident) => {
    if (!resident.birthDate) return null

    const dayKey = extractDateOnly(resident.birthDate)
    const [year, month, day] = dayKey.split('-').map(Number)
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
    const birthdayThisYear = new Date(today.getFullYear(), month - 1, day, 12, 0, 0, 0)

    const hasBirthdayPassed = birthdayThisYear < today
    const isBirthdayToday = birthdayThisYear.getTime() === today.getTime()
    const currentAge =
      today.getFullYear() -
      year -
      (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0)

    const dateLabel = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`

    if (isBirthdayToday) {
      return `Aniversário: ${dateLabel} • Idade: ${currentAge} anos • Completa hoje`
    }

    if (!hasBirthdayPassed) {
      return `Aniversário: ${dateLabel} • Idade atual: ${currentAge} anos • Completa ${currentAge + 1}`
    }

    return `Aniversário: ${dateLabel} • Idade: ${currentAge} anos • Completou neste mês`
  }

  const modalTitle = actionType === 'assign-bed'
    ? 'Atribuir leito'
    : actionType === 'assign-guardian'
        ? 'Cadastrar responsável legal'
      : actionType === 'assign-emergency-contact'
        ? 'Cadastrar contato de emergência'
        : actionType === 'upload-photo'
          ? 'Enviar foto do residente'
        : actionType === 'register-anthropometry'
          ? 'Registrar antropometria'
        : title
  const modalDescription = actionType === 'assign-bed'
    ? 'Selecione um residente para atribuir um leito disponível.'
    : actionType === 'assign-guardian'
      ? 'Selecione um residente para cadastrar o responsável legal.'
      : actionType === 'assign-emergency-contact'
        ? 'Selecione um residente para adicionar ou completar o contato de emergência.'
        : actionType === 'upload-photo'
          ? 'Selecione um residente para enviar a foto.'
        : actionType === 'register-anthropometry'
          ? 'Selecione um residente para registrar peso e altura.'
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
            {(actionType === 'assign-bed' ||
              actionType === 'assign-guardian' ||
              actionType === 'assign-emergency-contact') &&
              !canUpdateResidents && (
              <p className="text-xs text-danger mt-1">
                Você não tem permissão para editar cadastros de residentes.
              </p>
            )}
            {actionType === 'register-anthropometry' && !canRegisterAnthropometry && (
              <p className="text-xs text-danger mt-1">
                Você não tem permissão para registrar antropometria no prontuário.
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
                    {isBirthdayAlert && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {getBirthdayDetails(resident) || 'Data de aniversário não informada'}
                      </p>
                    )}
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

      {anthropometryResident && (
        <AnthropometryModal
          open={!!anthropometryResident}
          onOpenChange={(open) => {
            if (!open) setAnthropometryResident(null)
          }}
          residentId={anthropometryResident.id}
          onSuccess={handleAnthropometrySuccess}
        />
      )}

      {uploadPhotoResident && (
        <AssignPhotoDialog
          open={!!uploadPhotoResident}
          onOpenChange={(open) => {
            if (!open) setUploadPhotoResident(null)
          }}
          residentId={uploadPhotoResident.id}
          residentName={uploadPhotoResident.fullName}
          currentPhotoUrl={uploadPhotoResident.fotoUrl}
          onSuccess={handleAssignContactSuccess}
        />
      )}
    </>
  )
}
