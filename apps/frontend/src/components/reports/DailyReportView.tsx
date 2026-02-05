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
import type { DailyReport, MultiDayReport, ShiftReport } from '@/types/reports'
import { formatDateOnlySafe, getCurrentDateTime } from '@/utils/dateHelpers'
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels'
import {
  Bath,
  Utensils,
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
  multiDayReport: MultiDayReport
}

interface SingleDayCardProps {
  report: DailyReport
  isExpanded: boolean
  onToggle: () => void
  dayOfWeek: string
}

// Definição da ordem e agrupamento de categorias
const CATEGORY_CONFIG = [
  {
    id: 'INTERCORRENCIA',
    title: 'INTERCORRÊNCIAS',
    types: ['INTERCORRENCIA'],
    styleType: 'INTERCORRENCIA',
    icon: AlertTriangle,
    priority: 1,
    alwaysExpanded: true,
  },
  {
    id: 'MONITORAMENTO',
    title: 'MONITORAMENTO (SINAIS VITAIS)',
    types: ['MONITORAMENTO'],
    styleType: 'MONITORAMENTO',
    icon: Activity,
    priority: 2,
  },
  {
    id: 'HIGIENE',
    title: 'HIGIENE',
    types: ['HIGIENE'],
    styleType: 'HIGIENE',
    icon: Bath,
    priority: 3,
  },
  {
    id: 'ALIMENTACAO',
    title: 'ALIMENTAÇÃO + HIDRATAÇÃO',
    types: ['ALIMENTACAO', 'HIDRATACAO'],
    styleType: 'ALIMENTACAO',
    icon: Utensils,
    priority: 4,
  },
  {
    id: 'ELIMINACAO',
    title: 'ELIMINAÇÃO',
    types: ['ELIMINACAO'],
    styleType: 'ELIMINACAO',
    icon: Activity,
    priority: 5,
  },
  {
    id: 'ESTADO_GERAL',
    title: 'ESTADO COMPORTAMENTAL E SONO',
    types: ['COMPORTAMENTO', 'HUMOR', 'SONO'],
    styleType: 'COMPORTAMENTO',
    icon: Activity,
    priority: 6,
  },
  {
    id: 'PESO_ALTURA',
    title: 'PESO / ALTURA',
    types: ['PESO'],
    styleType: 'PESO',
    icon: Activity,
    priority: 7,
  },
  {
    id: 'ATIVIDADES',
    title: 'ATIVIDADES',
    types: ['ATIVIDADES'],
    styleType: 'ATIVIDADES',
    icon: Activity,
    priority: 8,
  },
  {
    id: 'VISITAS',
    title: 'VISITAS',
    types: ['VISITA'],
    styleType: 'VISITA',
    icon: Activity,
    priority: 9,
  },
  {
    id: 'CUIDADOS_OPERACIONAIS',
    title: 'OUTROS',
    types: ['OUTROS'],
    styleType: 'OUTROS',
    icon: Activity,
    priority: 10,
  },
]

