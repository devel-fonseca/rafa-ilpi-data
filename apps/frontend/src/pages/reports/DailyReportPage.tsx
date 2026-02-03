import { useState } from 'react'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Loader2 } from 'lucide-react'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useQuery } from '@tanstack/react-query'
import { getDailyReport } from '@/services/reportsApi'
import { DailyReportView } from '@/components/reports/DailyReportView'

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate())
  const [dateToFetch, setDateToFetch] = useState<string | null>(null)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['daily-report', dateToFetch],
    queryFn: () => getDailyReport(dateToFetch!),
    enabled: !!dateToFetch,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const handleGenerateReport = () => {
    if (selectedDate) {
      setDateToFetch(selectedDate)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Relatório Diário"
        subtitle="Visualize todos os registros, medicações e sinais vitais de um dia específico"
      />

      {/* Seletor de Data */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selecione a Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="report-date">Data do Relatório</Label>
              <Input
                id="report-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getCurrentDate()}
              />
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={!selectedDate || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Relatório'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualização do Relatório */}
      {error && (
        <Card className="border-danger">
          <CardContent className="pt-6">
            <p className="text-danger text-center">
              Erro ao carregar relatório. Por favor, tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {report && <DailyReportView report={report} />}

      {!report && !isLoading && !error && dateToFetch && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Nenhum registro encontrado para esta data.
            </p>
          </CardContent>
        </Card>
      )}
    </Page>
  )
}
