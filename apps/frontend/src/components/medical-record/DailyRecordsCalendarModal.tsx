// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - DailyRecordsCalendarModal (Calendário de Registros Diários)
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
import { Calendar, Eye, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { RecordCalendar } from '@/components/calendar/RecordCalendar'
import { useResidentRecordDates } from '@/hooks/useResidentRecordDates'
import { getRecordTypeLabel } from '@/utils/recordTypeLabels'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import type { DailyRecord } from '@/api/dailyRecords.api'

// ========== TYPES ==========

interface DailyRecordsCalendarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName: string
  initialDate?: Date
  onDateSelect?: (date: string) => void
  onViewRecord?: (record: DailyRecord) => void
}

// ========== COMPONENT ==========

export function DailyRecordsCalendarModal({
  open,
  onOpenChange,
  residentId,
  residentName,
  initialDate,
  onDateSelect,
  onViewRecord,
}: DailyRecordsCalendarModalProps) {
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

  // Buscar datas com registros para o mês atual
  const { data: datesWithRecords = [], isLoading: isLoadingDates } =
    useResidentRecordDates(residentId, currentYear, currentMonth, open)

  // Buscar registros do dia selecionado
  const {
    data: records = [],
    isLoading: isLoadingRecords,
  } = useQuery({
    queryKey: tenantKey(
      'daily-records',
      'resident',
      residentId,
      format(selectedDate, 'yyyy-MM-dd')
    ),
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${residentId}/date/${format(selectedDate, 'yyyy-MM-dd')}`
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
    // Clique simples: apenas seleciona a data para visualizar registros
    setSelectedDate(date)
    setCurrentYear(date.getFullYear())
    setCurrentMonth(date.getMonth() + 1)
  }

  const handleDateDoubleClick = (date: Date) => {
    // Duplo clique: navega para a data e fecha o modal
    onDateSelect?.(format(date, 'yyyy-MM-dd'))
    onOpenChange(false)
  }

  const handleRecordClick = (record: DailyRecord) => {
    if (onViewRecord) {
      onViewRecord(record)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendário de Registros - {residentName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 flex-1 overflow-y-auto min-h-0">
          {/* Coluna 1: Calendário */}
          <div>
            <RecordCalendar
              datesWithRecords={datesWithRecords}
              selectedDate={selectedDate}
              initialMonth={selectedDate}
              onDateSelect={handleDateSelect}
              onDateDoubleClick={handleDateDoubleClick}
              onMonthChange={handleMonthChange}
              isLoading={isLoadingDates}
            />
          </div>

          {/* Coluna 2: Registros do Dia */}
          <div className="border rounded-lg flex flex-col max-h-[60vh] lg:max-h-none">
            <div className="p-4 border-b bg-muted/30 flex-shrink-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0 max-h-[50vh] lg:max-h-[400px]">
              <div className="p-4">
                {isLoadingRecords ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : records.length > 0 ? (
                  <div className="space-y-2">
                    {records.map((record: DailyRecord) => (
                      <div
                        key={record.id}
                        onClick={() => handleRecordClick(record)}
                        className={`border-l-4 pl-4 py-2 rounded-r-md cursor-pointer transition-all hover:shadow-md ${getRecordTypeLabel(record.type).bgColor}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-base min-w-[50px]">
                            {record.time}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${getRecordTypeLabel(record.type).color} text-xs`}
                          >
                            {getRecordTypeLabel(record.type).label}
                          </Badge>
                          <Eye className="h-4 w-4 text-muted-foreground ml-auto" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>Registrado por {record.recordedBy}</span>
                          <span>•</span>
                          <span>{formatDateTimeSafe(record.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Calendar className="h-12 w-12 text-muted-foreground/50" />
                    <div className="text-muted-foreground font-medium">
                      Nenhum registro encontrado
                    </div>
                    <p className="text-sm text-muted-foreground/70 text-center max-w-sm">
                      Selecione uma data com indicador verde para visualizar
                      registros
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
