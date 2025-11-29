import { useRecentActivity, type AuditLog } from '@/hooks/useAudit'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, UserPlus, Edit, Trash2, FileText, Users, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const entityTypeLabels: Record<string, string> = {
  RESIDENT: 'Residente',
  DAILY_RECORD: 'Registro Diário',
  PRESCRIPTION: 'Prescrição',
  VACCINATION: 'Vacinação',
  BUILDING: 'Prédio',
  FLOOR: 'Andar',
  ROOM: 'Quarto',
  BED: 'Leito',
  VITAL_SIGN: 'Sinal Vital',
  INSTITUTIONAL_PROFILE: 'Perfil Institucional',
}

const actionLabels: Record<string, string> = {
  CREATE: 'criou',
  UPDATE: 'atualizou',
  DELETE: 'excluiu',
  READ: 'visualizou',
}

const entityIcons: Record<string, any> = {
  RESIDENT: Users,
  DAILY_RECORD: Calendar,
  PRESCRIPTION: FileText,
  VACCINATION: FileText,
  BUILDING: Activity,
  FLOOR: Activity,
  ROOM: Activity,
  BED: Activity,
  VITAL_SIGN: Activity,
  INSTITUTIONAL_PROFILE: FileText,
}

const actionIcons: Record<string, any> = {
  CREATE: UserPlus,
  UPDATE: Edit,
  DELETE: Trash2,
  READ: Activity,
}

function getActivityIcon(log: AuditLog) {
  const ActionIcon = actionIcons[log.action] || Activity
  return <ActionIcon className="h-4 w-4" />
}

function getActivityColor(action: string) {
  const colors: Record<string, string> = {
    CREATE: 'text-green-600 bg-green-100',
    UPDATE: 'text-blue-600 bg-blue-100',
    DELETE: 'text-red-600 bg-red-100',
    READ: 'text-gray-600 bg-gray-100',
  }
  return colors[action] || 'text-gray-600 bg-gray-100'
}

function formatActivityMessage(log: AuditLog) {
  const entityLabel = entityTypeLabels[log.entityType] || log.entityType
  const actionLabel = actionLabels[log.action] || log.action

  return (
    <div className="flex-1">
      <p className="text-sm text-gray-900">
        <span className="font-medium">{log.userName}</span>{' '}
        <span className="text-gray-600">{actionLabel}</span>{' '}
        <span className="font-medium">{entityLabel.toLowerCase()}</span>
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        {formatDistanceToNow(new Date(log.createdAt), {
          addSuffix: true,
          locale: ptBR,
        })}
      </p>
    </div>
  )
}

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity(10)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300 animate-pulse" />
            <p className="text-sm">Carregando atividades...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhuma atividade registrada hoje</p>
            <p className="text-xs mt-2">
              As atividades aparecerão aqui conforme você usar o sistema
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="space-y-4">
          {activities.map((log, index) => (
            <div key={log.id} className="flex items-start gap-3" data-activity-id={log.id} data-index={index}>
              <div
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${getActivityColor(
                  log.action
                )}`}
              >
                {getActivityIcon(log)}
              </div>
              {formatActivityMessage(log)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
