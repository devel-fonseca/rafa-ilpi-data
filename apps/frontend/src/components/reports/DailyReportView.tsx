/* eslint-disable no-restricted-syntax */
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
import type { DailyReport, DailyRecordReport, MultiDayReport, ShiftReport } from '@/types/reports'
import type { RecordTypeFilter, ReportType, ReportPeriodType } from '@/types/reportsHub'
import { formatDateOnlySafe, getCurrentDateTime } from '@/utils/dateHelpers'
import { getRecordTypeLabel, RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels'
import { formatShiftStatusLabel } from '@/utils/shiftStatus'
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
  reportType?: ReportType
  periodType?: ReportPeriodType
  recordType?: RecordTypeFilter
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
  const scheduledEvents = report.scheduledEvents || []
  const immunizations = report.immunizations || []

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
  const visibleCategoriesBeforeMedications = categoriesBeforeMedications.filter(
    (category) => category.records.length > 0,
  )
  const visibleCategoriesAfterMedications = categoriesAfterMedications.filter(
    (category) => category.records.length > 0,
  )
  const hasMedicationRecords = medicationAdministrations.length > 0
  const hasScheduledEvents = scheduledEvents.length > 0
  const hasImmunizations = immunizations.length > 0
  const hasShiftRecords = shifts.length > 0
  const hasAnyOperationalRecords =
    visibleCategoriesBeforeMedications.length > 0 ||
    visibleCategoriesAfterMedications.length > 0 ||
    hasMedicationRecords ||
    hasScheduledEvents ||
    hasImmunizations

  const reportDateLabel = formatDateOnlySafe(summary.date)
  const generatedAtLabel = getCurrentDateTime()

  const getResidentKey = (record: DailyRecordReport) =>
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
    const labelConfig = getRecordTypeLabel(category.styleType)
    const labelClasses = (labelConfig?.bgColor ?? 'bg-muted border-border').split(' ').filter(Boolean)
    const headerBgClasses = labelClasses
      .filter((cls: string) => cls.startsWith('bg-') || cls.startsWith('dark:bg-'))
      .join(' ')
    const borderClasses = labelClasses
      .filter((cls: string) => cls.startsWith('border-') || cls.startsWith('dark:border-'))
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
                        <TableHead>Leito</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Registrado Por</TableHead>
                        <TableHead className="min-w-[300px]">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs font-medium">
                            {record.residentName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{record.bedCode}</TableCell>
                          <TableCell className="text-xs">
                            {getRecordTypeText(record.type)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{record.time}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{record.recordedBy}</TableCell>
                          <TableCell className="text-xs">
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



  const getRecordTypeText = (type: string) => {
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
      <TableCell className="text-sm">{formatShiftStatusLabel(shift.status)}</TableCell>
    </TableRow>
  )

  const getScheduledEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      VACCINATION: 'Vacinação',
      CONSULTATION: 'Consulta',
      EXAM: 'Exame',
      PROCEDURE: 'Procedimento',
      OTHER: 'Outro',
    }
    return labels[eventType] || eventType
  }

  const formatRecordDetails = (type: string, details: Record<string, unknown>) => {
    // Helper para acessar propriedades de forma type-safe
    const getField = (field: string): string => {
      const value = details[field]
      return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    }
    const getNumberField = (field: string): number | null => {
      const value = details[field]
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'))
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    }
    const getBooleanField = (field: string): boolean | null => {
      const value = details[field]
      if (typeof value === 'boolean') return value
      return null
    }

    switch (type) {
      case 'HIGIENE': {
        const parts: string[] = []

        const tipoBanho = getField('tipoBanho')
        const duracao = getField('duracao')
        const condicaoPele = getField('condicaoPele')
        const localAlteracao = getField('localAlteracao')
        const quantidadeFraldas = getField('quantidadeFraldas')
        const higieneBucal = getBooleanField('higieneBucal')
        const trocaFralda = getBooleanField('trocaFralda')
        const hidratanteAplicado = getBooleanField('hidratanteAplicado')

        if (tipoBanho) {
          parts.push(
            duracao && tipoBanho !== 'Sem banho'
              ? `Banho: ${tipoBanho} (${duracao} min)`
              : `Banho: ${tipoBanho}`,
          )
        }

        if (condicaoPele && localAlteracao) {
          parts.push(`Pele: ${condicaoPele} (${localAlteracao})`)
        } else if (condicaoPele) {
          parts.push(`Pele: ${condicaoPele}`)
        } else if (localAlteracao) {
          parts.push(`Local da alteração: ${localAlteracao}`)
        }

        if (higieneBucal === true) {
          parts.push('Higiene bucal: Sim')
        }

        if (hidratanteAplicado === true) {
          parts.push('Hidratante aplicado: Sim')
        }

        if (trocaFralda === true) {
          parts.push(
            quantidadeFraldas
              ? `Troca de fralda: Sim (${quantidadeFraldas})`
              : 'Troca de fralda: Sim',
          )
        }

        return parts.join(' • ') || 'Sem detalhes'
      }
      case 'ALIMENTACAO':
        return `${getField('refeicao') || 'Refeição'} • Ingestão: ${getField('ingeriu') || 'N/A'} • ${getField('volumeMl') || 0}ml`
      case 'HIDRATACAO':
        return `${getField('tipo') || 'Líquido'} • ${getField('volumeMl') || 0}ml`
      case 'MONITORAMENTO':
        return `PA: ${getField('pressaoArterial') || 'N/A'} • FC: ${getField('frequenciaCardiaca') || 'N/A'} bpm • SpO₂: ${getField('saturacaoO2') || 'N/A'}% • Temp: ${getField('temperatura') || 'N/A'}°C • Glicemia: ${getField('glicemia') || 'N/A'} mg/dL`
      case 'INTERCORRENCIA':
        return (
          <div className="space-y-1">
            <div><strong>Descrição:</strong> {getField('descricao') || 'N/A'}</div>
            {getField('acaoTomada') && (
              <div><strong>Ação Tomada:</strong> {getField('acaoTomada')}</div>
            )}
          </div>
        )
      case 'COMPORTAMENTO': {
        const descricao = getField('descricao')
        return descricao || 'Sem detalhes'
      }
      case 'HUMOR': {
        const humor = getField('humor')
        const outroHumor = getField('outroHumor')
        const obsHumor = getField('observacoes')
        if (!humor) return 'Sem detalhes'
        let resultHumor = humor
        if (humor === 'Outro' && outroHumor) resultHumor += ` (${outroHumor})`
        if (obsHumor) resultHumor += ` • ${obsHumor}`
        return resultHumor
      }
      case 'SONO': {
        const padrao = getField('padraoSono')
        const outroPadrao = getField('outroPadrao')
        const obsSono = getField('observacoes')
        if (!padrao) return 'Sem detalhes'
        let resultSono = padrao
        if (padrao === 'Outro' && outroPadrao) resultSono += ` (${outroPadrao})`
        if (obsSono) resultSono += ` • ${obsSono}`
        return resultSono
      }
      case 'ELIMINACAO':
      {
        const rawType = getField('tipo')
        const eliminationType =
          rawType === 'Urina'
            ? 'Eliminação Urinária'
            : rawType === 'Fezes'
              ? 'Eliminação Intestinal'
              : (rawType || 'N/A')
        const parts: string[] = [eliminationType]

        if (rawType === 'Fezes') {
          const consistencia = getField('consistencia')
          const cor = getField('cor')
          const volume = getField('volume')
          if (consistencia) parts.push(consistencia)
          if (cor) parts.push(cor)
          if (volume) parts.push(volume)
        } else if (rawType === 'Urina') {
          const cor = getField('cor')
          const odor = getField('odor')
          const volume = getField('volume')
          if (cor) parts.push(cor)
          if (odor && odor !== 'Normal') parts.push(`Odor: ${odor}`)
          if (volume) parts.push(volume)
        }

        const trocaFralda = getBooleanField('trocaFralda')
        if (trocaFralda === true) {
          parts.push('Troca de fralda: Sim')
        }

        return parts.join(' • ')
      }
      case 'PESO': {
        const peso = getNumberField('peso')
        const alturaRaw = getNumberField('altura')
        const alturaMetros =
          alturaRaw && alturaRaw > 0
            ? (alturaRaw > 3 ? alturaRaw / 100 : alturaRaw)
            : null
        const alturaCm = alturaMetros ? Math.round(alturaMetros * 100) : null
        const imcRaw = getNumberField('imc')
        const imcCalculado =
          peso && alturaMetros
            ? peso / (alturaMetros * alturaMetros)
            : null
        const imc =
          imcRaw && imcRaw > 0 && imcRaw < 150
            ? imcRaw
            : imcCalculado

        const parts: string[] = []
        parts.push(`${peso !== null ? peso : 'N/A'} kg`)
        if (alturaCm !== null) parts.push(`${alturaCm} cm`)
        parts.push(`IMC: ${imc !== null ? imc.toFixed(1) : 'N/A'}`)
        return parts.join(' • ')
      }
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

              {hasScheduledEvents && (
                <Card className="border-l-4 border-sky-300 overflow-hidden">
                  <CardHeader className="bg-sky-50/70 dark:bg-sky-950/20">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      AGENDAMENTOS PONTUAIS DOS RESIDENTES
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({scheduledEvents.length} registros)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Residente</TableHead>
                            <TableHead>Leito</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Hora</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scheduledEvents.map((event, index) => (
                            <TableRow key={`${event.residentName}-${event.title}-${event.time}-${index}`}>
                              <TableCell className="text-xs font-medium">{event.residentName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{event.bedCode}</TableCell>
                              <TableCell className="text-xs">{getScheduledEventTypeLabel(event.eventType)}</TableCell>
                              <TableCell className="text-xs">
                                {event.title}
                                {event.notes && (
                                  <div className="mt-1 text-xs text-muted-foreground italic">
                                    Obs: {event.notes}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{event.time}</TableCell>
                              <TableCell>
                                {event.status === 'COMPLETED' ? (
                                  <Badge variant="default" className="bg-success text-xs">
                                    Concluído
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    Perdido
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasImmunizations && (
                <Card className="border-l-4 border-emerald-300 overflow-hidden">
                  <CardHeader className="bg-emerald-50/70 dark:bg-emerald-950/20">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      IMUNIZAÇÕES
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({immunizations.length} registros)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Residente</TableHead>
                            <TableHead>Leito</TableHead>
                            <TableHead>Vacina/Profilaxia</TableHead>
                            <TableHead>Dose</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Fabricante</TableHead>
                            <TableHead>Estabelecimento de Saúde + CNES</TableHead>
                            <TableHead>Município/UF</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {immunizations.map((item, index) => (
                            <TableRow
                              key={`${item.residentName}-${item.vaccineOrProphylaxis}-${item.batch}-${index}`}
                            >
                              <TableCell className="text-xs font-medium">{item.residentName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.bedCode}</TableCell>
                              <TableCell className="text-xs">{item.vaccineOrProphylaxis}</TableCell>
                              <TableCell className="text-xs">{item.dose}</TableCell>
                              <TableCell className="text-xs">{item.batch}</TableCell>
                              <TableCell className="text-xs">{item.manufacturer}</TableCell>
                              <TableCell className="text-xs">{item.healthEstablishmentWithCnes}</TableCell>
                              <TableCell className="text-xs">{item.municipalityState}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Turnos do Dia */}
              {hasShiftRecords && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Turnos do Dia
                  </h3>
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
                </div>
              )}

              {/* Registros Diários Agrupados por Categoria */}
              {visibleCategoriesBeforeMedications.map(renderCategory)}

              {/* Administração de Medicamentos */}
              {hasMedicationRecords && (
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
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                      <TableRow>
                        <TableHead>Residente</TableHead>
                        <TableHead>Leito</TableHead>
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
                                  <TableCell className="text-xs font-medium">
                                    {med.residentName}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{med.bedCode}</TableCell>
                                  <TableCell className="text-xs font-medium">
                                    {med.medicationName} {med.concentration}
                                  </TableCell>
                                  <TableCell className="text-xs">{med.dose}</TableCell>
                                  <TableCell className="text-xs">{med.route}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {med.scheduledTime}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {med.actualTime || '-'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {med.administeredBy || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {med.wasAdministered ? (
                                      <Badge variant="default" className="bg-success text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Administrado
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
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
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {visibleCategoriesAfterMedications.map(renderCategory)}

              {!hasAnyOperationalRecords && (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhum registro encontrado para os filtros selecionados.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
  )
}

// Componente principal que gerencia múltiplos dias
export function DailyReportView({
  multiDayReport,
  reportType,
  periodType,
  recordType,
}: DailyReportViewProps) {
  const { reports } = multiDayReport

  // Estado para controlar qual dia está expandido (apenas 1 por vez)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number>(0)

  // Helper para obter o dia da semana em português
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00.000Z')
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    return days[date.getDay()]
  }

  const shouldShowMonthlyDetailedByDay =
    reportType === 'BY_RECORD_TYPE' &&
    periodType === 'MONTH' &&
    reports.length > 0

  const getRecordTypeText = (type: string) => {
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

  const getScheduledEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      VACCINATION: 'Vacinação',
      CONSULTATION: 'Consulta',
      EXAM: 'Exame',
      PROCEDURE: 'Procedimento',
      OTHER: 'Outro',
    }
    return labels[eventType] || eventType
  }

  const formatMonthlyDailyRecordDetails = (record: DailyRecordReport) => {
    const details = record.details || {}
    const getField = (field: string): string => {
      const value = details[field]
      return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    }
    switch (record.type) {
      case 'ALIMENTACAO':
        return `${getField('refeicao') || 'Refeição'} • Ingestão: ${getField('ingeriu') || 'N/A'} • ${getField('volumeMl') || 0}ml`
      case 'HIDRATACAO':
        return `${getField('tipo') || 'Líquido'} • ${getField('volumeMl') || 0}ml`
      case 'MONITORAMENTO':
        return `PA: ${getField('pressaoArterial') || 'N/A'} • FC: ${getField('frequenciaCardiaca') || 'N/A'} bpm • SpO₂: ${getField('saturacaoO2') || 'N/A'}% • Temp: ${getField('temperatura') || 'N/A'}°C • Glicemia: ${getField('glicemia') || 'N/A'} mg/dL`
      default:
        return getField('descricao') || getField('observacao') || JSON.stringify(details)
    }
  }

  const getRowsForMonthlyDay = (report: DailyReport, selectedType?: RecordTypeFilter) => {
    if (selectedType === 'MEDICACAO') {
      return report.medicationAdministrations.map((item, index) => ({
        key: `med-${report.summary.date}-${index}`,
        residentName: item.residentName,
        bedCode: item.bedCode,
        type: 'Medicação',
        time: item.actualTime || item.scheduledTime || '--:--',
        recordedBy: item.administeredBy || 'Não informado',
        details: `${item.medicationName} ${item.concentration || ''} ${item.dose || ''} • Via: ${item.route || 'N/A'} • ${item.wasAdministered ? 'Administrado' : 'Não administrado'}`,
      }))
    }

    if (selectedType === 'AGENDAMENTOS_PONTUAIS') {
      return report.scheduledEvents.map((item, index) => ({
        key: `evt-${report.summary.date}-${index}`,
        residentName: item.residentName,
        bedCode: item.bedCode,
        type: `Agendamento (${getScheduledEventTypeLabel(item.eventType)})`,
        time: item.time || '--:--',
        recordedBy: 'Sistema',
        details: `${item.title}${item.notes ? ` • ${item.notes}` : ''} • ${item.status === 'COMPLETED' ? 'Concluído' : 'Perdido'}`,
      }))
    }

    if (selectedType === 'IMUNIZACOES') {
      return report.immunizations.map((item, index) => ({
        key: `imz-${report.summary.date}-${index}`,
        residentName: item.residentName,
        bedCode: item.bedCode,
        type: 'Imunização',
        time: '--:--',
        recordedBy: 'Não informado',
        details: `${item.vaccineOrProphylaxis} • Dose: ${item.dose} • Lote: ${item.batch} • Fabricante: ${item.manufacturer} • ${item.healthEstablishmentWithCnes} • ${item.municipalityState}`,
      }))
    }

    return report.dailyRecords.map((record, index) => ({
      key: `rec-${report.summary.date}-${index}`,
      residentName: record.residentName,
      bedCode: record.bedCode,
      type: getRecordTypeText(record.type),
      time: record.time,
      recordedBy: record.recordedBy || 'Não informado',
      details: `${formatMonthlyDailyRecordDetails(record)}${record.notes ? ` • Obs: ${record.notes}` : ''}`,
    }))
  }

  if (shouldShowMonthlyDetailedByDay) {
    const sortedReports = [...reports].sort((a, b) => a.summary.date.localeCompare(b.summary.date))
    const dayReportsWithRows = sortedReports
      .map((report) => ({
        report,
        rows: getRowsForMonthlyDay(report, recordType),
      }))
      .filter((entry) => entry.rows.length > 0)

    const uniqueResidents = new Set(
      dayReportsWithRows.flatMap((entry) =>
        entry.rows.map((row) => `${row.residentName}-${row.bedCode}`),
      ),
    ).size
    const totalRecords = dayReportsWithRows.reduce((sum, entry) => sum + entry.rows.length, 0)

    const summary = (() => {
      if (recordType === 'MEDICACAO') {
        const due = dayReportsWithRows.reduce(
          (sum, entry) => sum + entry.report.summary.totalMedicationsScheduled,
          0,
        )
        const done = dayReportsWithRows.reduce(
          (sum, entry) => sum + entry.report.summary.totalMedicationsAdministered,
          0,
        )
        const pending = Math.max(due - done, 0)
        return {
          compliance: due > 0 ? Math.round((done / due) * 100) : 0,
          pending,
          extras: 0,
        }
      }
      if (recordType === 'AGENDAMENTOS_PONTUAIS') {
        const total = dayReportsWithRows.reduce(
          (sum, entry) => sum + entry.report.scheduledEvents.length,
          0,
        )
        const completed = dayReportsWithRows.reduce(
          (sum, entry) =>
            sum +
            entry.report.scheduledEvents.filter((event) => event.status === 'COMPLETED').length,
          0,
        )
        const missed = dayReportsWithRows.reduce(
          (sum, entry) =>
            sum + entry.report.scheduledEvents.filter((event) => event.status === 'MISSED').length,
          0,
        )
        return {
          compliance: total > 0 ? Math.round((completed / total) * 100) : 0,
          pending: missed,
          extras: 0,
        }
      }
      if (recordType === 'IMUNIZACOES') {
        const total = dayReportsWithRows.reduce(
          (sum, entry) => sum + entry.report.immunizations.length,
          0,
        )
        const complete = dayReportsWithRows.reduce(
          (sum, entry) =>
            sum +
            entry.report.immunizations.filter(
              (item) =>
                item.vaccineOrProphylaxis &&
                item.dose &&
                item.batch &&
                item.manufacturer &&
                item.healthEstablishmentWithCnes &&
                item.municipalityState,
            ).length,
          0,
        )
        return {
          compliance: total > 0 ? Math.round((complete / total) * 100) : 0,
          pending: Math.max(total - complete, 0),
          extras: 0,
        }
      }

      const due = dayReportsWithRows.reduce(
        (sum, entry) =>
          sum + (entry.report.summary.compliance || []).reduce((acc, metric) => acc + metric.due, 0),
        0,
      )
      const done = dayReportsWithRows.reduce(
        (sum, entry) =>
          sum + (entry.report.summary.compliance || []).reduce((acc, metric) => acc + metric.done, 0),
        0,
      )
      const overdue = dayReportsWithRows.reduce(
        (sum, entry) =>
          sum + (entry.report.summary.compliance || []).reduce((acc, metric) => acc + metric.overdue, 0),
        0,
      )
      const adHoc = dayReportsWithRows.reduce(
        (sum, entry) =>
          sum + (entry.report.summary.compliance || []).reduce((acc, metric) => acc + metric.adHoc, 0),
        0,
      )
      return {
        compliance: due > 0 ? Math.round((done / due) * 100) : 0,
        pending: overdue,
        extras: adHoc,
      }
    })()

    const summaryLabels = (() => {
      if (recordType === 'MEDICACAO') {
        return {
          compliance: 'Aderência medicamentosa',
          pending: 'Não administradas',
          extras: 'Doses extras',
        }
      }
      if (recordType === 'AGENDAMENTOS_PONTUAIS') {
        return {
          compliance: 'Conformidade de agendamentos',
          pending: 'Agendamentos perdidos',
          extras: '',
        }
      }
      if (recordType === 'IMUNIZACOES') {
        return {
          compliance: '',
          pending: '',
          extras: '',
        }
      }
      return {
        compliance: '% Cumprimento',
        pending: 'Pendentes',
        extras: 'Extras',
      }
    })()

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl">Resumo Executivo Mensal</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {recordType === 'IMUNIZACOES' ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Imunizações no mês</p>
                  <p className="text-lg font-semibold">{totalRecords}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Dias com Registros</p>
                  <p className="text-lg font-semibold">{dayReportsWithRows.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Registros</p>
                  <p className="text-lg font-semibold">{totalRecords}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Residentes Únicos</p>
                  <p className="text-lg font-semibold">{uniqueResidents}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{summaryLabels.compliance}</p>
                  <p className="text-lg font-semibold">{summary.compliance}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{summaryLabels.pending}</p>
                  <p className="text-lg font-semibold">{summary.pending}</p>
                </div>
                {summaryLabels.extras ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{summaryLabels.extras}</p>
                    <p className="text-lg font-semibold">{summary.extras}</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {dayReportsWithRows.map(({ report, rows }) => {
          return (
            <Card key={`monthly-day-${report.summary.date}`}>
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl">{formatDateOnlySafe(report.summary.date)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Residente</TableHead>
                        <TableHead>Leito</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Registrado Por</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="text-xs font-medium">{row.residentName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.bedCode}</TableCell>
                          <TableCell className="text-xs">{row.type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.time}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.recordedBy}</TableCell>
                          <TableCell className="text-xs">{row.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
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
