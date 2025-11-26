import React, { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Activity,
  Thermometer,
  Heart,
  Droplet,
  TrendingUp,
  Bell,
  BellOff,
  Edit,
  Check,
  X,
} from 'lucide-react'

interface VitalSignData {
  id: string
  timestamp: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
  notes?: string
}

interface VitalSignsAlertsProps {
  data: VitalSignData[]
  residentId: string
}

interface AlertItem {
  id: string
  timestamp: string
  type: 'pressure' | 'temperature' | 'heartRate' | 'oxygen' | 'glucose'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  value: string
  status: 'active' | 'resolved' | 'ignored'
  notes?: string
}

export function VitalSignsAlerts({ data, residentId }: VitalSignsAlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)
  const [alertNotes, setAlertNotes] = useState('')
  const [alertStatus, setAlertStatus] = useState<'active' | 'resolved' | 'ignored'>('active')
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved' | 'ignored'>('all')

  // Gerar alertas baseados nos dados
  const alerts = useMemo<AlertItem[]>(() => {
    const alertsList: AlertItem[] = []

    data.forEach((record) => {
      const timestamp = record.timestamp

      // Alertas de Pressão Arterial
      if (record.systolicBloodPressure) {
        if (record.systolicBloodPressure >= 180) {
          alertsList.push({
            id: `${record.id}-pa-critical`,
            timestamp,
            type: 'pressure',
            severity: 'high',
            title: 'Crise Hipertensiva',
            description: 'Pressão arterial em níveis críticos, requer atenção imediata',
            value: `${record.systolicBloodPressure}/${record.diastolicBloodPressure || '?'} mmHg`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.systolicBloodPressure >= 140) {
          alertsList.push({
            id: `${record.id}-pa-high`,
            timestamp,
            type: 'pressure',
            severity: 'medium',
            title: 'Hipertensão',
            description: 'Pressão arterial elevada',
            value: `${record.systolicBloodPressure}/${record.diastolicBloodPressure || '?'} mmHg`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.systolicBloodPressure < 90) {
          alertsList.push({
            id: `${record.id}-pa-low`,
            timestamp,
            type: 'pressure',
            severity: 'medium',
            title: 'Hipotensão',
            description: 'Pressão arterial baixa',
            value: `${record.systolicBloodPressure}/${record.diastolicBloodPressure || '?'} mmHg`,
            status: 'active',
            notes: record.notes,
          })
        }
      }

      // Alertas de Temperatura
      if (record.temperature) {
        if (record.temperature >= 39) {
          alertsList.push({
            id: `${record.id}-temp-high`,
            timestamp,
            type: 'temperature',
            severity: 'high',
            title: 'Febre Alta',
            description: 'Temperatura corporal muito elevada',
            value: `${record.temperature}°C`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.temperature >= 37.8) {
          alertsList.push({
            id: `${record.id}-temp-medium`,
            timestamp,
            type: 'temperature',
            severity: 'low',
            title: 'Febre',
            description: 'Temperatura corporal elevada',
            value: `${record.temperature}°C`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.temperature < 35) {
          alertsList.push({
            id: `${record.id}-temp-low`,
            timestamp,
            type: 'temperature',
            severity: 'high',
            title: 'Hipotermia',
            description: 'Temperatura corporal muito baixa',
            value: `${record.temperature}°C`,
            status: 'active',
            notes: record.notes,
          })
        }
      }

      // Alertas de Frequência Cardíaca
      if (record.heartRate) {
        if (record.heartRate >= 120) {
          alertsList.push({
            id: `${record.id}-hr-high`,
            timestamp,
            type: 'heartRate',
            severity: 'high',
            title: 'Taquicardia Severa',
            description: 'Frequência cardíaca muito elevada',
            value: `${record.heartRate} bpm`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.heartRate >= 100) {
          alertsList.push({
            id: `${record.id}-hr-medium`,
            timestamp,
            type: 'heartRate',
            severity: 'medium',
            title: 'Taquicardia',
            description: 'Frequência cardíaca elevada',
            value: `${record.heartRate} bpm`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.heartRate < 50) {
          alertsList.push({
            id: `${record.id}-hr-low`,
            timestamp,
            type: 'heartRate',
            severity: 'medium',
            title: 'Bradicardia',
            description: 'Frequência cardíaca baixa',
            value: `${record.heartRate} bpm`,
            status: 'active',
            notes: record.notes,
          })
        }
      }

      // Alertas de Saturação de Oxigênio
      if (record.oxygenSaturation) {
        if (record.oxygenSaturation < 88) {
          alertsList.push({
            id: `${record.id}-spo2-critical`,
            timestamp,
            type: 'oxygen',
            severity: 'high',
            title: 'Hipóxia Severa',
            description: 'Saturação de oxigênio criticamente baixa',
            value: `${record.oxygenSaturation}%`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.oxygenSaturation < 92) {
          alertsList.push({
            id: `${record.id}-spo2-low`,
            timestamp,
            type: 'oxygen',
            severity: 'medium',
            title: 'Hipóxia',
            description: 'Saturação de oxigênio baixa',
            value: `${record.oxygenSaturation}%`,
            status: 'active',
            notes: record.notes,
          })
        }
      }

      // Alertas de Glicemia
      if (record.bloodGlucose) {
        if (record.bloodGlucose >= 250) {
          alertsList.push({
            id: `${record.id}-glucose-critical`,
            timestamp,
            type: 'glucose',
            severity: 'high',
            title: 'Hiperglicemia Severa',
            description: 'Nível de glicose muito alto, risco de cetoacidose',
            value: `${record.bloodGlucose} mg/dL`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.bloodGlucose >= 180) {
          alertsList.push({
            id: `${record.id}-glucose-high`,
            timestamp,
            type: 'glucose',
            severity: 'medium',
            title: 'Hiperglicemia',
            description: 'Nível de glicose elevado',
            value: `${record.bloodGlucose} mg/dL`,
            status: 'active',
            notes: record.notes,
          })
        } else if (record.bloodGlucose < 70) {
          alertsList.push({
            id: `${record.id}-glucose-low`,
            timestamp,
            type: 'glucose',
            severity: 'high',
            title: 'Hipoglicemia',
            description: 'Nível de glicose baixo',
            value: `${record.bloodGlucose} mg/dL`,
            status: 'active',
            notes: record.notes,
          })
        }
      }
    })

    return alertsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [data])

  // Filtrar alertas
  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false
    return true
  })

  // Agrupar alertas por severidade
  const alertsBySeverity = {
    high: filteredAlerts.filter(a => a.severity === 'high').length,
    medium: filteredAlerts.filter(a => a.severity === 'medium').length,
    low: filteredAlerts.filter(a => a.severity === 'low').length,
  }

  // Ícone por tipo
  const getIcon = (type: string) => {
    switch (type) {
      case 'pressure':
        return <Activity className="h-4 w-4" />
      case 'temperature':
        return <Thermometer className="h-4 w-4" />
      case 'heartRate':
        return <Heart className="h-4 w-4" />
      case 'oxygen':
        return <Droplet className="h-4 w-4" />
      case 'glucose':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  // Cor por severidade
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'warning'
      case 'low':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const handleAlertAction = (alert: AlertItem) => {
    setSelectedAlert(alert)
    setAlertNotes(alert.notes || '')
    setAlertStatus(alert.status)
  }

  const handleSaveAlertChanges = () => {
    // Aqui você faria a chamada para salvar as mudanças no backend
    console.log('Salvando alterações do alerta:', {
      alertId: selectedAlert?.id,
      status: alertStatus,
      notes: alertNotes,
    })
    setSelectedAlert(null)
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.length}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Alta Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertsBySeverity.high}</div>
            <p className="text-xs text-muted-foreground">requerem atenção imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Média Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertsBySeverity.medium}</div>
            <p className="text-xs text-muted-foreground">monitoramento necessário</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Baixa Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{alertsBySeverity.low}</div>
            <p className="text-xs text-muted-foreground">observação</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filterSeverity} onValueChange={(value: any) => setFilterSeverity(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Severidades</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="ignored">Ignorados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertTitle>Sem alertas</AlertTitle>
            <AlertDescription>
              Não há alertas para o período e filtros selecionados.
            </AlertDescription>
          </Alert>
        ) : (
          filteredAlerts.map((alert) => (
            <Alert key={alert.id} className="relative">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getIcon(alert.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTitle className="mb-0">{alert.title}</AlertTitle>
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity === 'high' && 'Alta'}
                      {alert.severity === 'medium' && 'Média'}
                      {alert.severity === 'low' && 'Baixa'}
                    </Badge>
                    <Badge variant="outline">{alert.value}</Badge>
                    {alert.status === 'resolved' && (
                      <Badge variant="secondary">
                        <Check className="h-3 w-3 mr-1" />
                        Resolvido
                      </Badge>
                    )}
                    {alert.status === 'ignored' && (
                      <Badge variant="secondary">
                        <BellOff className="h-3 w-3 mr-1" />
                        Ignorado
                      </Badge>
                    )}
                  </div>
                  <AlertDescription className="mb-2">
                    {alert.description}
                  </AlertDescription>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(alert.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAlertAction(alert)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Gerenciar
                    </Button>
                  </div>
                  {alert.notes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Observações:</strong> {alert.notes}
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          ))
        )}
      </div>

      {/* Modal de Gerenciamento de Alerta */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Alerta</DialogTitle>
            <DialogDescription>
              Atualize o status e adicione observações sobre este alerta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedAlert?.title}</p>
              <p className="text-sm text-muted-foreground">{selectedAlert?.description}</p>
              <Badge variant={getSeverityColor(selectedAlert?.severity || '')}>
                {selectedAlert?.value}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={alertStatus} onValueChange={(value: any) => setAlertStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="ignored">Ignorar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={alertNotes}
                onChange={(e) => setAlertNotes(e.target.value)}
                placeholder="Adicione observações sobre este alerta..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAlertChanges}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}