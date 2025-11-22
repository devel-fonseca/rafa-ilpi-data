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
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700 border-red-300',
    icon: 'text-red-600',
  },
  WARNING: {
    bg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: 'text-orange-600',
  },
  INFO: {
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: 'text-blue-600',
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
    <Card className="border-2 border-red-200">
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
                      <span className="font-semibold text-gray-900">
                        {alert.residentName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${colors.badge} border`}
                      >
                        {ALERT_TYPE_LABELS[alert.type] || alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-600">
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
