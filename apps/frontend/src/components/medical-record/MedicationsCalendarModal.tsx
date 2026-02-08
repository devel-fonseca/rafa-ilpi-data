// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - MedicationsCalendarModal (Calendário de Medicações)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pill, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { RecordCalendar } from '@/components/calendar/RecordCalendar'
import { useResidentMedicationDates } from '@/hooks/useResidentMedicationDates'
import { formatMedicationPresentation } from '@/utils/formatters'
import { formatDateTimeSafe } from '@/utils/dateHelpers'

// ========== TYPES ==========

interface MedicationAdministration {
  id: string
  type: 'ROUTINE' | 'SOS'
  wasAdministered: boolean
  scheduledTime?: string
  actualTime?: string
  administeredBy: string
  checkedBy?: string
  reason?: string
  notes?: string
  indication?: string
  createdAt: string
  medication?: {
    name: string
    dose: string
    route: string
    presentation?: string
  }
}

interface MedicationsCalendarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName: string
  initialDate?: Date
  onDateSelect?: (date: string) => void
}

// ========== COMPONENT ==========

export function MedicationsCalendarModal({
  open,
  onOpenChange,
  residentId,
  residentName,
  initialDate,
  onDateSelect,
}: MedicationsCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date())
  const [currentYear, setCurrentYear] = useState(
    (initialDate || new Date()).getFullYear()
  )
  const [currentMonth, setCurrentMonth] = useState(
    (initialDate || new Date()).getMonth() + 1
  )

  useEffect(() => {
    if (!open) return
    const baseDate = initialDate || new Date()
    setSelectedDate(baseDate)
    setCurrentYear(baseDate.getFullYear())
    setCurrentMonth(baseDate.getMonth() + 1)
  }, [open, initialDate])

  // Buscar datas com administrações para o mês atual
  const { data: datesWithMedications = [], isLoading: isLoadingDates } =
    useResidentMedicationDates(residentId, currentYear, currentMonth, open)

  // Buscar administrações do dia selecionado
  const {
    data: administrations = [],
    isLoading: isLoadingAdministrations,
  } = useQuery({
    queryKey: tenantKey(
      'medication-administrations',
      'resident',
      residentId,
      format(selectedDate, 'yyyy-MM-dd')
    ),
    queryFn: async () => {
      const response = await api.get(
        `/prescriptions/medication-administrations/resident/${residentId}/date/${format(selectedDate, 'yyyy-MM-dd')}`
      )
      return response.data
    },
    enabled: !!residentId && open,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  const handleDateSelect = (date: Date) => {
    // Clique simples: apenas seleciona a data para visualizar administrações
    setSelectedDate(date)
    setCurrentYear(date.getFullYear())
    setCurrentMonth(date.getMonth() + 1)
  }

  const handleDateDoubleClick = (date: Date) => {
    // Duplo clique: navega para a data e fecha o modal
    onDateSelect?.(format(date, 'yyyy-MM-dd'))
    onOpenChange(false)
  }

  const getIndicationLabel = (indication: string) => {
    const labels: Record<string, string> = {
      DOR: 'Dor',
      FEBRE: 'Febre',
      ANSIEDADE: 'Ansiedade',
      AGITACAO: 'Agitação',
      NAUSEA: 'Náusea/Vômito',
      INSONIA: 'Insônia',
      OUTRO: 'Outro',
    }
    return labels[indication] || indication
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Calendário de Medicações - {residentName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 flex-1 overflow-y-auto min-h-0">
          {/* Coluna 1: Calendário */}
          <div>
            <RecordCalendar
              datesWithRecords={datesWithMedications}
              selectedDate={selectedDate}
              initialMonth={selectedDate}
              onDateSelect={handleDateSelect}
              onDateDoubleClick={handleDateDoubleClick}
              onMonthChange={handleMonthChange}
              isLoading={isLoadingDates}
            />
          </div>

          {/* Coluna 2: Administrações do Dia */}
          <div className="border rounded-lg flex flex-col max-h-[60vh] lg:max-h-none">
            <div className="p-4 border-b bg-muted/30 flex-shrink-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Pill className="h-4 w-4" />
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0 max-h-[50vh] lg:max-h-[400px]">
              <div className="p-4">
                {isLoadingAdministrations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : administrations.length > 0 ? (
                  <div className="space-y-2">
                    {administrations.map((admin: MedicationAdministration) => (
                      <div
                        key={admin.id}
                        className={`border-l-4 pl-4 py-3 rounded-r-md ${
                          admin.type === 'SOS'
                            ? 'bg-severity-warning/5 border-severity-warning'
                            : admin.wasAdministered
                            ? 'bg-success/5 border-success'
                            : 'bg-danger/5 border-danger'
                        }`}
                      >
                        {/* Linha 1: Horário e Status */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-base min-w-[50px]">
                            {admin.scheduledTime || admin.actualTime || 'SOS'}
                          </span>
                          {admin.type === 'SOS' ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-severity-warning/5 text-severity-warning/80 border-severity-warning/30"
                            >
                              SOS
                            </Badge>
                          ) : (
                            <Badge
                              variant={admin.wasAdministered ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {admin.wasAdministered ? 'Administrado' : 'Não Administrado'}
                            </Badge>
                          )}
                        </div>

                        {/* Linha 2: Nome do Medicamento */}
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {admin.medication?.name || 'Medicamento não especificado'}
                          </span>
                        </div>

                        {/* Linha 3: Dose e Via */}
                        {admin.medication && (
                          <div className="text-xs text-muted-foreground mb-2">
                            <span>{admin.medication.dose}</span>
                            {' • '}
                            <span>{admin.medication.route}</span>
                            {admin.medication.presentation && (
                              <>
                                {' • '}
                                <span>{formatMedicationPresentation(admin.medication.presentation)}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Indicação (apenas SOS) */}
                        {admin.type === 'SOS' && admin.indication && (
                          <div className="mt-2 p-2 bg-severity-warning/10 border border-severity-warning/30 rounded text-xs">
                            <span className="font-medium text-severity-warning/90">Indicação:</span>
                            <p className="text-severity-warning/90 mt-1">
                              {getIndicationLabel(admin.indication)}
                            </p>
                          </div>
                        )}

                        {/* Linha 4: Informações de administração */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Registrado por {admin.administeredBy}</span>
                          <span>•</span>
                          <span>{formatDateTimeSafe(admin.createdAt)}</span>
                        </div>

                        {/* Motivo (se não foi administrado) */}
                        {!admin.wasAdministered && admin.reason && (
                          <div className="mt-2 p-2 bg-danger/10 border border-danger/30 rounded text-xs">
                            <span className="font-medium text-danger/90">Motivo:</span>
                            <p className="text-danger/90 mt-1">{admin.reason}</p>
                          </div>
                        )}

                        {/* Observações */}
                        {admin.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <span className="font-medium">Observações:</span>
                            <p className="text-foreground/80 mt-1">{admin.notes}</p>
                          </div>
                        )}

                        {/* Dupla checagem */}
                        {admin.checkedBy && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">Checado por:</span> {admin.checkedBy}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Pill className="h-12 w-12 text-muted-foreground/50" />
                    <div className="text-muted-foreground font-medium">
                      Nenhuma administração encontrada
                    </div>
                    <p className="text-sm text-muted-foreground/70 text-center max-w-sm">
                      Selecione uma data com indicador verde para visualizar
                      administrações de medicamentos
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
