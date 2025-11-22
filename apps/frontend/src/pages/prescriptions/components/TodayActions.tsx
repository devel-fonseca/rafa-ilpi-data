import { useMemo } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePrescriptions } from '@/hooks/usePrescriptions'

type ShiftType = 'morning' | 'afternoon' | 'night'

interface MedicationAction {
  residentName: string
  medicationName: string
  scheduledTime: string
  status: 'administered' | 'pending' | 'missed'
  prescriptionId: string
}

// Função para determinar o turno baseado no horário
function getShift(time: string): ShiftType {
  const hour = parseInt(time.split(':')[0])
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'night'
}

const SHIFT_CONFIG = {
  morning: {
    label: 'Manhã (06h - 12h)',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  afternoon: {
    label: 'Tarde (12h - 18h)',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  night: {
    label: 'Noite (18h - 06h)',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
}

const STATUS_CONFIG = {
  administered: {
    icon: CheckCircle2,
    color: 'text-green-600',
    label: 'Administrado',
  },
  pending: {
    icon: Circle,
    color: 'text-gray-400',
    label: 'Pendente',
  },
  missed: {
    icon: XCircle,
    color: 'text-red-600',
    label: 'Não Administrado',
  },
}

export function TodayActions() {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Buscar prescrições ativas
  const { prescriptions, isLoading } = usePrescriptions({
    page: 1,
    limit: 100,
    status: 'ATIVA',
  })

  // Processar medicações do dia e agrupar por turno
  const actionsByShift = useMemo(() => {
    if (!prescriptions || prescriptions.length === 0) {
      return {
        morning: [] as MedicationAction[],
        afternoon: [] as MedicationAction[],
        night: [] as MedicationAction[],
      }
    }

    const actions: Record<ShiftType, MedicationAction[]> = {
      morning: [],
      afternoon: [],
      night: [],
    }

    // Para cada prescrição ativa
    prescriptions.forEach((prescription) => {
      // Para cada medicamento contínuo
      prescription.medications?.forEach((medication) => {
        // Para cada horário programado
        medication.scheduledTimes?.forEach((time) => {
          const shift = getShift(time)

          // Verificar se foi administrado hoje
          const wasAdministered = medication.administrations?.some(
            (admin) =>
              admin.date === today &&
              admin.scheduledTime === time &&
              admin.wasAdministered === true
          )

          // Verificar se foi marcado como não administrado
          const wasMissed = medication.administrations?.some(
            (admin) =>
              admin.date === today &&
              admin.scheduledTime === time &&
              admin.wasAdministered === false
          )

          const status = wasAdministered
            ? 'administered'
            : wasMissed
              ? 'missed'
              : 'pending'

          actions[shift].push({
            residentName: prescription.resident?.fullName || 'Residente',
            medicationName: medication.name,
            scheduledTime: time,
            status: status as 'administered' | 'pending' | 'missed',
            prescriptionId: prescription.id,
          })
        })
      })
    })

    // Ordenar por horário dentro de cada turno
    Object.keys(actions).forEach((shift) => {
      actions[shift as ShiftType].sort((a, b) =>
        a.scheduledTime.localeCompare(b.scheduledTime)
      )
    })

    return actions
  }, [prescriptions, today])

  const totalActions =
    actionsByShift.morning.length +
    actionsByShift.afternoon.length +
    actionsByShift.night.length

  if (isLoading) {
    return null
  }

  if (totalActions === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-gray-600 text-center">
            Nenhuma medicação programada para hoje
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['morning', 'afternoon', 'night'] as ShiftType[]).map((shift) => {
            const config = SHIFT_CONFIG[shift]
            const actions = actionsByShift[shift]

            if (actions.length === 0) return null

            return (
              <div
                key={shift}
                className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}
              >
                <h3 className={`text-sm font-medium mb-3 ${config.color}`}>
                  {config.label}
                  <Badge variant="outline" className="ml-2">
                    {actions.length}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {actions.map((action, idx) => {
                    const statusConfig = STATUS_CONFIG[action.status]
                    const StatusIcon = statusConfig.icon

                    return (
                      <div
                        key={`${action.prescriptionId}-${action.scheduledTime}-${idx}`}
                        className="bg-white rounded p-3 text-sm border border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {action.scheduledTime}
                              </span>
                              <StatusIcon
                                className={`h-4 w-4 ${statusConfig.color}`}
                              />
                            </div>
                            <p className="font-medium text-gray-800">
                              {action.residentName}
                            </p>
                            <p className="text-gray-600">
                              {action.medicationName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
