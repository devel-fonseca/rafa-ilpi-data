import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import type { Resident } from '@/api/residents.api'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { formatBedFromResident } from '@/utils/formatters'
import { PhotoViewer } from '@/components/form/PhotoViewer'

interface ResidentAlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: 'critical' | 'warning' | 'info'
  residents: Resident[]
}

export function ResidentAlertModal({
  isOpen,
  onClose,
  title,
  description,
  type,
  residents,
}: ResidentAlertModalProps) {
  const navigate = useNavigate()

  const handleResidentClick = (residentId: string) => {
    navigate(`/dashboard/residentes/${residentId}/view`)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getIcon()}
            <DialogTitle className={getTypeColor()}>{title}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {residents.map((resident) => (
              <div
                key={resident.id}
                onClick={() => handleResidentClick(resident.id)}
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
  )
}
