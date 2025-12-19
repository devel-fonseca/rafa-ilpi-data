import { useRecentActivity, type AuditLog } from '@/hooks/useAudit'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, UserPlus, Edit, Trash2, FileText, Users, Calendar } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const entityTypeLabels: Record<string, string> = {
  RESIDENT: 'residente',
  DAILY_RECORD: 'registro diário',
  PRESCRIPTION: 'prescrição',
  MEDICATION: 'medicamento',
  SOS_MEDICATION: 'medicamento SOS',
  MEDICATION_ADMINISTRATION: 'administração de medicamento',
  VACCINATION: 'vacinação',
  BUILDING: 'prédio',
  FLOOR: 'andar',
  ROOM: 'quarto',
  BED: 'leito',
  VITAL_SIGN: 'sinal vital',
  CLINICAL_NOTE: 'evolução clínica',
  CLINICAL_PROFILE: 'perfil clínico',
  ALLERGY: 'alergia',
  CONDITION: 'condição',
  DIETARY_RESTRICTION: 'restrição alimentar',
  INSTITUTIONAL_PROFILE: 'perfil institucional',
  TENANT_DOCUMENT: 'documento institucional',
  RESIDENT_DOCUMENT: 'documento do residente',
  USER_PROFILE: 'perfil de usuário',
  USER: 'usuário',
  TENANT: 'organização',
  RESIDENT_SCHEDULE_CONFIG: 'configuração de agenda',
  RESIDENT_SCHEDULED_EVENT: 'evento agendado',
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
  TRANSFER_BED: 'transferiu de leito',
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
  const actionLabel = actionLabels[log.action] || log.action.toLowerCase()

  // Normalizar entity type para maiúsculo para comparação
  const entityTypeUpper = log.entityType?.toUpperCase()

  // Mensagens customizadas com formatação adequada
  let messageContent: JSX.Element

  // CREATE + TENANT (no auto-registro) = "cadastrou a <instituição>"
  if (log.action === 'CREATE' && entityTypeUpper === 'TENANT') {
    messageContent = (
      <>
        <span className="text-muted-foreground">cadastrou a</span>{' '}
        <span className="font-medium text-foreground">instituição</span>
      </>
    )
  }
  // CREATE_USER + TENANT (adicionar usuário ao tenant) = "adicionou <usuário>"
  else if (log.action === 'CREATE_USER' && entityTypeUpper === 'TENANT') {
    messageContent = (
      <>
        <span className="text-muted-foreground">adicionou</span>{' '}
        <span className="font-medium text-foreground">usuário</span>
      </>
    )
  }
  // DELETE_USER + TENANT (remover usuário do tenant) = "removeu <usuário>"
  else if (log.action === 'DELETE_USER' && entityTypeUpper === 'TENANT') {
    messageContent = (
      <>
        <span className="text-muted-foreground">removeu</span>{' '}
        <span className="font-medium text-foreground">usuário</span>
      </>
    )
  }
  // UPDATE + USER_PROFILE = "atualizou <seu perfil>"
  else if (log.action === 'UPDATE' && entityTypeUpper === 'USER_PROFILE') {
    messageContent = (
      <>
        <span className="text-muted-foreground">atualizou</span>{' '}
        <span className="font-medium text-foreground">seu perfil</span>
      </>
    )
  }
  // ADMINISTER_MEDICATION = "administrou <medicação>"
  else if (log.action === 'ADMINISTER_MEDICATION') {
    messageContent = (
      <>
        <span className="text-muted-foreground">administrou</span>{' '}
        <span className="font-medium text-foreground">medicação</span>
      </>
    )
  }
  // Padrão: <ação> <entidade>
  else {
    messageContent = (
      <>
        <span className="text-muted-foreground">{actionLabel}</span>{' '}
        <span className="font-medium text-foreground">{entityLabel}</span>
      </>
    )
  }

  const activityDate = new Date(log.createdAt)
  const relativeTime = formatDistanceToNow(activityDate, {
    addSuffix: true,
    locale: ptBR,
  })
  const fullDateTime = format(activityDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  return (
    <div className="flex-1">
      <p className="text-sm">
        <span className="font-medium text-foreground">{log.userName}</span>{' '}
        {messageContent}
      </p>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground mt-0.5 cursor-help">
              {relativeTime}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p>{fullDateTime}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

function getDayLabel(date: Date): string {
  if (isToday(date)) {
    return 'Hoje'
  }
  if (isYesterday(date)) {
    return 'Ontem'
  }
  return format(date, "dd 'de' MMMM", { locale: ptBR })
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

  // Agrupar atividades por dia
  const groupedActivities: { day: string; logs: AuditLog[] }[] = []
  let currentDay: string | null = null

  activities.forEach((log) => {
    const logDate = new Date(log.createdAt)
    const dayLabel = getDayLabel(logDate)

    if (dayLabel !== currentDay) {
      currentDay = dayLabel
      groupedActivities.push({ day: dayLabel, logs: [log] })
    } else {
      groupedActivities[groupedActivities.length - 1].logs.push(log)
    }
  })

  return (
    <Card>
      <CardContent className="py-4">
        <div className="space-y-1">
          {groupedActivities.map((group, groupIndex) => (
            <div key={`${group.day}-${groupIndex}`}>
              {/* Separador de dia */}
              <div className="text-xs font-medium text-muted-foreground px-1 py-2 mb-2">
                {group.day}
              </div>

              {/* Atividades do dia */}
              <div className="space-y-1">
                {group.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    data-activity-id={log.id}
                  >
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
