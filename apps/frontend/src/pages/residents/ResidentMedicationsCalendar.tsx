import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Eye, Pill } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { RecordCalendar } from '@/components/calendar/RecordCalendar'
import { useResidentMedicationDates } from '@/hooks/useResidentMedicationDates'
import { Page, PageHeader } from '@/design-system/components'

export default function ResidentMedicationsCalendar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)

  // Buscar dados do residente
  const { data: resident, isLoading: isLoadingResident } = useQuery({
    queryKey: tenantKey('residents', id),
    queryFn: async () => {
      const response = await api.get(`/residents/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  // Buscar datas com administrações para o mês atual visualizado no calendário
  const { data: datesWithMedications = [], isLoading: isLoadingDates } = useResidentMedicationDates(
    id,
    currentYear,
    currentMonth,
  )

  // Handler para quando o usuário navega entre meses no calendário
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  // Buscar administrações de medicamentos do dia selecionado
  const { data: administrations = [], isLoading: isLoadingAdministrations } = useQuery({
    queryKey: tenantKey('medication-administrations', 'resident', id, format(selectedDate, 'yyyy-MM-dd')),
    queryFn: async () => {
      const response = await api.get(
        `/prescriptions/medication-administrations/resident/${id}/date/${format(selectedDate, 'yyyy-MM-dd')}`,
      )
      return response.data
    },
    enabled: !!id,
  })

  if (isLoadingResident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Page>
      <PageHeader
        title={resident?.fullName || 'Residente'}
        subtitle="Calendário de Medicações"
        onBack={() => navigate(`/dashboard/residentes/${id}`)}
      />

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Calendário */}
        <div>
          <RecordCalendar
            datesWithRecords={datesWithMedications}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onMonthChange={handleMonthChange}
            isLoading={isLoadingDates}
          />
        </div>

        {/* Coluna 2: Administrações do Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAdministrations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : administrations.length > 0 ? (
              <div className="space-y-2">
                {administrations.map((admin: { id: string; type: string; wasAdministered: boolean; [key: string]: unknown }) => (
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
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-wrap">
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
                      <Eye className="h-4 w-4 text-muted-foreground" />
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
                            <span>{admin.medication.presentation}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Indicação (apenas SOS) */}
                    {admin.type === 'SOS' && admin.indication && (
                      <div className="mt-2 p-2 bg-severity-warning/10 border border-severity-warning/30 rounded text-xs">
                        <span className="font-medium text-severity-warning/90">Indicação:</span>
                        <p className="text-severity-warning/90 mt-1">
                          {admin.indication === 'DOR' && 'Dor'}
                          {admin.indication === 'FEBRE' && 'Febre'}
                          {admin.indication === 'ANSIEDADE' && 'Ansiedade'}
                          {admin.indication === 'AGITACAO' && 'Agitação'}
                          {admin.indication === 'NAUSEA' && 'Náusea/Vômito'}
                          {admin.indication === 'INSONIA' && 'Insônia'}
                          {admin.indication === 'OUTRO' && 'Outro'}
                        </p>
                      </div>
                    )}

                    {/* Linha 4: Informações de administração */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Registrado por {admin.administeredBy}</span>
                      <span>•</span>
                      <span>{formatDateTimeSafe(admin.createdAt)}</span>
                    </div>

                    {/* Horário real (se diferente do programado) */}
                    {admin.actualTime && admin.actualTime !== admin.scheduledTime && admin.type !== 'SOS' && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Horário real:</span> {admin.actualTime}
                      </div>
                    )}

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
                <div className="text-muted-foreground font-medium">Nenhuma administração encontrada</div>
                <p className="text-sm text-muted-foreground/70 text-center max-w-sm">
                  Selecione uma data com indicador verde para visualizar administrações de medicamentos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
