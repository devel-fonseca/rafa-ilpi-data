import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { useResident } from '@/hooks/useResidents'
import { Page, PageHeader } from '@/design-system/components'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { VitalSignsCharts } from '@/components/vital-signs/VitalSignsCharts'
import { VitalSignsTable } from '@/components/vital-signs/VitalSignsTable'
import { VitalSignsAlerts } from '@/components/vital-signs/VitalSignsAlerts'
import { Sparkline } from '@/components/vital-signs/Sparkline'
import { api } from '@/services/api'

interface VitalSignData {
  id: string
  timestamp: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
  recordedBy?: string
  notes?: string
}

export function VitalSignsPage() {
  const { residentId } = useParams<{ residentId: string }>()
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState('7')
  const [activeTab, setActiveTab] = useState('summary')

  // Buscar dados do residente
  const { data: resident, isLoading: isLoadingResident } = useResident(residentId || '')

  // Calcular datas baseado no período selecionado
  const getDateRange = () => {
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), parseInt(selectedPeriod)))
    return { startDate, endDate }
  }

  // Buscar dados de sinais vitais
  const { data: vitalSigns, isLoading } = useQuery({
    queryKey: ['vital-signs', residentId, selectedPeriod],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange()
      const response = await api.get(`/vital-signs/resident/${residentId}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      })
      return response.data as VitalSignData[]
    },
    enabled: !!residentId,
  })

  // Calcular estatísticas
  const calculateStats = () => {
    if (!vitalSigns || vitalSigns.length === 0) {
      return {
        avgSystolic: 0,
        avgDiastolic: 0,
        avgGlucose: 0,
        criticalAlerts: 0,
        lastRecord: null,
        trend: 'Sem dados',
      }
    }

    const validSystolic = vitalSigns.filter(v => v.systolicBloodPressure).map(v => v.systolicBloodPressure!)
    const validDiastolic = vitalSigns.filter(v => v.diastolicBloodPressure).map(v => v.diastolicBloodPressure!)
    const validGlucose = vitalSigns.filter(v => v.bloodGlucose).map(v => v.bloodGlucose!)

    // Contar alertas críticos
    let criticalAlerts = 0
    vitalSigns.forEach(v => {
      if (v.systolicBloodPressure && (v.systolicBloodPressure >= 140 || v.systolicBloodPressure < 90)) criticalAlerts++
      if (v.bloodGlucose && (v.bloodGlucose >= 180 || v.bloodGlucose < 70)) criticalAlerts++
      if (v.temperature && (v.temperature >= 38 || v.temperature < 35)) criticalAlerts++
      if (v.oxygenSaturation && v.oxygenSaturation < 92) criticalAlerts++
    })

    // Determinar tendência
    let trend = 'Estável'
    if (validSystolic.length >= 3) {
      const recent = validSystolic.slice(-3)
      const older = validSystolic.slice(-6, -3)
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
        if (recentAvg > olderAvg + 5) trend = 'Tendência de aumento da PA'
        else if (recentAvg < olderAvg - 5) trend = 'Tendência de redução da PA'
      }
    }

    return {
      avgSystolic: validSystolic.length > 0 ? Math.round(validSystolic.reduce((a, b) => a + b, 0) / validSystolic.length) : 0,
      avgDiastolic: validDiastolic.length > 0 ? Math.round(validDiastolic.reduce((a, b) => a + b, 0) / validDiastolic.length) : 0,
      avgGlucose: validGlucose.length > 0 ? Math.round(validGlucose.reduce((a, b) => a + b, 0) / validGlucose.length) : 0,
      criticalAlerts,
      lastRecord: vitalSigns[0] || null,
      trend,
    }
  }

  const stats = calculateStats()

  // Preparar dados para os sparklines (últimos 7 dias)
  const sparklineData = useMemo(() => {
    if (!vitalSigns || vitalSigns.length === 0) {
      return {
        bloodPressure: [],
        temperature: [],
        glucose: [],
      }
    }

    const sevenDaysAgo = subDays(new Date(), 7)
    const recentData = vitalSigns
      .filter(v => parseISO(v.timestamp) >= sevenDaysAgo)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    return {
      bloodPressure: recentData
        .filter(v => v.systolicBloodPressure)
        .map(v => ({ value: v.systolicBloodPressure! })),
      temperature: recentData
        .filter(v => v.temperature)
        .map(v => ({ value: v.temperature! })),
      glucose: recentData
        .filter(v => v.bloodGlucose)
        .map(v => ({ value: v.bloodGlucose! })),
    }
  }, [vitalSigns])

  if (isLoadingResident || !resident) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Page>
    )
  }

  return (
    <Page maxWidth="wide">
      <PageHeader
        title={`Sinais Vitais - ${resident.fullName}`}
        subtitle="Visualização completa de gráficos, tabelas e histórico de sinais vitais"
        onBack={() => navigate(`/dashboard/residentes/${residentId}`)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
          <div className="overflow-x-auto w-full sm:w-auto">
            <TabsList className="inline-flex sm:grid sm:grid-cols-4 min-w-max">
              <TabsTrigger value="summary" className="whitespace-nowrap">Resumo</TabsTrigger>
              <TabsTrigger value="charts" className="whitespace-nowrap">Gráficos</TabsTrigger>
              <TabsTrigger value="table" className="whitespace-nowrap">Tabela</TabsTrigger>
              <TabsTrigger value="alerts" className="whitespace-nowrap">Alertas</TabsTrigger>
            </TabsList>
          </div>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Aba Resumo */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Média PA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgSystolic}/{stats.avgDiastolic}
                </div>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Média Glicemia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgGlucose}</div>
                <p className="text-xs text-muted-foreground">mg/dL</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">{stats.criticalAlerts}</div>
                <p className="text-xs text-muted-foreground">nos últimos {selectedPeriod} dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tendência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {stats.trend.includes('aumento') && <TrendingUp className="h-5 w-5 text-orange-500" />}
                  {stats.trend.includes('redução') && <TrendingDown className="h-5 w-5 text-success" />}
                  {stats.trend === 'Estável' && <Activity className="h-5 w-5 text-primary" />}
                  <span className="text-sm font-medium">{stats.trend}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Último registro */}
          {stats.lastRecord && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Último Registro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {formatDateTimeSafe(stats.lastRecord.timestamp)}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {stats.lastRecord.systolicBloodPressure && (
                      <Badge variant="outline">
                        PA: {stats.lastRecord.systolicBloodPressure}/{stats.lastRecord.diastolicBloodPressure}
                      </Badge>
                    )}
                    {stats.lastRecord.temperature && (
                      <Badge variant="outline">Temp: {stats.lastRecord.temperature}°C</Badge>
                    )}
                    {stats.lastRecord.heartRate && (
                      <Badge variant="outline">FC: {stats.lastRecord.heartRate} bpm</Badge>
                    )}
                    {stats.lastRecord.oxygenSaturation && (
                      <Badge variant="outline">SpO₂: {stats.lastRecord.oxygenSaturation}%</Badge>
                    )}
                    {stats.lastRecord.bloodGlucose && (
                      <Badge variant="outline">Glicemia: {stats.lastRecord.bloodGlucose} mg/dL</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mini gráficos (Sparklines) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">PA Sistólica - Últimos 7 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <Sparkline
                  data={sparklineData.bloodPressure}
                  color="#ef4444"
                  height={60}
                  domain={[80, 180]}
                  unit="mmHg"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Temperatura - Últimos 7 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <Sparkline
                  data={sparklineData.temperature}
                  color="#f59e0b"
                  height={60}
                  domain={[35, 40]}
                  unit="°C"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Glicemia - Últimos 7 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <Sparkline
                  data={sparklineData.glucose}
                  color="#10b981"
                  height={60}
                  domain={[50, 250]}
                  unit="mg/dL"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Gráficos */}
        <TabsContent value="charts">
          <VitalSignsCharts data={vitalSigns || []} />
        </TabsContent>

        {/* Aba Tabela */}
        <TabsContent value="table">
          <VitalSignsTable data={vitalSigns || []} residentName={resident.fullName} />
        </TabsContent>

        {/* Aba Alertas */}
        <TabsContent value="alerts">
          <VitalSignsAlerts residentId={residentId || ''} />
        </TabsContent>
      </Tabs>
    </Page>
  )
}
