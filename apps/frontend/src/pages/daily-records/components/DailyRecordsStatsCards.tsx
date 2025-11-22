import { Activity, AlertCircle, Smile, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DailyRecord {
  id: string
  type: string
  time: string
  data: any
  notes?: string
  recordedBy: string
}

interface DailyRecordsStatsCardsProps {
  records: DailyRecord[]
}

export function DailyRecordsStatsCards({ records }: DailyRecordsStatsCardsProps) {
  if (!records || records.length === 0) {
    return null
  }

  // Contar registros por tipo
  const recordCounts = records.reduce(
    (acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Total de registros
  const totalRecords = records.length

  // Alertas e intercorrências
  const alertsCount = (recordCounts['INTERCORRENCIA'] || 0) + (recordCounts['MONITORAMENTO'] || 0)

  // Atividades registradas
  const activitiesCount = recordCounts['ATIVIDADES'] || 0

  // Comportamento
  const behaviorCount = recordCounts['COMPORTAMENTO'] || 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Card: Total de Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total de Registros</h3>
              <p className="text-2xl font-bold text-blue-600">{totalRecords}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card: Alertas e Intercorrências */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-12 h-12 ${
              alertsCount > 0 ? 'bg-red-100' : 'bg-green-100'
            } rounded-lg`}>
              <AlertCircle className={`h-6 w-6 ${
                alertsCount > 0 ? 'text-red-600' : 'text-green-600'
              }`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Alertas e Intercorrências</h3>
              <p className={`text-2xl font-bold ${
                alertsCount > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {alertsCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card: Atividades */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Atividades Registradas</h3>
              <p className="text-2xl font-bold text-purple-600">{activitiesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card: Comportamento */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-lg">
              <Smile className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Notas de Comportamento</h3>
              <p className="text-2xl font-bold text-amber-600">{behaviorCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
