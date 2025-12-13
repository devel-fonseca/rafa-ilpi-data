import { useState, useEffect, useMemo } from 'react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { History, Clock, User, Filter, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClinicalNoteHistory } from '@/hooks/useClinicalNotes'
import { getProfessionLabel } from '@/utils/clinicalNotesConstants'

interface ClinicalNoteHistoryModalProps {
  noteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClinicalNoteHistoryModal({
  noteId,
  open,
  onOpenChange,
}: ClinicalNoteHistoryModalProps) {
  const { data: historyData, isLoading, error } = useClinicalNoteHistory(noteId || undefined)

  // Filter state
  const [filterUser, setFilterUser] = useState<string>('all')

  // Reset filters when dialog opens
  useEffect(() => {
    if (open) {
      setFilterUser('all')
    }
  }, [open])

  // Extract unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!historyData?.history) return []
    const users = new Set(historyData.history.map((v) => v.changedByUser.name))
    return Array.from(users).sort()
  }, [historyData])

  // Filter history based on selected user
  const filteredHistory = useMemo(() => {
    if (!historyData?.history) return []

    if (filterUser === 'all') {
      return historyData.history
    }

    return historyData.history.filter((version) => {
      return version.changedByUser.name === filterUser
    })
  }, [historyData, filterUser])

  // Clear filters
  const clearFilters = () => {
    setFilterUser('all')
  }

  const hasActiveFilters = filterUser !== 'all'

  // Render field comparison
  const renderFieldComparison = (
    label: string,
    currentValue: string | null,
    previousValue?: string | null
  ) => {
    if (!currentValue && !previousValue) return null

    const hasChanged = currentValue !== previousValue

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {currentValue ? (
          <div
            className={`bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap ${
              hasChanged ? 'border-l-4 border-l-amber-500' : ''
            }`}
          >
            {currentValue}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Não preenchido</p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            {historyData && (
              <>
                Versão atual: <strong>v{historyData.currentVersion}</strong>
                {historyData.isAmended && (
                  <Badge variant="destructive" className="ml-2">
                    Obsoleta
                  </Badge>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        {uniqueUsers.length > 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por usuário" />
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

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/30">
            Erro ao carregar histórico
          </div>
        )}

        {/* Histórico */}
        {historyData && filteredHistory.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma alteração encontrada com os filtros selecionados</p>
          </div>
        )}

        {historyData && filteredHistory.length > 0 && (
          <div className="space-y-4">
            {filteredHistory.map((version, index) => {
              const isExclusion = version.changeReason.startsWith('[EXCLUSÃO]')

              return (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  {/* Header da versão */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">Versão {version.version}</Badge>
                        <Badge variant="outline">
                          {getProfessionLabel(version.profession)}
                        </Badge>
                        {isExclusion && (
                          <Badge variant="destructive">Exclusão</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTimeSafe(version.changedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.changedByUser.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Motivo da alteração */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Motivo da {isExclusion ? 'exclusão' : 'alteração'}
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm">
                      {isExclusion
                        ? version.changeReason.replace('[EXCLUSÃO] ', '')
                        : version.changeReason}
                    </div>
                  </div>

                  <Separator />

                  {/* Conteúdo SOAP da versão */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Conteúdo desta versão:</p>

                    {renderFieldComparison(
                      '[S] Subjetivo',
                      version.subjective,
                      filteredHistory[index + 1]?.subjective
                    )}

                    {renderFieldComparison(
                      '[O] Objetivo',
                      version.objective,
                      filteredHistory[index + 1]?.objective
                    )}

                    {renderFieldComparison(
                      '[A] Avaliação',
                      version.assessment,
                      filteredHistory[index + 1]?.assessment
                    )}

                    {renderFieldComparison(
                      '[P] Plano',
                      version.plan,
                      filteredHistory[index + 1]?.plan
                    )}

                    {/* Tags */}
                    {version.tags && version.tags.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {version.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Botão fechar */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
