import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bell,
  CheckCheck,
  FileText,
  HeartPulse,
  Pill,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications'
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

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const navigate = useNavigate()
  const categoryConfig = CATEGORY_CONFIG[notification.category]
  const severityColors = getNotificationSeverityColors(notification.severity)
  const categoryColors = getNotificationCategoryConfig(notification.category)
  const CategoryIcon = categoryConfig.icon
  const SeverityIcon = SEVERITY_ICONS[notification.severity]

  const handleClick = () => {
    // Marcar como lida
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }

    // Navegar se tiver actionUrl
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  const relativeTime = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
        !notification.read ? `${severityColors.bg} ${severityColors.border}` : 'bg-card border-border'
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${categoryColors.icon}`}>
          <CategoryIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm text-foreground">{notification.title}</p>
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            <SeverityIcon className={`h-4 w-4 flex-shrink-0 ${severityColors.icon}`} />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
            {notification.message}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{relativeTime}</p>
            {notification.actionUrl && (
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all')

  const { data: unreadCount } = useUnreadCount()
  const { data: allNotifications } = useNotifications({
    page: 1,
    limit: 50,
    read: false,
  })
  const { data: prescriptionNotifications } = useNotifications({
    page: 1,
    limit: 50,
    category: NotificationCategory.PRESCRIPTION,
    read: false,
  })
  const { data: vitalSignNotifications } = useNotifications({
    page: 1,
    limit: 50,
    category: NotificationCategory.VITAL_SIGN,
    read: false,
  })
  const { data: documentNotifications } = useNotifications({
    page: 1,
    limit: 50,
    category: NotificationCategory.DOCUMENT,
    read: false,
  })

  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()
  const navigate = useNavigate()

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleViewAll = () => {
    setIsOpen(false)
    navigate('/dashboard/notificacoes')
  }

  const getNotificationsByCategory = () => {
    switch (selectedCategory) {
      case NotificationCategory.PRESCRIPTION:
        return prescriptionNotifications?.data || []
      case NotificationCategory.VITAL_SIGN:
        return vitalSignNotifications?.data || []
      case NotificationCategory.DOCUMENT:
        return documentNotifications?.data || []
      case 'all':
      default:
        return allNotifications?.data || []
    }
  }

  const notifications = getNotificationsByCategory()
  const hasUnread = (unreadCount?.count || 0) > 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount!.count > 99 ? '99+' : unreadCount!.count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[420px] p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base">Notificações</h3>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>

          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">
                Todas
              </TabsTrigger>
              <TabsTrigger value={NotificationCategory.PRESCRIPTION} className="text-xs">
                Prescrições
              </TabsTrigger>
              <TabsTrigger value={NotificationCategory.VITAL_SIGN} className="text-xs">
                Vitais
              </TabsTrigger>
              <TabsTrigger value={NotificationCategory.DOCUMENT} className="text-xs">
                Docs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma notificação não lida
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-center"
            onClick={handleViewAll}
          >
            Ver todas as notificações
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
