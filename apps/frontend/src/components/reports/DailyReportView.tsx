import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { DailyReport } from '@/types/reports'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bath,
  Utensils,
  Droplet,
  Activity,
  Pill,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface DailyReportViewProps {
  report: DailyReport
}

export function DailyReportView({ report }: DailyReportViewProps) {
  const { summary, dailyRecords, medicationAdministrations, vitalSigns } = report
  const [isDailyRecordsOpen, setIsDailyRecordsOpen] = useState(true)
  const [isMedicationsOpen, setIsMedicationsOpen] = useState(true)
  const [isVitalSignsOpen, setIsVitalSignsOpen] = useState(true)

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const getRecordTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ElementType> = {
      HIGIENE: Bath,
      ALIMENTACAO: Utensils,
      HIDRATACAO: Droplet,
      MONITORAMENTO: Activity,
      INTERCORRENCIA: AlertTriangle,
    }
    return iconMap[type] || Activity
  }

  const getRecordTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      HIGIENE: 'Higiene',
      ALIMENTACAO: 'Alimentação',
      HIDRATACAO: 'Hidratação',
      MONITORAMENTO: 'Monitoramento',
      INTERCORRENCIA: 'Intercorrência',
    }
    return labelMap[type] || type
  }

  const formatRecordDetails = (type: string, details: Record<string, any>) => {
    switch (type) {
      case 'HIGIENE':
        return `Banho: ${details.tipoBanho || 'N/A'}, ${details.duracao || 0}min | Pele: ${details.condicaoPele || 'N/A'}`
      case 'ALIMENTACAO':
        return `${details.refeicao || 'Refeição'} | Ingestão: ${details.ingeriu || 'N/A'} | ${details.volumeMl || 0}ml`
      case 'HIDRATACAO':
        return `${details.tipo || 'Líquido'} | ${details.volumeMl || 0}ml`
      case 'MONITORAMENTO':
        return `PA: ${details.pressaoArterial || 'N/A'} | FC: ${details.frequenciaCardiaca || 'N/A'} bpm | Tax: ${details.temperatura || 'N/A'}°C | SpO2: ${details.saturacaoO2 || 'N/A'}% | Gli: ${details.glicemia || 'N/A'} mg/dL`
      case 'INTERCORRENCIA':
        return (
          <div className="space-y-1">
            <div><strong>Descrição:</strong> {details.descricao || 'N/A'}</div>
            {details.acaoTomada && (
              <div><strong>Ação Tomada:</strong> {details.acaoTomada}</div>
            )}
          </div>
        )
      default:
        return JSON.stringify(details)
    }
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Cabeçalho do Relatório */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Relatório Diário - {formatDate(summary.date)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gerado em {formatDateTime(new Date().toISOString())}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Resumo Executivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Total de Residentes
              </div>
              <p className="text-2xl font-bold">{summary.totalResidents}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Registros Diários
              </div>
              <p className="text-2xl font-bold">{summary.totalDailyRecords}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Pill className="h-4 w-4" />
                Medicações
              </div>
              <p className="text-2xl font-bold">
                {summary.totalMedicationsAdministered}/{summary.totalMedicationsScheduled}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bath className="h-4 w-4" />
                Cobertura Higiene
              </div>
              <p className="text-2xl font-bold">{summary.hygieneCoverage}%</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Utensils className="h-4 w-4" />
                Cobertura Alimentação
              </div>
              <p className="text-xl font-semibold">{summary.feedingCoverage}%</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Cobertura Sinais Vitais
              </div>
              <p className="text-xl font-semibold">{summary.vitalSignsCoverage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Registros Diários */}
      <Collapsible open={isDailyRecordsOpen} onOpenChange={setIsDailyRecordsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle>Registros Diários ({dailyRecords.length})</CardTitle>
                <Button variant="ghost" size="sm">
                  {isDailyRecordsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {dailyRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Residente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Registrado Por</TableHead>
                        <TableHead className="min-w-[300px]">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyRecords.map((record, index) => {
                        const Icon = getRecordTypeIcon(record.type)
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {record.residentName} ({record.bedCode})
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {getRecordTypeLabel(record.type)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{record.time}</TableCell>
                            <TableCell className="text-sm">
                              {record.recordedBy}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>
                                {formatRecordDetails(record.type, record.details)}
                                {record.notes && (
                                  <div className="mt-1 text-xs text-muted-foreground italic">
                                    Obs: {record.notes}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tabela de Medicações */}
      <Collapsible open={isMedicationsOpen} onOpenChange={setIsMedicationsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Administração de Medicamentos ({medicationAdministrations.length})
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {isMedicationsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {medicationAdministrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma medicação administrada.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Residente</TableHead>
                        <TableHead>Medicamento</TableHead>
                        <TableHead>Dose</TableHead>
                        <TableHead>Via</TableHead>
                        <TableHead>Hora Prog.</TableHead>
                        <TableHead>Hora Real</TableHead>
                        <TableHead>Administrado Por</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medicationAdministrations.map((med, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {med.residentName} ({med.bedCode})
                          </TableCell>
                          <TableCell className="font-medium">
                            {med.medicationName}
                          </TableCell>
                          <TableCell className="text-sm">{med.dose}</TableCell>
                          <TableCell className="text-sm">{med.route}</TableCell>
                          <TableCell className="text-sm">
                            {med.scheduledTime}
                          </TableCell>
                          <TableCell className="text-sm">
                            {med.actualTime || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {med.administeredBy || '-'}
                          </TableCell>
                          <TableCell>
                            {med.wasAdministered ? (
                              <Badge variant="default" className="bg-success">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Administrado
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Não Administrado
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Sinais Vitais */}
      {vitalSigns.length > 0 && (
        <Collapsible open={isVitalSignsOpen} onOpenChange={setIsVitalSignsOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Sinais Vitais ({vitalSigns.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    {isVitalSignsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Residente</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>PA (mmHg)</TableHead>
                        <TableHead>FC (bpm)</TableHead>
                        <TableHead>Tax (°C)</TableHead>
                        <TableHead>SpO2 (%)</TableHead>
                        <TableHead>Gli (mg/dL)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vitalSigns.map((vital, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {vital.residentName} ({vital.bedCode})
                          </TableCell>
                          <TableCell className="text-sm">{vital.time}</TableCell>
                          <TableCell className="text-sm">
                            {vital.bloodPressure || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {vital.heartRate || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {vital.temperature || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {vital.oxygenSaturation || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {vital.glucose || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
