// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - ReportsHub (Central de Relatórios e Documentos)
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, ChevronRight } from 'lucide-react'
import { Page, PageHeader } from '@/design-system/components'
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { REPORT_CATEGORIES, type ReportFilters, type RecentReport } from '@/types/reportsHub'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import { getAvailableShiftTemplates } from '@/api/care-shifts/shift-templates.api'
import { getCurrentDate } from '@/utils/dateHelpers'

// ========== COMPONENT ==========

export default function ReportsHub() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [recentReports, setRecentReports] = React.useState<RecentReport[]>([])
  const [isShiftDialogOpen, setIsShiftDialogOpen] = React.useState(false)
  const [selectedShiftTemplateId, setSelectedShiftTemplateId] = React.useState('')

  const { data: availableShifts = [], isLoading: isLoadingShifts } = useQuery({
    queryKey: ['available-shift-templates'],
    queryFn: getAvailableShiftTemplates,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })


  // ========== HANDLERS ==========

  const handleGenerateReport = async (filters: ReportFilters) => {
    setIsGenerating(true)
    try {
      // Navegar para o relatório diário se o tipo for DAILY e formato for HTML
      if (filters.reportType === 'DAILY' && filters.format === 'HTML') {
        // Passar startDate e endDate como query params
        const params = new URLSearchParams()
        if (filters.startDate) {
          params.set('startDate', filters.startDate)
        }
        if (filters.endDate && filters.endDate !== filters.startDate) {
          params.set('endDate', filters.endDate)
        }
        if (filters.shift && filters.shift !== 'ALL') {
          params.set('shiftTemplateId', filters.shift)
        }
        navigate(`/dashboard/relatorios/diario?${params.toString()}`)
        return
      }

      // Gerar PDF se o tipo for DAILY e formato for PDF
      if (filters.reportType === 'DAILY' && filters.format === 'PDF') {
        if (!filters.startDate) {
          console.error('Data inicial é obrigatória')
          return
        }

        // Buscar dados do relatório
        const multiDayReport = await getDailyReport(filters.startDate, filters.endDate, filters.shift)

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

        downloadDailyReportPDF(multiDayReport, {
          ilpiName,
          cnpj,
          userName,
          printDate,
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

      // TODO: Implementar chamada à API para outros tipos de relatórios
      console.log('Generating report with filters:', filters)

      // Simular processamento
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Adicionar aos recentes
      const newReport: RecentReport = {
        id: `report-${Date.now()}`,
        label: `Relatório ${filters.reportType}`,
        category: filters.reportType,
        timestamp: new Date(),
        filters,
      }

      setRecentReports((prev) => [newReport, ...prev.slice(0, 4)])

      // TODO: Abrir relatório gerado
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
      setIsShiftDialogOpen(true)
      return
    }

    // Navegar para a lista de residentes
    if (itemId === 'resident-list') {
      navigate('/dashboard/relatorios/residentes')
      return
    }

    // Para outros tipos, pré-preencher o gerador e scroll até ele
    // TODO: Implementar scroll e pré-preenchimento do gerador
    console.log('Selected report type:', reportType)
  }

  const handleConfirmShiftReport = () => {
    if (!selectedShiftTemplateId) return
    const params = new URLSearchParams()
    params.set('startDate', getCurrentDate())
    params.set('shiftTemplateId', selectedShiftTemplateId)
    setIsShiftDialogOpen(false)
    navigate(`/dashboard/relatorios/diario?${params.toString()}`)
  }

  // ========== RENDER ==========

  return (
    <Page>
      <PageHeader
        title="Relatórios e Documentos"
        subtitle="Geração unificada de relatórios operacionais, evidências de conformidade e documentos institucionais"
      />

      {/* Gerador Universal */}
      <div className="mb-8">
        <ReportGenerator onGenerate={handleGenerateReport} isLoading={isGenerating} />
      </div>

      {/* Categorias de Evidência */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Categorias de Evidência</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {REPORT_CATEGORIES.map((category) => (
            <Card
              key={category.id}
              className={`transition-all hover:shadow-md ${category.color} border-l-4`}
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
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
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
      </div>

      {/* Usados Recentemente */}
      {recentReports.length > 0 && (
        <>
          <Separator className="my-8" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <h2 className="text-2xl font-semibold">Usados Recentemente</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recentReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => console.log('Reopen report:', report.id)}
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
                    <Badge variant="outline" className="text-xs">
                      {report.category}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

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
