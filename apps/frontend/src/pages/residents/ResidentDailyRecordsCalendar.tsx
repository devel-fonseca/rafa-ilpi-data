import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { RecordCalendar } from '@/components/calendar/RecordCalendar'
import { useResidentRecordDates } from '@/hooks/useResidentRecordDates'
import { RECORD_TYPE_LABELS, renderRecordSummary } from '@/utils/recordTypeLabels'

export default function ResidentDailyRecordsCalendar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Buscar dados do residente
  const { data: resident, isLoading: isLoadingResident } = useQuery({
    queryKey: ['resident', id],
    queryFn: async () => {
      const response = await api.get(`/residents/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  // Buscar datas com registros para o mês selecionado
  const { data: datesWithRecords = [], isLoading: isLoadingDates } = useResidentRecordDates(
    id,
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
  )

  // Buscar registros do dia selecionado
  const { data: records = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['daily-records', id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${id}/date/${format(selectedDate, 'yyyy-MM-dd')}`,
      )
      return response.data
    },
    enabled: !!id,
  })

  if (isLoadingResident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/residentes/${id}`)}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{resident?.fullName || 'Residente'}</h1>
          <p className="text-sm text-gray-600">Registros Diários - Calendário</p>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Calendário */}
        <div>
          <RecordCalendar
            datesWithRecords={datesWithRecords}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            isLoading={isLoadingDates}
          />
        </div>

        {/* Coluna 2: Registros do Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecords ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record: any) => (
                  <div
                    key={record.id}
                    className={`border-l-4 pl-4 py-3 ${RECORD_TYPE_LABELS[record.type]?.bgColor || 'bg-gray-100'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">{record.time}</span>
                          <Badge
                            variant="outline"
                            className={RECORD_TYPE_LABELS[record.type]?.color}
                          >
                            {RECORD_TYPE_LABELS[record.type]?.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-800 mb-1">
                          {renderRecordSummary(record)}
                        </div>
                        <p className="text-xs text-gray-600">
                          Registrado por: {record.recordedBy}
                        </p>
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic border-l-2 border-gray-300 pl-2">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Calendar className="h-12 w-12 text-gray-300" />
                <div className="text-gray-500 font-medium">Nenhum registro encontrado</div>
                <p className="text-sm text-gray-400 text-center max-w-sm">
                  Selecione uma data com indicador verde para visualizar registros
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
