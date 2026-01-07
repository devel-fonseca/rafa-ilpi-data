import { useNavigate } from 'react-router-dom'
import { Shield, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ResidentWithControlled } from '@/api/prescriptions.api'

interface ControlledResidentsProps {
  residents: ResidentWithControlled[]
}

const CONTROLLED_CLASS_LABELS: Record<string, string> = {
  BZD: 'Benzodiazepínicos',
  PSICOFARMACO: 'Psicofármaco',
  OPIOIDE: 'Opioide',
  ANTICONVULSIVANTE: 'Anticonvulsivante',
  OUTRO: 'Outro',
}

const CONTROLLED_CLASS_COLORS: Record<string, string> = {
  BZD: 'bg-warning/10 text-warning/80 border-warning/30',
  PSICOFARMACO: 'bg-medication-controlled/10 text-medication-controlled/80 border-medication-controlled/30',
  OPIOIDE: 'bg-danger/10 text-danger/80 border-danger/30',
  ANTICONVULSIVANTE: 'bg-primary/10 text-primary/80 border-primary/30',
  OUTRO: 'bg-muted text-foreground/80 border-border',
}

export function ControlledResidents({ residents }: ControlledResidentsProps) {
  const navigate = useNavigate()

  const handleViewPrescription = (prescriptionId: string) => {
    navigate(`/dashboard/prescricoes/${prescriptionId}`)
  }

  if (!residents || residents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum residente com medicamentos controlados ativos
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {residents.map((resident) => (
            <div
              key={resident.residentId}
              className="border border-medication-controlled/30 rounded-lg p-4 bg-medication-controlled/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-medication-controlled" />
                    <span className="font-semibold text-foreground">
                      {resident.residentName}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground/80">
                      <span className="font-medium">Prescritor:</span>{' '}
                      {resident.doctorName}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {resident.controlledClasses?.map((controlledClass) => (
                        <Badge
                          key={controlledClass}
                          variant="outline"
                          className={
                            CONTROLLED_CLASS_COLORS[controlledClass] ||
                            'bg-muted text-foreground/80 border-border'
                          }
                        >
                          {CONTROLLED_CLASS_LABELS[controlledClass] ||
                            controlledClass}
                        </Badge>
                      ))}
                    </div>
                    {resident.notificationNumber && (
                      <p className="text-xs text-muted-foreground">
                        Notificação: {resident.notificationNumber}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleViewPrescription(resident.prescriptionId)
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
