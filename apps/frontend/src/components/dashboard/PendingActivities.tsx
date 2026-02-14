import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, AlertCircle, Calendar, FileText, Bell } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PendingItem {
  id: string
  type: 'PRESCRIPTION_EXPIRING' | 'DAILY_RECORD_MISSING' | 'NOTIFICATION_UNREAD' | 'VITAL_SIGNS_DUE'
  title: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  dueDate?: string
  relatedEntity?: {
    id: string
    name: string
  }
}

interface PendingActivitiesProps {
  items?: PendingItem[]
  isLoading?: boolean
}

const priorityColors: Record<string, string> = {
  HIGH: 'text-danger bg-danger/10',
  MEDIUM: 'text-warning bg-warning/10',
  LOW: 'text-info bg-info/10',
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  PRESCRIPTION_EXPIRING: FileText,
  DAILY_RECORD_MISSING: Calendar,
  NOTIFICATION_UNREAD: Bell,
  VITAL_SIGNS_DUE: Activity,
}

function getPendingIcon(type: string) {
  const Icon = typeIcons[type] || AlertCircle
  return <Icon className="h-4 w-4" />
}

export function PendingActivities({ items = [], isLoading = false }: PendingActivitiesProps) {
  const pendingItems = items

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted animate-pulse" />
            <p className="text-sm">Carregando atividades pendentes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!pendingItems || pendingItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted" />
            <p className="text-sm">Nenhuma atividade pendente</p>
            <p className="text-xs mt-2 text-success">
              Tudo em dia! 🎉
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Pendentes</CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <div className="space-y-1">
          {pendingItems.map((item) => {
            const dueDate = item.dueDate ? new Date(item.dueDate) : null
            const relativeTime = dueDate
              ? formatDistanceToNow(dueDate, {
                  addSuffix: true,
                  locale: ptBR,
                })
              : null
            const fullDateTime = dueDate
              ? format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : null

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                data-pending-id={item.id}
              >
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${priorityColors[item.priority]}`}
                >
                  {getPendingIcon(item.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">{item.title}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                  {relativeTime && fullDateTime && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-muted-foreground mt-1 cursor-help">
                            {relativeTime}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{fullDateTime}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
