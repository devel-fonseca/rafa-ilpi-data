import { useNavigate } from 'react-router-dom'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CriticalAlert } from '@/api/prescriptions.api'

interface CriticalAlertsProps {
  alerts: CriticalAlert[]
}

const ALERT_SEVERITY_COLORS = {
  CRITICAL: {
    bg: 'bg-danger/5 border-danger/30',
    badge: 'bg-danger/10 text-danger/80 border-danger/30',
    icon: 'text-danger',
  },
  WARNING: {
    bg: 'bg-severity-warning/5 border-severity-warning/30',
    badge: 'bg-severity-warning/10 text-severity-warning/80 border-severity-warning/30',
    icon: 'text-severity-warning',
  },
  INFO: {
    bg: 'bg-primary/5 border-primary/30',
    badge: 'bg-primary/10 text-primary/80 border-primary/30',
    icon: 'text-primary',
  },
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  EXPIRED: 'Prescrição Vencida',
  NO_ACTIVE_MEDICATIONS: 'Sem Medicamentos Ativos',
  MISSING_NOTIFICATION: 'Sem Número de Notificação',
  EXPIRING_SOON: 'Vencendo em Breve',
}

export function CriticalAlerts({ alerts }: CriticalAlertsProps) {
  const navigate = useNavigate()

  if (!alerts || alerts.length === 0) {
    return null
  }

  const handleViewPrescription = (prescriptionId: string) => {
    navigate(`/dashboard/prescricoes/${prescriptionId}`)
  }

  return (
    <Card className="border-2 border-danger/30">
      <CardContent className="p-6">
        <div className="space-y-3">
          {alerts.map((alert) => {
            const colors =
              ALERT_SEVERITY_COLORS[alert.severity] ||
              ALERT_SEVERITY_COLORS.INFO

            return (
              <div
                key={alert.prescriptionId}
                className={`border rounded-lg p-4 ${colors.bg}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className={`h-5 w-5 ${colors.icon}`} />
                      <span className="font-semibold text-foreground">
                        {alert.residentName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${colors.badge} border`}
                      >
                        {ALERT_TYPE_LABELS[alert.type] || alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {alert.doctorName && (
                        <span>Prescritor: {alert.doctorName}</span>
                      )}
                      {alert.daysUntilExpiry !== undefined && (
                        <span>
                          {alert.daysUntilExpiry > 0
                            ? `Vence em ${alert.daysUntilExpiry} dias`
                            : 'Vencida'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewPrescription(alert.prescriptionId)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
