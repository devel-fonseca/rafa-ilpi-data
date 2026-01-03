import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Clock,
  UserCircle,
  FileEdit,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Eye,
  MessageSquare,
  Activity
} from 'lucide-react'
import { useAlertHistory } from '@/hooks/useVitalSignAlerts'
import type { VitalSignAlertHistoryEntry } from '@/api/vitalSignAlerts.api'

interface AlertHistoryTimelineProps {
  alertId: string
}

export function AlertHistoryTimeline({ alertId }: AlertHistoryTimelineProps) {
  const { data: history, isLoading, error } = useAlertHistory(alertId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <span>Erro ao carregar histórico. Tente novamente.</span>
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
        <Clock className="h-4 w-4" />
        <span>Nenhum histórico disponível</span>
      </div>
    )
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'CREATED':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'STATUS_CHANGED':
        return <Activity className="h-4 w-4 text-purple-500" />
      case 'ASSIGNED':
        return <UserCheck className="h-4 w-4 text-green-500" />
      case 'NOTES_ADDED':
        return <MessageSquare className="h-4 w-4 text-orange-500" />
      case 'ACTION_TAKEN':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'UPDATED':
        return <FileEdit className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getChangeLabel = (changeType: string) => {
    switch (changeType) {
      case 'CREATED':
        return 'Alerta Criado'
      case 'STATUS_CHANGED':
        return 'Status Alterado'
      case 'ASSIGNED':
        return 'Profissional Atribuído'
      case 'NOTES_ADDED':
        return 'Notas Adicionadas'
      case 'ACTION_TAKEN':
        return 'Ações Registradas'
      case 'UPDATED':
        return 'Alerta Atualizado'
      default:
        return 'Alteração'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativo'
      case 'IN_TREATMENT':
        return 'Em Tratamento'
      case 'MONITORING':
        return 'Monitorando'
      case 'RESOLVED':
        return 'Resolvido'
      case 'IGNORED':
        return 'Ignorado'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-red-500'
      case 'IN_TREATMENT':
        return 'bg-yellow-500'
      case 'MONITORING':
        return 'bg-blue-500'
      case 'RESOLVED':
        return 'bg-green-500'
      case 'IGNORED':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Histórico de Alterações
      </h4>

      <div className="space-y-3">
        {history.map((entry: VitalSignAlertHistoryEntry, index: number) => (
          <Card key={entry.id} className="relative overflow-hidden">
            {/* Indicador de linha temporal */}
            {index < history.length - 1 && (
              <div className="absolute left-[21px] top-12 bottom-0 w-[2px] bg-border" />
            )}

            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Ícone */}
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  {getChangeIcon(entry.changeType)}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getChangeLabel(entry.changeType)}
                        </Badge>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(entry.status)}`} />
                          <span className="text-xs text-muted-foreground">
                            {getStatusLabel(entry.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserCircle className="h-3 w-3" />
                        <span className="font-medium">{entry.changedBy.name}</span>
                        {entry.changedBy.positionCode && (
                          <span className="text-muted-foreground/70">
                            ({entry.changedBy.positionCode})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDateTimeSafe(entry.changedAt)}
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="space-y-2 text-sm">
                    {/* Profissional atribuído */}
                    {entry.assignedTo && (
                      <div className="flex items-start gap-2 text-xs">
                        <UserCheck className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Atribuído para: </span>
                          <span className="font-medium">{entry.assignedTo.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Notas médicas */}
                    {entry.medicalNotes && (
                      <div className="flex items-start gap-2 text-xs">
                        <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground">Notas: </span>
                          <p className="mt-1 text-foreground/80 whitespace-pre-wrap">
                            {entry.medicalNotes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ações tomadas */}
                    {entry.actionTaken && (
                      <div className="flex items-start gap-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground">Ações: </span>
                          <p className="mt-1 text-foreground/80 whitespace-pre-wrap">
                            {entry.actionTaken}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Motivo da alteração */}
                    {entry.changeReason && (
                      <div className="flex items-start gap-2 text-xs">
                        <Eye className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground">Motivo: </span>
                          <p className="mt-1 text-foreground/80 italic">
                            {entry.changeReason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
