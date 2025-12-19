import { useResidentHistory } from '@/hooks/useResidents'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  History as HistoryIcon,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

  // Formatar data de forma amigável
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
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
            <Card className="border-danger/50 bg-danger/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-danger">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Erro ao carregar histórico</p>
                    <p className="text-sm mt-1">
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
              <Card className="bg-muted/50 border-muted">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nome Completo</p>
                      <p className="font-semibold">{data.resident.fullName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CPF</p>
                      <p className="font-semibold">{data.resident.cpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Versão Atual</p>
                      <p className="font-semibold">v{data.resident.currentVersion}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total de Versões</p>
                      <p className="font-semibold">{data.totalVersions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline de Histórico */}
              <div className="space-y-3">
                {data.history.map((entry: any, index: number) => (
                  <Card
                    key={entry.id}
                    className={`
                      relative border-l-4 transition-all hover:shadow-md
                      ${entry.changeType === 'CREATE' ? 'border-l-success' : ''}
                      ${entry.changeType === 'UPDATE' ? 'border-l-info' : ''}
                      ${entry.changeType === 'DELETE' ? 'border-l-danger' : ''}
                    `}
                  >
                    <CardContent className="p-4">
                      {/* Header do Entry */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getChangeTypeBadge(entry.changeType)}
                          <Badge variant="outline" className="font-mono text-xs">
                            v{entry.versionNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.changedAt)}
                        </div>
                      </div>

                      {/* Motivo da Alteração */}
                      <div className="mb-3 p-3 bg-muted/50 rounded-md">
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
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs font-mono"
                              >
                                {field}
                              </Badge>
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
              <Card className="bg-info/10 border-info/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Conformidade Regulatória</p>
                      <p className="text-xs text-muted-foreground">
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
