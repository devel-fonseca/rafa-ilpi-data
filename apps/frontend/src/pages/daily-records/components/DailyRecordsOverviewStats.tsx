import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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

  // Criar mapa de registros de hoje por residente
  const today = new Date().toISOString().split('T')[0]
  const recordsMap = new Map<string, LatestRecord>()
  latestRecords.forEach((record) => {
    if (record.date === today) {
      recordsMap.set(record.residentId, record)
    }
  })

  // Calcular estatísticas
  const residentsWithRecords = activeResidents.filter((r) => recordsMap.has(r.id))
  const residentsWithoutRecords = activeResidents.filter((r) => !recordsMap.has(r.id))
  const totalRecordsToday = latestRecords.filter((r) => r.date === today).length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Card 1: Residentes com Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Com Registros Hoje</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">{residentsWithRecords.length}</p>
              <p className="text-xs text-gray-500 mt-1">de {activeResidents.length} residentes</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Residentes sem Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Sem Registros Hoje</h3>
              <p className="text-2xl font-bold text-orange-600 mt-1">{residentsWithoutRecords.length}</p>
              <p className="text-xs text-gray-500 mt-1">pendentes de registro</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
              <XCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Total de Registros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total de Registros</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalRecordsToday}</p>
              <p className="text-xs text-gray-500 mt-1">efetuados hoje</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
