import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useDailyRecordsByDate } from '@/hooks/useDailyRecords'

interface Resident {
  id: string
  fullName: string
  status: string
}

interface LatestRecord {
  residentId: string
  date: string
}

interface DailyRecordsOverviewStatsProps {
  residents: Resident[]
  latestRecords: LatestRecord[]
}

export function DailyRecordsOverviewStats({
  residents,
  latestRecords,
}: DailyRecordsOverviewStatsProps) {
  // Filtrar apenas residentes ativos
  const activeResidents = residents.filter((r) => r.status === 'Ativo')

  // Buscar todos os registros de hoje para contar total correto de atividades
  const today = new Date().toISOString().split('T')[0]
  const { data: allRecordsToday } = useDailyRecordsByDate(today)

  // Se houver erro ou dados indefinidos, usar array vazio
  const safeAllRecordsToday = Array.isArray(allRecordsToday) ? allRecordsToday : []

  // Criar Set de residentes que tiveram algum registro de hoje
  // Usar latestRecords para contar residentes únicos com registros
  const residentsWithRecordsSet = new Set<string>()

  latestRecords.forEach((record) => {
    // Verificar se o registro é de hoje comparando a data
    const recordDate = record.date ? String(record.date).split('T')[0] : ''
    if (recordDate === today) {
      residentsWithRecordsSet.add(record.residentId)
    }
  })

  // Calcular estatísticas
  const residentsWithRecords = activeResidents.filter((r) =>
    residentsWithRecordsSet.has(r.id)
  )
  const residentsWithoutRecords = activeResidents.filter(
    (r) => !residentsWithRecordsSet.has(r.id)
  )
  // Total de registros é a contagem de TODOS os registros do dia
  const totalRecordsToday = safeAllRecordsToday.length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Card 1: Residentes com Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Residentes com registros</h3>
              <p className="text-2xl font-bold text-success mt-1">{residentsWithRecords.length}</p>
              <p className="text-xs text-muted-foreground mt-1">de {activeResidents.length} residentes ativos</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Residentes sem Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Residentes sem registros</h3>
              <p className="text-2xl font-bold text-warning mt-1">{residentsWithoutRecords.length}</p>
              <p className="text-xs text-muted-foreground mt-1">pendentes de registros hoje</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg">
              <XCircle className="h-6 w-6 text-warning" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Total de Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Total de registros</h3>
              <p className="text-2xl font-bold text-primary mt-1">{totalRecordsToday}</p>
              <p className="text-xs text-muted-foreground mt-1">lançados hoje</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
