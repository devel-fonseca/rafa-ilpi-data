// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ReportGenerator (Gerador Universal de Relatórios)
// ──────────────────────────────────────────────────────────────────────────────

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { parseISO } from 'date-fns'
import { FileText, Download, Loader2, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getCurrentDate } from '@/utils/dateHelpers'
import { Section, StatusBadge, EmptyState } from '@/design-system/components'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { getAvailableShiftTemplates } from '@/api/care-shifts/shift-templates.api'
import type { ReportFilters, ReportType, ShiftType, RecordTypeFilter, ReportFormat } from '@/types/reportsHub'
import { useFeatures } from '@/hooks/useFeatures'

// ========== VALIDATION SCHEMA ==========

const reportGeneratorSchema = z.object({
  reportType: z.string().min(1, 'Tipo de relatório é obrigatório'),
  startDate: z.string().min(1, 'Data inicial é obrigatória'),
  endDate: z.string().min(1, 'Data final é obrigatória'),
  residentId: z.string().optional(),
  shift: z.string().optional(),
  recordType: z.string().optional(),
  format: z.string().optional(),
}).refine((data) => {
  // Validar apenas se ambas as datas estiverem preenchidas
  if (!data.startDate || !data.endDate) return true

  const start = parseISO(`${data.startDate}T12:00:00`)
  const end = parseISO(`${data.endDate}T12:00:00`)

  // Validar que end >= start
  if (end < start) return false

  // Validar intervalo máximo de 7 dias
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff <= 7
}, {
  message: 'O intervalo máximo permitido é de 7 dias',
  path: ['endDate'],
})

type ReportGeneratorFormData = z.infer<typeof reportGeneratorSchema>

// ========== INTERFACE ==========

interface ReportGeneratorProps {
  defaultReportType?: ReportType
  defaultFilters?: Partial<ReportFilters>
  onGenerate: (filters: ReportFilters) => void
  isLoading?: boolean
  residents?: Array<{ id: string; name: string }>
}

// ========== COMPONENT ==========

