import { History, Clock, User, FileText, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { prescriptionsApi, type PrescriptionHistoryEntry } from '@/api/prescriptions.api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PrescriptionHistoryModalProps {
  prescriptionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrescriptionUpdated?: () => void
}

/**
 * Modal para visualizar histórico completo de versões de uma prescrição
 * Exibe todas alterações com audit trail detalhado
 *
 * @example
 * ```tsx
 * <PrescriptionHistoryModal
 *   prescriptionId={prescription.id}
 *   open={historyModalOpen}
 *   onOpenChange={setHistoryModalOpen}
 *   onPrescriptionUpdated={() => queryClient.invalidateQueries(['prescriptions'])}
 * />
 * ```
 */
export function PrescriptionHistoryModal({
  prescriptionId,
  open,
  onOpenChange,
}: PrescriptionHistoryModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['prescription-history', prescriptionId],
    queryFn: async () => {
      const response = await prescriptionsApi.getHistory(prescriptionId)
      return response.data
    },
    enabled: open && !!prescriptionId,
  })

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return 'Criação'
      case 'UPDATE':
        return 'Edição'
      case 'DELETE':
        return 'Exclusão'
      default:
        return changeType
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Visualize todas as alterações registradas nesta prescrição médica conforme RDC
            502/2021 (ANVISA)
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não foi possível carregar o histórico. Tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {data && (
          <div className="space-y-6">
            {/* Informações da Prescrição */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium text-sm mb-2">Prescrição Atual:</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Médico:</dt>
                <dd className="font-medium">{data.prescription.doctorName}</dd>

                <dt className="text-muted-foreground">CRM:</dt>
                <dd>
                  {data.prescription.doctorCrm}/{data.prescription.doctorCrmState}
                </dd>

                <dt className="text-muted-foreground">Tipo:</dt>
                <dd>{data.prescription.prescriptionType}</dd>

                <dt className="text-muted-foreground">Total de Versões:</dt>
                <dd className="font-medium">{data.totalVersions}</dd>
              </dl>
            </div>

            {/* Timeline de Versões */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Timeline de Alterações:</h4>

              {data.history.map((entry: PrescriptionHistoryEntry, index: number) => (
                <div
                  key={entry.id}
                  className={`relative pl-8 pb-4 ${
                    index !== data.history.length - 1 ? 'border-l-2 border-gray-200' : ''
                  }`}
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300" />

                  {/* Version Card */}
                  <div className="rounded-lg border p-4 space-y-3 bg-white shadow-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getChangeTypeColor(entry.changeType)}>
                            {getChangeTypeLabel(entry.changeType)}
                          </Badge>
                          <span className="text-sm font-medium">
                            Versão {entry.versionNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(entry.changedAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{entry.changedBy.name}</span>
                      <span className="text-muted-foreground">({entry.changedBy.email})</span>
                    </div>

                    {/* Change Reason */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        Motivo da {entry.changeType === 'UPDATE' ? 'Edição' : 'Exclusão'}:
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{entry.changeReason}</p>
                    </div>

                    {/* Changed Fields */}
                    {entry.changedFields.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Campos Alterados:</p>
                        <div className="flex flex-wrap gap-1 pl-6">
                          {entry.changedFields.map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {(entry.ipAddress || entry.userAgent) && (
                      <div className="text-xs text-muted-foreground space-y-1 pl-6">
                        {entry.ipAddress && <p>IP: {entry.ipAddress}</p>}
                        {entry.userAgent && (
                          <p className="truncate" title={entry.userAgent}>
                            Navegador: {entry.userAgent}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance Footer */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p>✓ Histórico de auditoria conforme RDC 502/2021 Art. 39 (ANVISA)</p>
              <p>✓ Rastreabilidade completa para conformidade com LGPD Art. 48</p>
              <p>
                ✓ Todos os registros são imutáveis e preservados permanentemente no banco de dados
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
