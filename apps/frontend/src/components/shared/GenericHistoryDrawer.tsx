import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, AlertCircle, CheckCircle, XCircle, History as HistoryIcon, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface GenericHistoryDrawerProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: {
    currentVersion: number
    totalVersions: number
    history: Array<{
      id: string
      versionNumber: number
      changeType: 'CREATE' | 'UPDATE' | 'DELETE'
      changeReason: string
      changedFields: string[]
      changedAt: string
      changedByName?: string
      previousData?: Partial<T>
      newData: Partial<T>
    }>
  }
  isLoading: boolean
  error: any
  title: string
  entityName?: string
  renderFieldChange?: (field: string, prevValue: any, newValue: any) => React.ReactNode
}

export function GenericHistoryDrawer<T = any>({
  open,
  onOpenChange,
  data,
  isLoading,
  error,
  title,
  entityName,
  renderFieldChange,
}: GenericHistoryDrawerProps<T>) {
  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return (
          <Badge className="bg-success/10 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Criação
          </Badge>
        )
      case 'UPDATE':
        return (
          <Badge className="bg-info/10 text-info border-info/30">
            <FileText className="w-3 h-3 mr-1" />
            Atualização
          </Badge>
        )
      case 'DELETE':
        return (
          <Badge className="bg-danger/10 text-danger border-danger/30">
            <XCircle className="w-3 h-3 mr-1" />
            Remoção
          </Badge>
        )
      default:
        return <Badge>{changeType}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
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
            {title}
          </SheetTitle>
          <SheetDescription>
            {entityName ? `Registro completo de alterações de ${entityName}` : 'Registro completo de todas as alterações'}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-danger/10 text-danger rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Erro ao carregar histórico</span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Versão Atual:</span>
                      <p className="font-semibold">{data.currentVersion}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total de Versões:</span>
                      <p className="font-semibold">{data.totalVersions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Linha do Tempo
                </h3>

                {data.history.map((version) => (
                  <Card key={version.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">v{version.versionNumber}</Badge>
                          {getChangeTypeBadge(version.changeType)}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(version.changedAt)}</span>
                      </div>

                      <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">Motivo:</p>
                        <p>{version.changeReason}</p>
                      </div>

                      {version.changedFields.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Campos Alterados:</p>
                          <div className="flex flex-wrap gap-1">
                            {version.changedFields.map((field) => (
                              <Badge key={field} variant="secondary" className="text-xs">{field}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {version.changeType === 'UPDATE' && version.previousData && renderFieldChange && (
                        <div className="space-y-2 text-sm">
                          {version.changedFields.map((field) =>
                            renderFieldChange(field, (version.previousData as any)?.[field], (version.newData as any)?.[field])
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>Alterado por: <strong>{version.changedByName || 'Sistema'}</strong></span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
