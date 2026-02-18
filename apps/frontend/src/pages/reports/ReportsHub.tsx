// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - ReportsHub (Central de Relatórios e Documentos)
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, ChevronRight } from 'lucide-react'
import { Page, PageHeader, Section, StatusBadge, EmptyState } from '@/design-system/components'
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { REPORT_CATEGORIES, type ReportFilters, type RecentReport } from '@/types/reportsHub'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
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
import { getDailyReport } from '@/services/reportsApi'
import { downloadDailyReportPDF } from '@/services/dailyReportPdf'
import { applyOperationalReportFilter } from '@/services/operationalReports'
import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import { getAvailableShiftTemplates } from '@/api/care-shifts/shift-templates.api'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useFeatures } from '@/hooks/useFeatures'

// ========== COMPONENT ==========

export default function ReportsHub() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [recentReports, setRecentReports] = React.useState<RecentReport[]>([])
  const [isShiftDialogOpen, setIsShiftDialogOpen] = React.useState(false)
  const [selectedShiftTemplateId, setSelectedShiftTemplateId] = React.useState('')
  const { hasFeature } = useFeatures()
  const hasCareShiftsFeature = hasFeature('escalas_plantoes')

  const { data: availableShifts = [], isLoading: isLoadingShifts } = useQuery({
    queryKey: ['available-shift-templates'],
    queryFn: getAvailableShiftTemplates,
    enabled: hasCareShiftsFeature,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })


  // ========== HANDLERS ==========

  const handleGenerateReport = async (filters: ReportFilters) => {
    setIsGenerating(true)
    try {
      const isOperationalReport =
        filters.reportType === 'DAILY' ||
        filters.reportType === 'BY_SHIFT' ||
        filters.reportType === 'BY_RECORD_TYPE'

      if (
        isOperationalReport &&
        filters.format &&
        filters.format !== 'HTML' &&
        filters.format !== 'PDF'
      ) {
        console.error(`Formato ${filters.format} ainda não suportado para este relatório.`)
        return
      }

      // Navegar para o relatório operacional em tela
      if (isOperationalReport && filters.format === 'HTML') {
        // Passar startDate e endDate como query params
        const params = new URLSearchParams()
        if (filters.startDate) {
          params.set('startDate', filters.startDate)
        }
        if (filters.endDate && filters.endDate !== filters.startDate) {
          params.set('endDate', filters.endDate)
        }
        if (filters.periodType) {
          params.set('periodType', filters.periodType)
        }
        if (filters.yearMonth) {
          params.set('yearMonth', filters.yearMonth)
        }
        if (filters.shift && filters.shift !== 'ALL') {
          params.set('shiftTemplateId', filters.shift)
        }
        if (filters.reportType && filters.reportType !== 'DAILY') {
          params.set('reportType', filters.reportType)
        }
        if (filters.reportType === 'BY_RECORD_TYPE' && filters.recordType) {
          params.set('recordType', filters.recordType)
        }
        navigate(`/dashboard/relatorios/diario?${params.toString()}`)
        return
      }

      // Gerar PDF dos relatórios operacionais
      if (isOperationalReport && filters.format === 'PDF') {
        if (!filters.startDate) {
          console.error('Data inicial é obrigatória')
          return
        }

        // Buscar dados do relatório
        const multiDayReport = await getDailyReport(
          filters.startDate,
          filters.endDate,
          filters.shift,
          {
            periodType: filters.periodType,
            yearMonth: filters.yearMonth,
            reportType: filters.reportType,
          },
        )
        const filteredReport = applyOperationalReportFilter(multiDayReport, {
          reportType: filters.reportType,
          recordType: filters.recordType,
        })

        // Gerar e baixar PDF
        const ilpiName = user?.tenant?.profile?.tradeName || user?.tenant?.name || 'ILPI'
        const cnpj = user?.tenant?.cnpj || 'CNPJ não cadastrado'
        const userName = user?.name || 'Usuário'
        const printDate = new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        downloadDailyReportPDF(filteredReport, {
          ilpiName,
          cnpj,
          userName,
          printDate,
          reportType: filters.reportType,
          periodType: filters.periodType,
          recordType: filters.recordType,
        })

        // Adicionar aos recentes
        const newReport: RecentReport = {
          id: `report-${Date.now()}`,
          label: `Relatório Diário - PDF`,
          category: filters.reportType,
          timestamp: new Date(),
          filters,
        }

        setRecentReports((prev) => [newReport, ...prev.slice(0, 4)])
        return
      }

      if (filters.reportType === 'BY_RESIDENT') {
        const params = new URLSearchParams()
        if (filters.residentId) {
          params.set('residentId', filters.residentId)
        }
        navigate(`/dashboard/relatorios/resumo-assistencial${params.toString() ? `?${params.toString()}` : ''}`)
        return
      }

      console.error('Tipo de relatório ainda não suportado:', filters.reportType)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCategoryItemClick = (itemId: string, reportType: string) => {
    // Navegar diretamente para o relatório diário
    if (reportType === 'DAILY' || itemId === 'daily-report') {
      navigate('/dashboard/relatorios/diario')
      return
    }

    if (itemId === 'shift-report') {
      if (!hasCareShiftsFeature) {
        navigate('/dashboard/relatorios/diario')
        return
      }
      setIsShiftDialogOpen(true)
      return
    }

    if (
      itemId === 'resident-report' ||
      itemId === 'resident-card' ||
      itemId === 'resident-care-summary'
    ) {
      navigate('/dashboard/relatorios/resumo-assistencial')
      return
    }

    if (itemId === 'resident-profile') {
      navigate('/dashboard/relatorios/perfil-residentes')
      return
    }

    // Navegar para a lista de residentes
    if (itemId === 'resident-list') {
      navigate('/dashboard/relatorios/residentes')
      return
    }

    if (itemId === 'record-type-report' || reportType === 'BY_RECORD_TYPE') {
      const params = new URLSearchParams()
      params.set('startDate', getCurrentDate())
      params.set('reportType', 'BY_RECORD_TYPE')
      if (itemId === 'incidents') {
        params.set('recordType', 'INTERCORRENCIA')
      } else if (itemId === 'medication-errors') {
        params.set('recordType', 'MEDICACAO')
      } else if (itemId === 'falls') {
        params.set('recordType', 'INTERCORRENCIA')
      } else {
        params.set('recordType', 'ALL')
      }
      navigate(`/dashboard/relatorios/diario?${params.toString()}`)
      return
    }
  }

  const handleConfirmShiftReport = () => {
    if (!selectedShiftTemplateId) return
    const params = new URLSearchParams()
    params.set('startDate', getCurrentDate())
    params.set('shiftTemplateId', selectedShiftTemplateId)
    params.set('reportType', 'BY_SHIFT')
    setIsShiftDialogOpen(false)
    navigate(`/dashboard/relatorios/diario?${params.toString()}`)
  }

  const totalCategoryItems = React.useMemo(
    () => REPORT_CATEGORIES.reduce((total, category) => total + category.items.length, 0),
    []
  )

  const getCategoryBadgeVariant = (categoryId: string) => {
    switch (categoryId) {
      case 'COMPLIANCE':
        return 'warning'
      case 'DOCUMENTS':
        return 'success'
      case 'MANAGEMENT':
        return 'info'
      case 'OPERATIONAL':
      default:
        return 'secondary'
    }
  }

  const getReportTypeBadgeVariant = (reportType: string) => {
    switch (reportType) {
      case 'SENTINEL_EVENTS':
        return 'warning'
      case 'INSTITUTIONAL_MONTHLY':
        return 'info'
      case 'BY_RESIDENT':
      case 'BY_SHIFT':
      case 'BY_RECORD_TYPE':
        return 'secondary'
      case 'DAILY':
      default:
        return 'default'
    }
  }

  // ========== RENDER ==========

  return (
    <Page>
      <PageHeader
        title="Relatórios e Documentos"
        subtitle="Geração unificada de relatórios operacionais, evidências de conformidade e documentos institucionais"
        badge={<StatusBadge variant="info">{REPORT_CATEGORIES.length} categorias</StatusBadge>}
      />

      <Section
        title="Gerador de Relatórios"
        description="Selecione o tipo, filtros e formato para gerar documentos operacionais e clínicos."
        spacing="compact"
      >
        <ReportGenerator onGenerate={handleGenerateReport} isLoading={isGenerating} />
      </Section>

      <Section
        title="Categorias de Evidência"
        description="Acesse rapidamente os principais modelos de relatórios por finalidade."
        headerAction={<StatusBadge variant="outline">{totalCategoryItems} modelos</StatusBadge>}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {REPORT_CATEGORIES.map((category) => (
            <Card
              key={category.id}
              className="transition-all hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{category.emoji}</span>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge variant={getCategoryBadgeVariant(category.id)}>
                    {category.items.length} itens
                  </StatusBadge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        handleCategoryItemClick(item.id, item.reportType)
                      }
                      className="w-full flex items-center justify-between rounded-lg border bg-card p-3 text-left transition-all hover:bg-accent hover:shadow-sm"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{item.label}</p>
                          {item.badge && (
                            <StatusBadge variant="secondary" className="text-xs">
                              {item.badge}
                            </StatusBadge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Usados Recentemente"
        description="Relatórios gerados nesta sessão para reabertura rápida."
        headerAction={<StatusBadge variant="outline">{recentReports.length} recentes</StatusBadge>}
      >
        {recentReports.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recentReports.map((report) => (
                <button
                  key={report.id}
                      onClick={() => {
                        if (
                          report.filters.reportType === 'DAILY' ||
                          report.filters.reportType === 'BY_SHIFT' ||
                          report.filters.reportType === 'BY_RECORD_TYPE'
                        ) {
                          const params = new URLSearchParams()
                          params.set('startDate', report.filters.startDate)
                          if (report.filters.endDate && report.filters.endDate !== report.filters.startDate) {
                            params.set('endDate', report.filters.endDate)
                          }
                          if (report.filters.periodType) {
                            params.set('periodType', report.filters.periodType)
                          }
                          if (report.filters.yearMonth) {
                            params.set('yearMonth', report.filters.yearMonth)
                          }
                          if (report.filters.shift && report.filters.shift !== 'ALL') {
                            params.set('shiftTemplateId', report.filters.shift)
                          }
                          if (report.filters.reportType !== 'DAILY') {
                            params.set('reportType', report.filters.reportType)
                          }
                          if (
                            report.filters.reportType === 'BY_RECORD_TYPE' &&
                            report.filters.recordType
                          ) {
                            params.set('recordType', report.filters.recordType)
                          }
                          navigate(`/dashboard/relatorios/diario?${params.toString()}`)
                        }
                      }}
                  className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:bg-accent hover:shadow-sm"
                >
                  <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">{report.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <StatusBadge
                      variant={getReportTypeBadgeVariant(report.category)}
                      className="text-xs"
                    >
                      {report.category}
                    </StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="Nenhum relatório recente"
            description="Após gerar relatórios, eles aparecerão aqui para acesso rápido."
            variant="info"
          />
        )}
      </Section>

      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="shift-template">Turno</Label>
            <Select
              value={selectedShiftTemplateId}
              onValueChange={setSelectedShiftTemplateId}
            >
              <SelectTrigger id="shift-template">
                <SelectValue placeholder={isLoadingShifts ? 'Carregando...' : 'Selecione o turno'} />
              </SelectTrigger>
              <SelectContent>
                {availableShifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name} ({shift.startTime}-{shift.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsShiftDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmShiftReport}
              disabled={!selectedShiftTemplateId || isLoadingShifts}
            >
              Gerar relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
