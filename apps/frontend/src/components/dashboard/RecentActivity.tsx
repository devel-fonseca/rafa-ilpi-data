import { useRecentActivity, type AuditLog } from '@/hooks/useAudit'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, UserPlus, Edit, Trash2, FileText, Users, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const entityTypeLabels: Record<string, string> = {
  RESIDENT: 'residente',
  DAILY_RECORD: 'registro diário',
  PRESCRIPTION: 'prescrição',
  VACCINATION: 'vacinação',
  BUILDING: 'prédio',
  FLOOR: 'andar',
  ROOM: 'quarto',
  BED: 'leito',
  VITAL_SIGN: 'sinal vital',
  INSTITUTIONAL_PROFILE: 'perfil institucional',
  USER_PROFILE: 'perfil de usuário',
  USER: 'usuário',
  TENANT: 'organização',
}

const actionLabels: Record<string, string> = {
  CREATE: 'criou',
  CREATE_USER: 'adicionou',
  UPDATE: 'atualizou',
  UPDATE_USER: 'atualizou',
  DELETE: 'excluiu',
  DELETE_USER: 'removeu',
  READ: 'visualizou',
  ADMINISTER_MEDICATION: 'administrou medicação',
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
    CREATE: 'text-success bg-success/10',
    UPDATE: 'text-primary bg-primary/10',
    DELETE: 'text-danger bg-danger/10',
    READ: 'text-muted-foreground bg-muted',
  }
  return colors[action] || 'text-muted-foreground bg-muted'
}

function formatActivityMessage(log: AuditLog) {
  const entityLabel = entityTypeLabels[log.entityType] || log.entityType.toLowerCase().replace('_', ' ')
  let actionLabel = actionLabels[log.action] || log.action.toLowerCase()

  // Mensagens contextualizadas para combinações específicas
  let customMessage: string | null = null

  // Normalizar entity type para maiúsculo para comparação
  const entityTypeUpper = log.entityType?.toUpperCase()

  // CREATE + TENANT (no auto-registro) = "cadastrou a instituição"
  if (log.action === 'CREATE' && entityTypeUpper === 'TENANT') {
    customMessage = 'cadastrou a instituição'
  }
  // CREATE_USER + TENANT (adicionar usuário ao tenant) = "adicionou usuário"
  else if (log.action === 'CREATE_USER' && entityTypeUpper === 'TENANT') {
    customMessage = 'adicionou usuário'
  }
  // DELETE_USER + TENANT (remover usuário do tenant) = "removeu usuário"
  else if (log.action === 'DELETE_USER' && entityTypeUpper === 'TENANT') {
    customMessage = 'removeu usuário'
  }
  // UPDATE + USER_PROFILE = "atualizou seu perfil"
  else if (log.action === 'UPDATE' && entityTypeUpper === 'USER_PROFILE') {
    customMessage = 'atualizou seu perfil'
  }
  // ADMINISTER_MEDICATION = "administrou medicação"
  else if (log.action === 'ADMINISTER_MEDICATION') {
    customMessage = 'administrou medicação'
  }

  return (
    <div className="flex-1">
      <p className="text-sm">
        <span className="font-medium text-foreground">{log.userName}</span>{' '}
        {customMessage ? (
          <span className="text-muted-foreground">{customMessage}</span>
        ) : (
          <>
            <span className="text-muted-foreground">{actionLabel}</span>{' '}
            <span className="font-medium text-foreground">{entityLabel}</span>
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
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
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted animate-pulse" />
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
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted" />
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