// Componente para renderizar um único dia
function SingleDayCard({ report, isExpanded, onToggle, dayOfWeek }: SingleDayCardProps) {
  const { summary, dailyRecords, medicationAdministrations, shifts } = report

  // Estado de expansão por categoria
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    CATEGORY_CONFIG.forEach(cat => {
      initial[cat.id] = cat.alwaysExpanded ?? true
    })
    return initial
  })

  const [isMedicationsOpen, setIsMedicationsOpen] = useState(true)

  // Agrupar registros por categoria
  const groupedRecords = CATEGORY_CONFIG.map(category => ({
    ...category,
    records: dailyRecords.filter(record => category.types.includes(record.type)),
  }))

  const monitorIndex = groupedRecords.findIndex(category => category.id === 'MONITORAMENTO')
  const categoriesBeforeMedications =
    monitorIndex === -1 ? groupedRecords : groupedRecords.slice(0, monitorIndex + 1)
  const categoriesAfterMedications =
    monitorIndex === -1 ? [] : groupedRecords.slice(monitorIndex + 1)

  const reportDateLabel = formatDateOnlySafe(summary.date)
  const generatedAtLabel = getCurrentDateTime()

  const getResidentKey = (record: DailyRecord) =>
    record.residentCpf || record.residentCns || record.residentName
  const complianceMap = new Map(
    (summary.compliance ?? []).map((metric) => [metric.recordType, metric]),
  )

  const getComplianceForTypes = (types: string[]) => {
    const metrics = types
      .map((type) => complianceMap.get(type))
      .filter((metric): metric is NonNullable<typeof metric> => !!metric)
    const due = metrics.reduce((sum, metric) => sum + metric.due, 0)
    const done = metrics.reduce((sum, metric) => sum + metric.done, 0)
    const overdue = metrics.reduce((sum, metric) => sum + metric.overdue, 0)
    const adHoc = metrics.reduce((sum, metric) => sum + metric.adHoc, 0)
    const compliance = due > 0 ? Math.round((done / due) * 100) : null
    return { due, done, overdue, adHoc, compliance }
  }

  const renderCategory = (category: typeof groupedRecords[number]) => {
    const uniqueResidents = new Set(category.records.map(getResidentKey)).size
    const complianceStats = getComplianceForTypes(category.types)
    const labelConfig = RECORD_TYPE_LABELS[category.styleType] ?? {
      bgColor: 'bg-muted border-border',
    }
    const labelClasses = labelConfig.bgColor.split(' ').filter(Boolean)
    const headerBgClasses = labelClasses
      .filter((cls) => cls.startsWith('bg-') || cls.startsWith('dark:bg-'))
      .join(' ')
    const borderClasses = labelClasses
      .filter((cls) => cls.startsWith('border-') || cls.startsWith('dark:border-'))
      .join(' ')
    return (
      <Collapsible
        key={category.id}
        open={expandedCategories[category.id]}
        onOpenChange={(open) =>
          setExpandedCategories((prev) => ({ ...prev, [category.id]: open }))
        }
      >
        <Card className={`border-l-4 ${borderClasses} overflow-hidden`}>
          <CardHeader className={headerBgClasses}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                  {category.title}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({category.records.length} registros)
                  </span>
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    • {uniqueResidents}/{summary.totalResidents} residentes
                  </span>
                  {complianceStats.due > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      • Cumprimento {complianceStats.compliance}% ({complianceStats.done}/
                      {complianceStats.due})
                    </span>
                  )}
                  {complianceStats.due > 0 && complianceStats.overdue > 0 && (
                    <span className="ml-2 text-sm font-normal text-amber-700 dark:text-amber-300">
                      • ⚠ {complianceStats.overdue} pendente(s)
                    </span>
                  )}
                  {category.id !== 'INTERCORRENCIA' && complianceStats.adHoc > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      • +{complianceStats.adHoc} extra
                    </span>
                  )}
                  {category.id === 'INTERCORRENCIA' ? (
                    category.records.length > 0 ? (
                      <span className="ml-2 text-sm font-normal text-red-700 dark:text-red-300">
                        • ⚠ {uniqueResidents} residente(s) com intercorrência hoje.
                      </span>
                    ) : (
                      <span className="ml-2 text-sm font-normal text-emerald-700 dark:text-emerald-300">
                        • ✅ Nenhuma intercorrência registrada hoje.
                      </span>
                    )
                  ) : null}
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {expandedCategories[category.id] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-4">
              {category.records.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro nesta categoria para o dia.
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
                      {category.records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {record.residentName} ({record.bedCode})
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {getRecordTypeLabel(record.type)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{record.time}</TableCell>
                          <TableCell className="text-sm">{record.recordedBy}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    )
  }

  const ComplianceRing = ({
    value,
    label,
    icon: Icon,
    color,
  }: {
    value: number | null
    label: string
    icon: React.ElementType
    color: string
  }) => {
    const safeValue = value ?? 0
    const size = 56
    const stroke = 6
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (safeValue / 100) * circumference
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 min-h-[92px] flex items-center justify-between gap-3">
        <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              {label}
            </div>
        </div>
          <div className="relative h-14 w-14">
            <svg width={size} height={size} className="-rotate-90">
              <circle
                className="text-muted"
                stroke="currentColor"
                strokeWidth={stroke}
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
              />
              <circle
                className={color}
                stroke="currentColor"
                strokeWidth={stroke}
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              {value !== null ? `${value}%` : '--'}
            </div>
          </div>
      </div>
    )
  }

  const monitorCompliance = getComplianceForTypes(['MONITORAMENTO']).compliance
  const feedingCompliance = getComplianceForTypes(['ALIMENTACAO', 'HIDRATACAO']).compliance
  const hygieneCompliance = getComplianceForTypes(['HIGIENE']).compliance



  const getRecordTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      HIGIENE: 'Higiene',
      ALIMENTACAO: 'Alimentação',
      HIDRATACAO: 'Hidratação',
      MONITORAMENTO: 'Monitoramento',
      INTERCORRENCIA: 'Intercorrência',
      COMPORTAMENTO: 'Comportamento',
      HUMOR: 'Humor',
      SONO: 'Sono',
      ELIMINACAO: 'Eliminação',
      PESO: 'Peso',
      ATIVIDADES: 'Atividades',
      VISITA: 'Visita',
      OUTROS: 'Outros',
    }
    return labelMap[type] || type
  }

  const renderShiftRow = (shift: ShiftReport) => (
    <TableRow key={shift.id}>
      <TableCell className="font-medium">{shift.name}</TableCell>
      <TableCell className="text-sm">
        {shift.startTime} - {shift.endTime}
      </TableCell>
      <TableCell className="text-sm">
        {shift.teamName ? (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: shift.teamColor || 'var(--muted-foreground)' }}
            />
            {shift.teamName}
          </div>
        ) : (
          'Sem equipe'
        )}
      </TableCell>
      <TableCell className="text-sm">{shift.status}</TableCell>
    </TableRow>
  )

  const formatRecordDetails = (type: string, details: Record<string, unknown>) => {
    // Helper para acessar propriedades de forma type-safe
    const getField = (field: string): string => {
      const value = details[field]
      return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    }

    switch (type) {
      case 'HIGIENE':
        return `Banho: ${getField('tipoBanho') || 'N/A'}, ${getField('duracao') || 0}min • Pele: ${getField('condicaoPele') || 'N/A'}`
      case 'ALIMENTACAO':
        return `${getField('refeicao') || 'Refeição'} • Ingestão: ${getField('ingeriu') || 'N/A'} • ${getField('volumeMl') || 0}ml`
      case 'HIDRATACAO':
        return `${getField('tipo') || 'Líquido'} • ${getField('volumeMl') || 0}ml`
      case 'MONITORAMENTO':
        return `PA: ${getField('pressaoArterial') || 'N/A'} • FC: ${getField('frequenciaCardiaca') || 'N/A'} bpm • Tax: ${getField('temperatura') || 'N/A'}°C • SpO2: ${getField('saturacaoO2') || 'N/A'}% • Gli: ${getField('glicemia') || 'N/A'} mg/dL`
      case 'INTERCORRENCIA':
        return (
          <div className="space-y-1">
            <div><strong>Descrição:</strong> {getField('descricao') || 'N/A'}</div>
            {getField('acaoTomada') && (
              <div><strong>Ação Tomada:</strong> {getField('acaoTomada')}</div>
            )}
          </div>
        )
      case 'COMPORTAMENTO':
        return getField('descricao') || getField('observacao') || 'Sem detalhes'
      case 'HUMOR':
        return getField('estado') || getField('descricao') || 'Sem detalhes'
      case 'SONO':
        return `${getField('qualidade') || 'N/A'} • Duração: ${getField('duracao') || 'N/A'}`
      case 'ELIMINACAO':
        return `${getField('tipo') || 'N/A'} • ${getField('caracteristica')} ${getField('observacao')}`
      case 'PESO':
        return `${getField('peso') || 'N/A'} kg • IMC: ${getField('imc') || 'N/A'}`
      case 'ATIVIDADES':
        return getField('atividade') || getField('descricao') || 'Sem detalhes'
      case 'VISITA':
        return `Visitante: ${getField('visitante') || 'N/A'} • ${getField('observacao')}`
      case 'OUTROS':
        return getField('descricao') || getField('observacao') || 'Sem detalhes'
      default:
        return getField('descricao') || getField('observacao') || JSON.stringify(details)
    }
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        {/* Cabeçalho do Relatório - Sempre Visível */}
        <CardHeader className="bg-muted/30">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between w-full md:pr-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6" />
                    {reportDateLabel} - {dayOfWeek}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerado em {generatedAtLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Registros: {summary.totalDailyRecords}</Badge>
                  <Badge variant="secondary">
                    Prescrição medicamentosa: {summary.totalMedicationsScheduled}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

          {/* Conteúdo Colapsável */}
          <CollapsibleContent>
            <CardContent className="pt-6 space-y-6">
              {/* Resumo Executivo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resumo Executivo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3 min-h-[92px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Total de Residentes
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-lg font-semibold">
                {summary.totalResidents}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 min-h-[92px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Registros do dia
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-lg font-semibold">
                {summary.totalDailyRecords}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 min-h-[92px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Pill className="h-4 w-4" />
                Medicações
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-xs font-semibold">
                {summary.totalMedicationsAdministered}/{summary.totalMedicationsScheduled}
              </div>
            </div>
          </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <ComplianceRing
              value={feedingCompliance}
              label="Alimentação + Hidratação"
              icon={Utensils}
              color={RECORD_TYPE_LABELS.ALIMENTACAO.color}
            />
            <ComplianceRing
              value={monitorCompliance}
              label="Sinais Vitais"
              icon={Activity}
              color={RECORD_TYPE_LABELS.MONITORAMENTO.color}
            />
            <ComplianceRing
              value={hygieneCompliance}
              label="Higiene"
              icon={Bath}
              color={RECORD_TYPE_LABELS.HIGIENE.color}
            />
                </div>
              </div>

              {/* Turnos do Dia */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Turnos do Dia
                </h3>
                {shifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum turno encontrado para este dia.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Turno</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Equipe</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{shifts.map(renderShiftRow)}</TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Registros Diários Agrupados por Categoria */}
              {categoriesBeforeMedications.map(renderCategory)}

              {/* Administração de Medicamentos */}
              <Collapsible open={isMedicationsOpen} onOpenChange={setIsMedicationsOpen}>
                <Card className="border-l-4 border-border overflow-hidden">
                  <CardHeader className="bg-muted/40">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <CardTitle className="text-lg font-bold">
                          💊 ADMINISTRAÇÃO DE MEDICAMENTOS
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({medicationAdministrations.length} registros)
                          </span>
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
                    <CardContent className="pt-4">
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

              {categoriesAfterMedications.map(renderCategory)}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
  )
}

// Componente principal que gerencia múltiplos dias
export function DailyReportView({ multiDayReport }: DailyReportViewProps) {
  const { reports } = multiDayReport

  // Estado para controlar qual dia está expandido (apenas 1 por vez)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number>(0)

  // Helper para obter o dia da semana em português
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00.000Z')
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    return days[date.getDay()]
  }

  return (
    <div className="space-y-4">
      {reports.map((report, index) => (
        <SingleDayCard
          key={report.summary.date}
          report={report}
          isExpanded={expandedDayIndex === index}
          onToggle={() => setExpandedDayIndex(expandedDayIndex === index ? -1 : index)}
          dayOfWeek={getDayOfWeek(report.summary.date)}
        />
      ))}
    </div>
  )
}
