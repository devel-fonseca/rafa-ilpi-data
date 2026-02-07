import { Shield, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ResidentWithControlled } from '@/api/prescriptions.api'

interface ControlledResidentsProps {
  residents: ResidentWithControlled[]
}

export function ControlledResidents({ residents }: ControlledResidentsProps) {
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
          {residents.map((resident, index) => (
            <div
              key={`${resident.residentName}-${index}`}
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
                      <span className="font-medium">Medicamento:</span>{' '}
                      {resident.medication}
                    </p>
                    {resident.scheduledTimes && resident.scheduledTimes.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {resident.scheduledTimes.map((time) => (
                          <Badge
                            key={time}
                            variant="outline"
                            className="bg-medication-controlled/10 text-medication-controlled/80 border-medication-controlled/30"
                          >
                            {time}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
