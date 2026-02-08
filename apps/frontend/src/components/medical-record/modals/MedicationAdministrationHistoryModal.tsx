// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - MedicationAdministrationHistoryModal (Histórico de Alterações)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { History, Clock, User, FileText, Filter, X, GitCompare } from 'lucide-react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/services/api'
import { getErrorMessage } from '@/utils/errorHandling'

// ========== TYPES ==========

interface HistoryVersion {
  id: string
  versionNumber: number
  changeType: 'UPDATE' | 'DELETE'
  changedFields: string[]
  previousData: Record<string, unknown>
  newData: Record<string, unknown>
  changeReason: string
  changedByName: string
  changedAt: string
}

interface HistoryResponse {
  administrationId: string
  totalVersions: number
  history: HistoryVersion[]
}

// ========== INTERFACE ==========

interface MedicationAdministrationHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  administrationId: string | null
}

// ========== COMPONENT ==========

export function MedicationAdministrationHistoryModal({
  open,
  onOpenChange,
  administrationId,
}: MedicationAdministrationHistoryModalProps) {
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Compare states
  const [showCompareDialog, setShowCompareDialog] = useState(false)
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (open && administrationId) {
      loadHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, administrationId])

  const loadHistory = async () => {
    if (!administrationId) return

    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/prescriptions/medication-administrations/${administrationId}/history`)
      setHistory(response.data)
    } catch (err: unknown) {
      console.error('Erro ao buscar histórico:', err)
      setError(getErrorMessage(err, 'Erro ao carregar histórico'))
    } finally {
      setLoading(false)
    }
  }

  const getChangeTypeLabel = (type: string) => {
    return type === 'UPDATE' ? 'Edição' : 'Exclusão'
  }

  const getChangeTypeBadgeVariant = (type: string) => {
    return type === 'UPDATE' ? 'default' : 'destructive'
  }

  const formatFieldName = (field: string) => {
    const fieldLabels: Record<string, string> = {
      wasAdministered: 'Status',
      actualTime: 'Horário Real',
      scheduledTime: 'Horário Programado',
      reason: 'Motivo',
      notes: 'Observações',
      checkedBy: 'Checado por',
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
      if (filterUser !== 'all' && version.changedByName !== filterUser) {
        return false
      }
      if (filterType !== 'all' && version.changeType !== filterType) {
        return false
      }
      return true
    })
  }, [history, filterUser, filterType])

  const clearFilters = () => {
    setFilterUser('all')
    setFilterType('all')
  }

  const hasActiveFilters = filterUser !== 'all' || filterType !== 'all'

  const handleCompareClick = (versionId: string) => {
    setCompareVersionId(versionId)
    setShowCompareDialog(true)
  }

  const getVersionById = (versionId: string | null) => {
    if (!versionId || !history) return null
    return history.history.find((v) => v.id === versionId)
  }

  const getFieldDifferences = (
    previousData: Record<string, unknown>,
    newData: Record<string, unknown>,
    changedFields: string[]
  ) => {
    const differences: Array<{
      field: string
      oldValue: unknown
      newValue: unknown
      type: 'added' | 'removed' | 'changed'
    }> = []

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

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '(vazio)'
    }
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            Todas as alterações realizadas nesta administração de medicamento
          </DialogDescription>
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
            </div>

            <Separator />

            {/* Filtros */}
            {history.totalVersions > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4" />
                  Filtros
                </div>

                <div className="flex flex-wrap gap-3">
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

                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando <strong>{filteredHistory.length}</strong> de{' '}
                    <strong>{history.totalVersions}</strong> versões
                  </p>
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-6">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>
                    {history.totalVersions === 0
                      ? 'Nenhuma alteração registrada'
                      : 'Nenhuma versão encontrada com os filtros aplicados'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((version) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
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
                        <span>{formatDateTimeSafe(version.changedAt)}</span>
                      </div>
                    </div>

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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompareClick(version.id)}
                            title="Comparar versões"
                          >
                            <GitCompare className="h-4 w-4 mr-1" />
                            Comparar
                          </Button>
                        )}
                      </div>
                    </div>

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
                      <span>{formatDateTimeSafe(compareVersion.changedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{compareVersion.changedByName}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    {differences.length} {differences.length === 1 ? 'campo alterado' : 'campos alterados'}
                  </p>

                  {differences.map((diff, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatFieldName(diff.field)}
                        </span>
                        {diff.type === 'added' && (
                          <Badge className="bg-success/10 text-success border-success/30">
                            Adicionado
                          </Badge>
                        )}
                        {diff.type === 'removed' && (
                          <Badge className="bg-danger/10 text-danger border-danger/30">
                            Removido
                          </Badge>
                        )}
                        {diff.type === 'changed' && (
                          <Badge className="bg-warning/10 text-warning border-warning/30">
                            Alterado
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Valor anterior
                          </p>
                          <div className="bg-danger/5 border border-danger/30 p-3 rounded text-sm">
                            {typeof diff.oldValue === 'object' ? (
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                {formatValue(diff.oldValue)}
                              </pre>
                            ) : (
                              <span>{formatValue(diff.oldValue)}</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Valor novo
                          </p>
                          <div className="bg-success/5 border border-success/30 p-3 rounded text-sm">
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
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
