import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { History, Clock, User, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { dailyRecordsAPI, type DailyRecordHistoryResponse } from '@/api/dailyRecords.api'
import { getRecordTypeConfig } from '@/design-system/tokens/colors'

interface DailyRecordHistoryModalProps {
  recordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DailyRecordHistoryModal({
  recordId,
  open,
  onOpenChange,
}: DailyRecordHistoryModalProps) {
  const [history, setHistory] = useState<DailyRecordHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && recordId) {
      loadHistory()
    }
  }, [open, recordId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dailyRecordsAPI.getHistory(recordId)
      setHistory(data)
    } catch (err: any) {
      console.error('Erro ao buscar histórico:', err)
      setError(err.response?.data?.message || 'Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const getChangeTypeLabel = (type: string) => {
    return type === 'UPDATE' ? 'Edição' : 'Exclusão'
  }

  const getChangeTypeBadgeVariant = (type: string) => {
    return type === 'UPDATE' ? 'default' : 'destructive'
  }

  const formatFieldName = (field: string) => {
    const fieldLabels: Record<string, string> = {
      type: 'Tipo',
      date: 'Data',
      time: 'Horário',
      data: 'Dados',
      recordedBy: 'Registrado por',
      notes: 'Observações',
      deletedAt: 'Excluído em',
    }
    return fieldLabels[field] || field
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Todas as alterações realizadas neste registro
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        {history && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <strong className="text-foreground">Total de versões:</strong> {history.totalVersions}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Tipo:</span>
                <Badge className={getRecordTypeConfig(history.recordType).bgColor}>
                  <span className={getRecordTypeConfig(history.recordType).color}>
                    {getRecordTypeConfig(history.recordType).label}
                  </span>
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-6">
              {history.history.map((version) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  {/* Cabeçalho da versão */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getChangeTypeBadgeVariant(version.changeType)}>
                          {getChangeTypeLabel(version.changeType)}
                        </Badge>
                        <span className="text-sm font-medium">
                          Versão #{version.versionNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{version.changedByName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(version.changedAt)}</span>
                    </div>
                  </div>

                  {/* Motivo da alteração */}
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Motivo:</p>
                        <p className="text-sm text-muted-foreground">
                          {version.changeReason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campos alterados */}
                  {version.changedFields.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Campos alterados:</p>
                      <div className="flex flex-wrap gap-1">
                        {version.changedFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {formatFieldName(field)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detalhes da alteração */}
                  {version.changeType === 'UPDATE' && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver detalhes técnicos
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                            Dados anteriores:
                          </p>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(version.previousData, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                            Dados novos:
                          </p>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(version.newData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
