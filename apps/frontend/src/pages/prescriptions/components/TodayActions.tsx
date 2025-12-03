import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { AdministerMedicationModal } from './AdministerMedicationModal'
import { getCurrentDate, extractDateOnly } from '@/utils/dateHelpers'

type ShiftType = 'morning' | 'afternoon' | 'night'

interface MedicationAction {
  residentName: string
  medicationName: string
  scheduledTime: string
  status: 'administered' | 'pending' | 'missed'
  prescriptionId: string
  medicationId: string
  medication: any // Objeto completo do medication
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
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  afternoon: {
    label: 'Tarde (12h - 18h)',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
  },
  night: {
    label: 'Noite (18h - 06h)',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
}

const STATUS_CONFIG = {
  administered: {
    icon: CheckCircle2,
    color: 'text-success',
    label: 'Administrado',
  },
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    label: 'Pendente',
  },
  missed: {
    icon: XCircle,
    color: 'text-danger',
    label: 'Não Administrado',
  },
}

export function TodayActions() {
  const today = getCurrentDate() // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
  const [selectedMedication, setSelectedMedication] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Buscar prescrições ativas
  const { prescriptions, isLoading } = usePrescriptions({
    page: 1,
    limit: 100,
    isActive: true,
  })

  const handleMedicationClick = (medication: any) => {
    setSelectedMedication(medication)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMedication(null)
  }

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

          // Verificar se existe administração para este horário hoje
          const todayAdministration = medication.administrations?.find(
            (admin) => {
              // ✅ REFATORADO: Usar extractDateOnly do dateHelpers para conversão segura
              const adminDate = extractDateOnly(admin.date)
              return adminDate === today && admin.scheduledTime === time
            }
          )

          let status: 'administered' | 'pending' | 'missed' = 'pending'

          if (todayAdministration) {
            status = todayAdministration.wasAdministered ? 'administered' : 'missed'
          } else {
            // Se passou do horário e não foi administrado, marcar como "missed"
            const now = new Date()
            const scheduledDateTime = new Date(`${today}T${time}`)
            if (now > scheduledDateTime) {
              status = 'missed'
            }
          }

          actions[shift].push({
            residentName: prescription.resident?.fullName || 'Residente',
            medicationName: medication.name,
            scheduledTime: time,
            status,
            prescriptionId: prescription.id,
            medicationId: medication.id,
            medication: medication,
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
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma medicação programada para hoje
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
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
                          onClick={() => handleMedicationClick(action.medication)}
                          className="bg-card rounded p-3 text-sm border cursor-pointer hover:bg-accent/5 hover:border-accent transition-colors"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleMedicationClick(action.medication)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">
                                  {action.scheduledTime}
                                </span>
                                <StatusIcon
                                  className={`h-4 w-4 ${statusConfig.color}`}
                                />
                              </div>
                              <p className="font-medium text-foreground">
                                {action.residentName}
                              </p>
                              <p className="text-muted-foreground">
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

      {selectedMedication && (
        <AdministerMedicationModal
          open={isModalOpen}
          onClose={handleCloseModal}
          medication={selectedMedication}
        />
      )}
    </>
  )
}
