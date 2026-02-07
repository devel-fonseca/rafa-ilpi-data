import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, Search, CheckCheck, Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
  useMarkAsUnread,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications'
import {
  NotificationCategory,
  NotificationSeverity,
  SystemNotificationType,
  type Notification,
} from '@/api/notifications.api'
import {
  getNotificationSeverityColors,
  getNotificationCategoryConfig,
} from '@/design-system/tokens/colors'
import { MissedEventActionsModal } from '@/components/resident-schedule/MissedEventActionsModal'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'
import {
  NOTIFICATION_CATEGORY_CONFIG,
  getCategoryConfig,
  getSeverityIcon,
  getSeverityLabel,
} from '@/config/notifications.config'

export function NotificationsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<NotificationSeverity | 'all'>('all')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [page, setPage] = useState(1)
  const [missedEventModalOpen, setMissedEventModalOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
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
  const markAsUnreadMutation = useMarkAsUnread()
  const markAllAsReadMutation = useMarkAllAsRead()
  const deleteMutation = useDeleteNotification()

  const handleNotificationClick = (notification: Notification) => {
    // Se for notificação de evento perdido, abrir modal específico
    if (notification.type === SystemNotificationType.SCHEDULED_EVENT_MISSED) {
      setSelectedNotification(notification)
      setMissedEventModalOpen(true)
      return
    }

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

  const handleMarkAsUnread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    markAsUnreadMutation.mutate(id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate(id)
  }

  const notifications = data?.data || []
  const totalPages = data?.meta.totalPages || 1

  return (
    <Page>
      <PageHeader
        title="Notificações"
        subtitle="Gerencie todas as suas notificações do sistema"
        actions={
          notifications.some((n) => !n.read) && (
            <Button onClick={handleMarkAllAsRead} variant="outline">
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )
        }
      />

      <Section title="Filtros">
        <Card>
          <CardContent className="pt-6">
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
              onValueChange={(v) => setSelectedCategory(v as NotificationCategory | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(NOTIFICATION_CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSeverity}
              onValueChange={(v) => setSelectedSeverity(v as NotificationSeverity | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                {Object.values(NotificationSeverity).map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {getSeverityLabel(severity)}
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
      </Section>

      <Section title="Lista de Notificações">
        {isLoading ? (
          <EmptyState
            icon={Loader2}
            title="Carregando notificações..."
            description="Aguarde enquanto buscamos suas notificações"
            variant="info"
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação encontrada"
            description="Tente ajustar os filtros para encontrar notificações"
          />
        ) : (
          <Card>
            <CardContent className="p-6">
            <>
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const categoryConfig = getCategoryConfig(notification.category)
                  const severityColors = getNotificationSeverityColors(notification.severity)
                  const categoryColors = getNotificationCategoryConfig(notification.category as NotificationCategory)
                  const CategoryIcon = categoryConfig.icon
                  const SeverityIcon = getSeverityIcon(notification.severity)

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
                                {getSeverityLabel(notification.severity)}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {categoryConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <SeverityIcon
                                className={`h-5 w-5 flex-shrink-0 ${severityColors.icon}`}
                              />
                              {notification.read ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => handleMarkAsUnread(notification.id, e)}
                                  title="Marcar como não lida"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsReadMutation.mutate(notification.id)
                                  }}
                                  title="Marcar como lida"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleDelete(notification.id, e)}
                                title="Remover notificação"
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
            </CardContent>
          </Card>
        )}
      </Section>

      {/* Modal de Ações para Evento Perdido */}
      {selectedNotification && (
        <MissedEventActionsModal
          open={missedEventModalOpen}
          onOpenChange={setMissedEventModalOpen}
          eventId={selectedNotification.entityId || ''}
          eventTitle={(selectedNotification.metadata?.eventTitle as string) || selectedNotification.title}
          scheduledDate={(selectedNotification.metadata?.scheduledDate as string) || ''}
          scheduledTime={(selectedNotification.metadata?.scheduledTime as string) || ''}
          residentName={(selectedNotification.metadata?.residentName as string) || 'Residente'}
          notificationId={selectedNotification.id}
        />
      )}
    </Page>
  )
}
