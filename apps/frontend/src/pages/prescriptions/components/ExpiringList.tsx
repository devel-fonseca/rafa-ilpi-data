import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Prescription } from '@/api/prescriptions.api'

interface ExpiringListProps {
  prescriptions: Prescription[]
}

export function ExpiringList({ prescriptions }: ExpiringListProps) {
  const navigate = useNavigate()

  const handleViewPrescription = (id: string) => {
    navigate(`/dashboard/prescricoes/${id}`)
  }

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-gray-600 text-center">
            Nenhuma prescrição próxima do vencimento
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {prescriptions.map((prescription) => {
            const validUntil = prescription.validUntil
              ? parseISO(prescription.validUntil)
              : null
            const today = new Date()
            const daysLeft = validUntil
              ? Math.ceil(
                  (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                )
              : null

            const isUrgent = daysLeft !== null && daysLeft <= 2

            return (
              <div
                key={prescription.id}
                className={`border rounded-lg p-4 ${
                  isUrgent
                    ? 'bg-red-50 border-red-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isUrgent && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-semibold text-gray-900">
                        {prescription.resident?.fullName || 'Residente'}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          isUrgent
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-orange-100 text-orange-700 border-orange-300'
                        }
                      >
                        {prescription.prescriptionType}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>Prescritor: {prescription.doctorName}</p>
                      {validUntil && (
                        <p className="font-medium">
                          Validade:{' '}
                          {format(validUntil, "dd 'de' MMMM", { locale: ptBR })}
                          {daysLeft !== null && (
                            <span
                              className={
                                isUrgent ? 'text-red-700 ml-2' : 'text-orange-700 ml-2'
                              }
                            >
                              ({daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}{' '}
                              restante{daysLeft === 1 ? '' : 's'})
                            </span>
                          )}
                        </p>
                      )}
                      {prescription.medications && (
                        <p className="text-xs text-gray-600">
                          {prescription.medications.length} medicamento
                          {prescription.medications.length === 1 ? '' : 's'}{' '}
                          contínuo
                          {prescription.medications.length === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewPrescription(prescription.id)}
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
