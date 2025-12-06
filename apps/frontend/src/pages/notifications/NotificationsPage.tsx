import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileText,
  HeartPulse,
  Pill,
  Filter,
  Search,
  CheckCheck,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications'
import {
  NotificationCategory,
  NotificationSeverity,
  type Notification,
} from '@/api/notifications.api'
import {
  getNotificationSeverityColors,
  getNotificationCategoryConfig,
} from '@/design-system/tokens/colors'

const CATEGORY_CONFIG = {
  [NotificationCategory.PRESCRIPTION]: {
    label: 'Prescrições',
    icon: Pill,
  },
  [NotificationCategory.VITAL_SIGN]: {
    label: 'Sinais Vitais',
    icon: HeartPulse,
  },
  [NotificationCategory.DOCUMENT]: {
    label: 'Documentos',
    icon: FileText,
  },
  [NotificationCategory.MEDICATION]: {
    label: 'Medicação',
    icon: Pill,
  },
  [NotificationCategory.DAILY_RECORD]: {
    label: 'Registros',
    icon: FileText,
  },
  [NotificationCategory.SYSTEM]: {
    label: 'Sistema',
    icon: Info,
  },
}

const SEVERITY_ICONS = {
  [NotificationSeverity.CRITICAL]: AlertTriangle,
  [NotificationSeverity.WARNING]: AlertTriangle,
  [NotificationSeverity.INFO]: Info,
  [NotificationSeverity.SUCCESS]: CheckCircle2,
}

const SEVERITY_LABELS = {
  [NotificationSeverity.CRITICAL]: 'Crítico',
  [NotificationSeverity.WARNING]: 'Aviso',
  [NotificationSeverity.INFO]: 'Info',
  [NotificationSeverity.SUCCESS]: 'Sucesso',
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<NotificationSeverity | 'all'>('all')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useNotifications({
    page,
    limit,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
    read: showOnlyUnread ? false : undefined,
    search: search || undefined,
  })

  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()
  const deleteMutation = useDeleteNotification()

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id)
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate(id)
  }

  const notifications = data?.data || []
  const totalPages = data?.meta.totalPages || 1

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notificações
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as suas notificações do sistema
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSeverity}
              onValueChange={(v) => setSelectedSeverity(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showOnlyUnread ? 'default' : 'outline'}
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              className="w-full"
            >
              {showOnlyUnread ? 'Mostrar todas' : 'Apenas não lidas'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma notificação encontrada</p>
              <p className="text-sm">Tente ajustar os filtros</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const categoryConfig = CATEGORY_CONFIG[notification.category]
                  const severityColors = getNotificationSeverityColors(notification.severity)
                  const categoryColors = getNotificationCategoryConfig(notification.category)
                  const CategoryIcon = categoryConfig.icon
                  const SeverityIcon = SEVERITY_ICONS[notification.severity]

                  const relativeTime = formatDistanceToNow(
                    new Date(notification.createdAt),
                    {
                      addSuffix: true,
                      locale: ptBR,
                    }
                  )

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                        !notification.read
                          ? `${severityColors.bg} ${severityColors.border}`
                          : 'bg-card border-border'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 ${categoryColors.icon}`}>
                          <CategoryIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {SEVERITY_LABELS[notification.severity]}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {categoryConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <SeverityIcon
                                className={`h-5 w-5 flex-shrink-0 ${severityColors.icon}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleDelete(notification.id, e)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">{relativeTime}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
