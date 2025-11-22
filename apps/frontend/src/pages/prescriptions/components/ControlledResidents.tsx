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
  BZD: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  PSICOFARMACO: 'bg-purple-100 text-purple-700 border-purple-300',
  OPIOIDE: 'bg-red-100 text-red-700 border-red-300',
  ANTICONVULSIVANTE: 'bg-blue-100 text-blue-700 border-blue-300',
  OUTRO: 'bg-gray-100 text-gray-700 border-gray-300',
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
          <p className="text-sm text-gray-600 text-center">
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
              className="border border-purple-200 rounded-lg p-4 bg-purple-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-gray-900">
                      {resident.residentName}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
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
                            'bg-gray-100 text-gray-700 border-gray-300'
                          }
                        >
                          {CONTROLLED_CLASS_LABELS[controlledClass] ||
                            controlledClass}
                        </Badge>
                      ))}
                    </div>
                    {resident.notificationNumber && (
                      <p className="text-xs text-gray-600">
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
