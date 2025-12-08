import { useState, useEffect, useMemo } from 'react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { History, Clock, User, FileText, Filter, X, RotateCcw, GitCompare, Download } from 'lucide-react'
// TODO: Migrar para @react-pdf/renderer
// import html2pdf from 'html2pdf.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { dailyRecordsAPI, type DailyRecordHistoryResponse } from '@/api/dailyRecords.api'
import { getRecordTypeConfig } from '@/design-system/tokens/colors'

interface DailyRecordHistoryModalProps {
  recordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordUpdated?: () => void
}

export function DailyRecordHistoryModal({
  recordId,
  open,
  onOpenChange,
  onRecordUpdated,
}: DailyRecordHistoryModalProps) {
  const [history, setHistory] = useState<DailyRecordHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Restore states
  const [restoring, setRestoring] = useState(false)
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null)
  const [restoreReason, setRestoreReason] = useState('')
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)

  // Compare states
  const [showCompareDialog, setShowCompareDialog] = useState(false)
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (open && recordId) {
      loadHistory()
    }
  }, [open, recordId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dailyRecordsAPI.getHistory(recordId)
      setHistory(data)
    } catch (err: any) {
      console.error('Erro ao buscar histórico:', err)
      setError(err.response?.data?.message || 'Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return formatDateTimeSafe(dateString)
  }

  const getChangeTypeLabel = (type: string) => {
    return type === 'UPDATE' ? 'Edição' : 'Exclusão'
  }

  const getChangeTypeBadgeVariant = (type: string) => {
    return type === 'UPDATE' ? 'default' : 'destructive'
  }

  const formatFieldName = (field: string) => {
    const fieldLabels: Record<string, string> = {
      type: 'Tipo',
      date: 'Data',
      time: 'Horário',
      data: 'Dados',
      recordedBy: 'Registrado por',
      notes: 'Observações',
      deletedAt: 'Excluído em',
    }
    return fieldLabels[field] || field
  }

  // Extract unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!history) return []
    const users = new Set(history.history.map((v) => v.changedByName))
    return Array.from(users).sort()
  }, [history])

  // Filter history based on selected filters
  const filteredHistory = useMemo(() => {
    if (!history) return []

    return history.history.filter((version) => {
      // Filter by user
      if (filterUser !== 'all' && version.changedByName !== filterUser) {
        return false
      }

      // Filter by change type
      if (filterType !== 'all' && version.changeType !== filterType) {
        return false
      }

      return true
    })
  }, [history, filterUser, filterType])

  // Clear all filters
  const clearFilters = () => {
    setFilterUser('all')
    setFilterType('all')
  }

  // Check if any filter is active
  const hasActiveFilters = filterUser !== 'all' || filterType !== 'all'

  // Handle restore version
  const handleRestoreClick = (versionId: string, versionNumber: number) => {
    setRestoreVersionId(versionId)
    setRestoreReason('')
    setShowRestoreDialog(true)
  }

  const handleRestoreConfirm = async () => {
    if (!restoreVersionId || restoreReason.length < 10) {
      return
    }

    try {
      setRestoring(true)
      await dailyRecordsAPI.restoreVersion(recordId, restoreVersionId, restoreReason)

      // Reload history
      await loadHistory()

      // Notify parent component
      onRecordUpdated?.()

      // Close restore dialog
      setShowRestoreDialog(false)
      setRestoreVersionId(null)
      setRestoreReason('')
    } catch (err: any) {
      console.error('Erro ao restaurar versão:', err)
      alert(err.response?.data?.message || 'Erro ao restaurar versão')
    } finally {
      setRestoring(false)
    }
  }

  // Handle compare version
  const handleCompareClick = (versionId: string) => {
    setCompareVersionId(versionId)
    setShowCompareDialog(true)
  }

  // Get version by ID
  const getVersionById = (versionId: string | null) => {
    if (!versionId || !history) return null
    return history.history.find((v) => v.id === versionId)
  }

  // Compare two objects and return differences using changedFields
  const getFieldDifferences = (previousData: any, newData: any, changedFields: string[]) => {
    const differences: Array<{
      field: string
      oldValue: any
      newValue: any
      type: 'added' | 'removed' | 'changed'
    }> = []

    // Use only the fields that were actually changed
    changedFields.forEach((key) => {
      const oldValue = previousData?.[key]
      const newValue = newData?.[key]

      if (oldValue === undefined && newValue !== undefined) {
        differences.push({ field: key, oldValue: null, newValue, type: 'added' })
      } else if (oldValue !== undefined && newValue === undefined) {
        differences.push({ field: key, oldValue, newValue: null, type: 'removed' })
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        differences.push({ field: key, oldValue, newValue, type: 'changed' })
      }
    })

    return differences
  }

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '(vazio)'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  // Export history to PDF
  const handleExportPDF = async () => {
    if (!history) return

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          .header h1 {
            font-size: 18px;
            color: #333;
            margin-bottom: 8px;
          }
          .header .info {
            font-size: 11px;
            color: #666;
          }
          .summary {
            background-color: #f5f5f5;
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .summary .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          .version {
            border: 1px solid #ddd;
            padding: 12px;
            margin-bottom: 12px;
            border-radius: 4px;
            page-break-inside: avoid;
          }
          .version-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .version-badge {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 6px;
          }
          .badge-update {
            background-color: #e3f2fd;
            color: #1976d2;
          }
          .badge-delete {
            background-color: #ffebee;
            color: #c62828;
          }
          .version-info {
            font-size: 10px;
            color: #666;
            margin-top: 4px;
          }
          .reason-box {
            background-color: #f9f9f9;
            padding: 8px;
            margin: 8px 0;
            border-left: 3px solid #999;
          }
          .reason-label {
            font-weight: bold;
            font-size: 10px;
            color: #555;
            margin-bottom: 4px;
          }
          .reason-text {
            font-size: 11px;
            color: #333;
          }
          .fields {
            margin-top: 8px;
          }
          .fields-label {
            font-weight: bold;
            font-size: 10px;
            color: #555;
            margin-bottom: 4px;
          }
          .field-badge {
            display: inline-block;
            padding: 2px 6px;
            margin: 2px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 9px;
            background-color: white;
          }
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Histórico de Versões - Registro Diário</h1>
          <div class="info">
            <p>Data de geração: ${formatDateTime(new Date().toISOString())}</p>
            <p>Registro ID: ${history.recordId}</p>
          </div>
        </div>

        <div class="summary">
          <div>
            <strong>Total de versões:</strong> ${history.totalVersions}
          </div>
          <div>
            <span class="badge">${getRecordTypeConfig(history.recordType).label}</span>
          </div>
        </div>

        ${filteredHistory.map((version) => `
          <div class="version">
            <div class="version-header">
              <div>
                <span class="version-badge ${version.changeType === 'UPDATE' ? 'badge-update' : 'badge-delete'}">
                  ${getChangeTypeLabel(version.changeType)}
                </span>
                <strong>Versão #${version.versionNumber}</strong>
                <div class="version-info">
                  👤 ${version.changedByName} • 🕒 ${formatDateTime(version.changedAt)}
                </div>
              </div>
            </div>

            <div class="reason-box">
              <div class="reason-label">Motivo:</div>
              <div class="reason-text">${version.changeReason}</div>
            </div>

            ${version.changedFields.length > 0 ? `
              <div class="fields">
                <div class="fields-label">Campos alterados:</div>
                <div>
                  ${version.changedFields.map(field => `
                    <span class="field-badge">${formatFieldName(field)}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}

        <div class="footer">
          <p>Documento gerado pelo Sistema RAFA ILPI - Histórico de Auditoria</p>
          <p>Este documento contém informações confidenciais e deve ser tratado de acordo com as políticas de privacidade da instituição</p>
        </div>
      </body>
      </html>
    `

    // Create temporary element
    const element = document.createElement('div')
    element.innerHTML = htmlContent
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    document.body.appendChild(element)

    // TODO: Migrar para @react-pdf/renderer
    alert('Funcionalidade de exportação para PDF temporariamente desabilitada. Será migrada para @react-pdf/renderer.')

    // Remove temporary element
    document.body.removeChild(element)

    // PDF options
    // const opt = {
    //   margin: [10, 10, 10, 10],
    //   filename: `historico-registro-${recordId}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`,
    //   image: { type: 'jpeg', quality: 0.98 },
    //   html2canvas: {
    //     scale: 2,
    //     useCORS: true,
    //     letterRendering: true
    //   },
    //   jsPDF: {
    //     unit: 'mm',
    //     format: 'a4',
    //     orientation: 'portrait'
    //   }
    // }

    // try {
    //   await html2pdf().set(opt).from(element).save()
    // } finally {
    //   // Remove temporary element
    //   document.body.removeChild(element)
    // }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Versões
              </DialogTitle>
              <DialogDescription>
                Todas as alterações realizadas neste registro
              </DialogDescription>
            </div>
            {history && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="shrink-0"
                title="Exportar histórico para PDF"
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        {history && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <strong className="text-foreground">Total de versões:</strong> {history.totalVersions}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Tipo:</span>
                <Badge className={getRecordTypeConfig(history.recordType).bgColor}>
                  <span className={getRecordTypeConfig(history.recordType).color}>
                    {getRecordTypeConfig(history.recordType).label}
                  </span>
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Filtros */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filtros
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Filtro por usuário */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Usuário
                  </label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {uniqueUsers.map((user) => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por tipo de alteração */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Tipo de alteração
                  </label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="UPDATE">Edição</SelectItem>
                      <SelectItem value="DELETE">Exclusão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão limpar filtros */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>

              {/* Contador de resultados filtrados */}
              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground">
                  Mostrando <strong>{filteredHistory.length}</strong> de{' '}
                  <strong>{history.totalVersions}</strong> versões
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-6">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma versão encontrada com os filtros aplicados</p>
                </div>
              ) : (
                filteredHistory.map((version) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  {/* Cabeçalho da versão */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getChangeTypeBadgeVariant(version.changeType)}>
                          {getChangeTypeLabel(version.changeType)}
                        </Badge>
                        <span className="text-sm font-medium">
                          Versão #{version.versionNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{version.changedByName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(version.changedAt)}</span>
                    </div>
                  </div>

                  {/* Motivo da alteração */}
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Motivo:</p>
                        <p className="text-sm text-muted-foreground">
                          {version.changeReason}
                        </p>
                      </div>
                      {version.changeType === 'UPDATE' && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompareClick(version.id)}
                            title="Comparar versões"
                          >
                            <GitCompare className="h-4 w-4 mr-1" />
                            Comparar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreClick(version.id, version.versionNumber)}
                            title="Restaurar esta versão"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restaurar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campos alterados */}
                  {version.changedFields.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Campos alterados:</p>
                      <div className="flex flex-wrap gap-1">
                        {version.changedFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {formatFieldName(field)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detalhes da alteração */}
                  {version.changeType === 'UPDATE' && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver detalhes técnicos
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                            Dados anteriores:
                          </p>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(version.previousData, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                            Dados novos:
                          </p>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(version.newData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              ))
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Dialog de confirmação de restauração */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Restaurar Versão
            </DialogTitle>
            <DialogDescription>
              Você está prestes a restaurar o registro para uma versão anterior. Esta ação criará uma nova entrada no histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restoreReason" className="text-sm font-medium">
                Motivo da restauração <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="restoreReason"
                placeholder="Descreva o motivo para restaurar esta versão (mínimo 10 caracteres)..."
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {restoreReason.length}/10 caracteres mínimos
              </p>
            </div>

            {restoreReason.length > 0 && restoreReason.length < 10 && (
              <p className="text-xs text-destructive">
                O motivo deve ter pelo menos 10 caracteres
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog(false)}
              disabled={restoring}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestoreConfirm}
              disabled={restoring || restoreReason.length < 10}
              className="bg-primary"
            >
              {restoring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirmar Restauração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de comparação de versões */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparação de Versões
            </DialogTitle>
            <DialogDescription>
              Diferenças entre a versão anterior e a nova versão
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const compareVersion = getVersionById(compareVersionId)
            if (!compareVersion) return null

            const differences = getFieldDifferences(
              compareVersion.previousData,
              compareVersion.newData,
              compareVersion.changedFields
            )

            if (differences.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <GitCompare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma diferença encontrada</p>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {/* Resumo da versão */}
                <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={getChangeTypeBadgeVariant(compareVersion.changeType)}>
                        {getChangeTypeLabel(compareVersion.changeType)}
                      </Badge>
                      <span className="font-medium">
                        Versão #{compareVersion.versionNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(compareVersion.changedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{compareVersion.changedByName}</span>
                  </div>
                </div>

                <Separator />

                {/* Lista de diferenças */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    {differences.length} {differences.length === 1 ? 'campo alterado' : 'campos alterados'}
                  </p>

                  {differences.map((diff, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Nome do campo com badge de tipo de mudança */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatFieldName(diff.field)}
                        </span>
                        {diff.type === 'added' && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Adicionado
                          </Badge>
                        )}
                        {diff.type === 'removed' && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Removido
                          </Badge>
                        )}
                        {diff.type === 'changed' && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Alterado
                          </Badge>
                        )}
                      </div>

                      {/* Comparação lado a lado */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Valor anterior */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Valor anterior
                          </p>
                          <div className={`bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3 rounded text-sm ${
                            typeof diff.oldValue === 'object' ? 'font-mono' : ''
                          }`}>
                            {typeof diff.oldValue === 'object' ? (
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                {formatValue(diff.oldValue)}
                              </pre>
                            ) : (
                              <span>{formatValue(diff.oldValue)}</span>
                            )}
                          </div>
                        </div>

                        {/* Valor novo */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Valor novo
                          </p>
                          <div className={`bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 rounded text-sm ${
                            typeof diff.newValue === 'object' ? 'font-mono' : ''
                          }`}>
                            {typeof diff.newValue === 'object' ? (
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                {formatValue(diff.newValue)}
                              </pre>
                            ) : (
                              <span>{formatValue(diff.newValue)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompareDialog(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