export function ReportGenerator({
  defaultReportType,
  defaultFilters,
  onGenerate,
  isLoading = false,
  residents = [],
}: ReportGeneratorProps) {
  const { hasFeature } = useFeatures()
  const hasCareShiftsFeature = hasFeature('escalas_plantoes')

  // Buscar templates de turnos disponíveis
  const { data: availableShifts = [], isLoading: isLoadingShifts } = useQuery({
    queryKey: ['available-shift-templates'],
    queryFn: getAvailableShiftTemplates,
    enabled: hasCareShiftsFeature,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ReportGeneratorFormData>({
    resolver: zodResolver(reportGeneratorSchema),
    defaultValues: {
      reportType: defaultReportType || '',
      startDate: defaultFilters?.startDate || getCurrentDate(),
      endDate: defaultFilters?.endDate || getCurrentDate(),
      residentId: defaultFilters?.residentId || '',
      shift: defaultFilters?.shift || 'ALL',
      recordType: defaultFilters?.recordType || 'ALL',
      format: defaultFilters?.format || 'HTML',
    },
  })

  const selectedReportType = watch('reportType')
  const selectedResidentId = watch('residentId')
  const startDate = watch('startDate')
  const endDate = watch('endDate')

  // ========== HELPERS ==========

  const calculateDateRange = () => {
    if (!startDate || !endDate) return null

    const start = parseISO(`${startDate}T12:00:00`)
    const end = parseISO(`${endDate}T12:00:00`)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const totalDays = daysDiff + 1 // +1 porque inclui ambos os dias

    return {
      days: totalDays,
      isValid: end >= start && daysDiff <= 7,
      isOverLimit: daysDiff > 7,
      isReversed: end < start,
    }
  }

  const dateRange = calculateDateRange()

  const needsResidentFilter = () => {
    return selectedReportType === 'BY_RESIDENT'
  }

  const needsShiftFilter = () => {
    return selectedReportType === 'BY_SHIFT' || selectedReportType === 'DAILY'
  }

  const needsRecordTypeFilter = () => {
    return selectedReportType === 'BY_RECORD_TYPE'
  }

  const getDateRangeStatus = () => {
    if (!dateRange) return null

    if (dateRange.isReversed) {
      return {
        variant: 'danger' as const,
        label: 'Data final anterior à data inicial',
      }
    }

    if (dateRange.isOverLimit) {
      return {
        variant: 'danger' as const,
        label: `Intervalo de ${dateRange.days} dias excede o limite de 7 dias`,
      }
    }

    if (dateRange.days >= 5) {
      return {
        variant: 'warning' as const,
        label: `${dateRange.days} dias selecionados (máx. 7 dias)`,
      }
    }

    return {
      variant: 'success' as const,
      label: `${dateRange.days} ${dateRange.days === 1 ? 'dia selecionado' : 'dias selecionados'} (máx. 7 dias)`,
    }
  }

  const dateRangeStatus = getDateRangeStatus()

  // ========== HANDLERS ==========

  const onSubmit = (data: ReportGeneratorFormData) => {
    const filters: ReportFilters = {
      reportType: data.reportType as ReportType,
      startDate: data.startDate,
      endDate: data.endDate,
      residentId: data.residentId || undefined,
      shift: data.shift as ShiftType | undefined,
      recordType: data.recordType as RecordTypeFilter | undefined,
      format: data.format as ReportFormat | undefined,
    }

    onGenerate(filters)
  }

  const handleClear = () => {
    const today = getCurrentDate()
    reset({
      reportType: '',
      startDate: today,
      endDate: today,
      residentId: '',
      shift: 'ALL',
      recordType: 'ALL',
      format: 'HTML',
    })
  }

  // ========== RENDER ==========

  return (
    <Section
      title="Relatórios de Atividades Assistenciais"
      description="Defina tipo, período e filtros para gerar o relatório desejado."
      spacing="compact"
      headerAction={
        <StatusBadge variant="info">
          {selectedReportType ? selectedReportType : 'Selecione um tipo'}
        </StatusBadge>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Grid de filtros principais */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Tipo de Relatório */}
          <div className="space-y-2">
            <Label htmlFor="reportType">
              Tipo de Relatório <span className="text-danger">*</span>
            </Label>
            <Select
              value={watch('reportType')}
              onValueChange={(value) => setValue('reportType', value)}
            >
              <SelectTrigger
                id="reportType"
                className={errors.reportType ? 'border-danger' : ''}
              >
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Relatório Diário</SelectItem>
                <SelectItem value="BY_RESIDENT">Por Residente</SelectItem>
                <SelectItem value="BY_SHIFT">Por Turno</SelectItem>
                <SelectItem value="BY_RECORD_TYPE">Por Tipo de Registro</SelectItem>
                <SelectItem value="INSTITUTIONAL_MONTHLY">Indicadores Mensais</SelectItem>
                <SelectItem value="SENTINEL_EVENTS">Eventos Sentinela</SelectItem>
              </SelectContent>
            </Select>
            {errors.reportType && (
              <p className="text-sm text-danger">{errors.reportType.message}</p>
            )}
          </div>

          {/* Período (Data Inicial + Botão + Data Final) */}
          <div className="space-y-2">
            <Label>
              Período <span className="text-danger">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
                className={errors.startDate ? 'border-danger' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setValue('endDate', startDate)}
                title="Copiar data inicial para data final"
                className="h-9 w-9 shrink-0"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
                className={errors.endDate ? 'border-danger' : ''}
              />
            </div>
            {(errors.startDate || errors.endDate) && (
              <p className="text-sm text-danger">
                {errors.startDate?.message || errors.endDate?.message}
              </p>
            )}
          </div>
        </div>

        {/* Indicador de Range */}
        {dateRangeStatus && (
          <div className="flex items-center justify-center">
            <StatusBadge variant={dateRangeStatus.variant}>
              {dateRangeStatus.label}
            </StatusBadge>
          </div>
        )}

        {/* Filtros dinâmicos (aparecem conforme tipo de relatório) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Residente (condicional) */}
          {needsResidentFilter() && (
            <div className="space-y-2">
              <Label htmlFor="residentId">
                Residente <span className="text-danger">*</span>
              </Label>
              {residents.length > 0 ? (
                <Select
                  value={selectedResidentId}
                  onValueChange={(value) => setValue('residentId', value)}
                >
                  <SelectTrigger id="residentId">
                    <SelectValue placeholder="Selecione o residente" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents.map((resident) => (
                      <SelectItem key={resident.id} value={resident.id}>
                        {resident.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Nenhum residente disponível"
                  description="Cadastre ou carregue residentes para gerar relatórios por residente."
                  variant="info"
                  className="py-6"
                />
              )}
            </div>
          )}

          {/* Turno (condicional) */}
          {needsShiftFilter() && (
            <div className="space-y-2">
              <Label htmlFor="shift">Turno</Label>
              <Select
                value={watch('shift')}
                onValueChange={(value) => setValue('shift', value)}
                disabled={isLoadingShifts}
              >
                <SelectTrigger id="shift">
                  <SelectValue placeholder={isLoadingShifts ? 'Carregando turnos...' : 'Todos os turnos'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os turnos</SelectItem>
                  {availableShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime}-{shift.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo de Registro (condicional) */}
          {needsRecordTypeFilter() && (
            <div className="space-y-2">
              <Label htmlFor="recordType">
                Tipo de Registro <span className="text-danger">*</span>
              </Label>
              <Select
                value={watch('recordType')}
                onValueChange={(value) => setValue('recordType', value)}
              >
                <SelectTrigger id="recordType">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  <SelectItem value="MONITORAMENTO">Monitoramento</SelectItem>
                  <SelectItem value="MEDICACAO">Medicação</SelectItem>
                  <SelectItem value="INTERCORRENCIA">Intercorrência</SelectItem>
                  <SelectItem value="ALIMENTACAO">Alimentação</SelectItem>
                  <SelectItem value="HIGIENE">Higiene</SelectItem>
                  <SelectItem value="VISITA">Visita</SelectItem>
                  <SelectItem value="ATIVIDADES">Atividades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Formato de Saída */}
          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <Select
              value={watch('format')}
              onValueChange={(value) => setValue('format', value)}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Tela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTML">Tela</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="EXCEL">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="gap-2 min-w-[160px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar Relatório
              </>
            )}
          </Button>
        </div>
      </form>
    </Section>
  )
}
