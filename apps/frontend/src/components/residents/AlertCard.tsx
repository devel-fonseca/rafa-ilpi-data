import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AlertCardProps {
  type: 'critical' | 'warning' | 'info'
  title: string
  count: number
  description: string
  onClick?: () => void
}

export function AlertCard({ type, title, count, description, onClick }: AlertCardProps) {
  const config = {
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-danger/5 dark:bg-danger/10',
      borderColor: 'border-danger/30',
      iconColor: 'text-danger',
      badgeColor: 'bg-danger text-white',
      hoverColor: 'hover:bg-danger/10 dark:hover:bg-danger/20',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning/5 dark:bg-warning/10',
      borderColor: 'border-warning/30',
      iconColor: 'text-warning',
      badgeColor: 'bg-warning text-white',
      hoverColor: 'hover:bg-warning/10 dark:hover:bg-warning/20',
    },
    info: {
      icon: Info,
      bgColor: 'bg-primary/5 dark:bg-primary/10',
      borderColor: 'border-primary/30',
      iconColor: 'text-primary',
      badgeColor: 'bg-primary text-white',
      hoverColor: 'hover:bg-primary/10 dark:hover:bg-primary/20',
    },
  }

  const { icon: Icon, bgColor, borderColor, iconColor, badgeColor, hoverColor } = config[type]

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 border',
        bgColor,
        borderColor,
        hoverColor,
        onClick && 'active:scale-95'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={cn('p-1.5 sm:p-2 rounded-lg', bgColor)}>
              <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{title}</h3>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
          </div>
          <Badge className={cn('shrink-0', badgeColor)}>{count}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
