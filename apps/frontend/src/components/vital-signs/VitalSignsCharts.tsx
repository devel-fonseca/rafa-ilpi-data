import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface VitalSignData {
  id: string
  timestamp: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
}

interface VitalSignsChartsProps {
  data: VitalSignData[]
}

export function VitalSignsCharts({ data }: VitalSignsChartsProps) {
  // Preparar dados para os gráficos
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((item) => ({
        date: format(new Date(item.timestamp), 'dd/MM HH:mm', { locale: ptBR }),
        timestamp: new Date(item.timestamp).getTime(),
        systolic: item.systolicBloodPressure,
        diastolic: item.diastolicBloodPressure,
        temperature: item.temperature,
        heartRate: item.heartRate,
        oxygenSaturation: item.oxygenSaturation,
        bloodGlucose: item.bloodGlucose,
      }))
  }, [data])

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {getUnit(entry.dataKey)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getUnit = (dataKey: string) => {
    switch (dataKey) {
      case 'systolic':
      case 'diastolic':
        return 'mmHg'
      case 'temperature':
        return '°C'
      case 'heartRate':
        return 'bpm'
      case 'oxygenSaturation':
        return '%'
      case 'bloodGlucose':
        return 'mg/dL'
      default:
        return ''
    }
  }

  if (data.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sem dados disponíveis</AlertTitle>
        <AlertDescription>
          Não há registros de sinais vitais para o período selecionado.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de Pressão Arterial */}
      <Card>
        <CardHeader>
          <CardTitle>Pressão Arterial</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 200]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={140} stroke="orange" strokeDasharray="5 5" label="PA Alta" />
              <ReferenceLine y={90} stroke="orange" strokeDasharray="5 5" label="PA Baixa" />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#ef4444"
                name="Sistólica"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke="#3b82f6"
                name="Diastólica"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Glicemia */}
      <Card>
        <CardHeader>
          <CardTitle>Glicemia</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 300]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={180} stroke="red" strokeDasharray="5 5" label="Hiperglicemia" />
              <ReferenceLine y={70} stroke="orange" strokeDasharray="5 5" label="Hipoglicemia" />
              <Line
                type="monotone"
                dataKey="bloodGlucose"
                stroke="#10b981"
                name="Glicemia"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráficos de Temperatura e Frequência Cardíaca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[34, 40]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={37.5} stroke="orange" strokeDasharray="5 5" label="Febre" />
                <ReferenceLine y={35.5} stroke="blue" strokeDasharray="5 5" label="Hipotermia" />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  name="Temperatura"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequência Cardíaca</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[40, 120]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={100} stroke="orange" strokeDasharray="5 5" label="Taquicardia" />
                <ReferenceLine y={60} stroke="orange" strokeDasharray="5 5" label="Bradicardia" />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ec4899"
                  name="FC"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Saturação de Oxigênio */}
      <Card>
        <CardHeader>
          <CardTitle>Saturação de Oxigênio</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[85, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={92} stroke="red" strokeDasharray="5 5" label="Baixa saturação" />
              <Line
                type="monotone"
                dataKey="oxygenSaturation"
                stroke="#06b6d4"
                name="SpO₂"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}