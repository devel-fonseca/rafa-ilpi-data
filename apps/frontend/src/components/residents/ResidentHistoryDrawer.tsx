import { useResidentHistory } from '@/hooks/useResidents'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusBadge } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  History as HistoryIcon,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { normalizeUTCDate } from '@/utils/dateHelpers'

interface ResidentHistoryEntry {
  id: string
  changeType: 'CREATE' | 'UPDATE' | 'DELETE'
  changedAt: string
  changedBy: {
    name: string
    email: string
  }
  changedFields?: string[]
  changeReason?: string
  [key: string]: unknown
}

interface ResidentHistoryDrawerProps {
  residentId: string | undefined
  residentName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResidentHistoryDrawer({
  residentId,
  residentName,
  open,
  onOpenChange,
}: ResidentHistoryDrawerProps) {
  const { data, isLoading, error } = useResidentHistory(residentId)

  // Badge de tipo de mudança
  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return (
          <StatusBadge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3 mr-1" />
            Criação
          </StatusBadge>
        )
      case 'UPDATE':
        return (
          <StatusBadge variant="warning" className="gap-1">
            <FileText className="w-3 h-3 mr-1" />
            Atualização
          </StatusBadge>
        )
      case 'DELETE':
        return (
          <StatusBadge variant="danger" className="gap-1">
            <XCircle className="w-3 h-3 mr-1" />
            Remoção
          </StatusBadge>
        )
      default:
        return <StatusBadge variant="outline">{changeType}</StatusBadge>
    }
  }

  const getTimelineBorderClass = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return 'border-l-success'
      case 'UPDATE':
        return 'border-l-warning'
      case 'DELETE':
        return 'border-l-danger'
      default:
        return 'border-l-border'
    }
  }

  // Formatar data de forma amigável
  const formatDate = (dateString: string) => {
    try {
      // Usar normalizeUTCDate para evitar timezone shift (DATETIME_STANDARD.md)
      const date = normalizeUTCDate(dateString)
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            Histórico de Alterações
          </SheetTitle>
          <SheetDescription>
            {residentName ? (
              <>Registro completo de alterações de <strong>{residentName}</strong></>
            ) : (
              'Registro completo de todas as alterações do prontuário'
            )}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Carregando histórico...</div>
            </div>
          )}

          {error && (
            <Card className="border-danger/30 bg-danger/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-danger" />
                  <div>
                    <p className="font-semibold text-danger">Erro ao carregar histórico</p>
                    <p className="text-sm mt-1 text-muted-foreground">
                      Não foi possível buscar o histórico de alterações.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {data && data.history && data.history.length === 0 && (
            <Card className="border-muted">
              <CardContent className="p-6 text-center">
                <HistoryIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma alteração registrada</p>
              </CardContent>
            </Card>
          )}

          {data && data.history && data.history.length > 0 && (
            <div className="space-y-4">
              {/* Informação do Residente */}
              <Card className="bg-muted/30 border-border">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome Completo</p>
                      <p className="font-semibold text-foreground">{data.resident.fullName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CPF</p>
                      <p className="font-semibold text-foreground">{data.resident.cpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Versão Atual</p>
                      <p className="font-semibold text-foreground">v{data.resident.currentVersion}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total de Versões</p>
                      <p className="font-semibold text-foreground">{data.totalVersions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline de Histórico */}
              <div className="space-y-3">
                {data.history.map((entry: ResidentHistoryEntry, index: number) => (
                  <Card
                    key={entry.id}
                    className={cn(
                      'relative border-l-4 transition-all hover:shadow-md bg-card',
                      getTimelineBorderClass(entry.changeType)
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Header do Entry */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getChangeTypeBadge(entry.changeType)}
                          <StatusBadge variant="outline" className="font-mono text-xs">
                            v{entry.versionNumber}
                          </StatusBadge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.changedAt)}
                        </div>
                      </div>

                      {/* Motivo da Alteração */}
                      <div className="mb-3 p-3 bg-muted/70 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1 font-semibold">
                          Motivo da Alteração
                        </p>
                        <p className="text-sm">{entry.changeReason}</p>
                      </div>

                      {/* Campos Alterados */}
                      {entry.changedFields && entry.changedFields.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-2 font-semibold">
                            Campos Alterados ({entry.changedFields.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {entry.changedFields.map((field: string, idx: number) => (
                              <StatusBadge
                                key={idx}
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                {field}
                              </StatusBadge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Informações do Usuário */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{entry.changedBy.name}</span>
                        <span>•</span>
                        <span className="text-xs">{entry.changedBy.email}</span>
                      </div>

                      {/* Indicador de Linha do Tempo */}
                      {index < data.history.length - 1 && (
                        <div className="absolute left-0 top-full h-3 w-1 bg-border -ml-[2px]" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Nota de Conformidade */}
              <Card className="bg-warning/5 dark:bg-warning/20 border-warning/30 dark:border-warning/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-warning/90 dark:text-warning mb-1">Conformidade Regulatória</p>
                      <p className="text-xs text-warning/90 dark:text-warning">
                        Este histórico é imutável e está em conformidade com a RDC 502/2021 Art. 39 (ANVISA)
                        e LGPD Art. 48, garantindo rastreabilidade completa de todas as alterações no prontuário.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
