import { useUserHistory } from '@/hooks/useUserVersioning'
import type { User } from '@/api/users.api'
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
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  History as HistoryIcon,
  Calendar,
  Shield,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { normalizeUTCDate } from '@/utils/dateHelpers'

interface UserHistoryDrawerProps {
  userId: string | undefined
  userName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserHistoryDrawer({
  userId,
  userName,
  open,
  onOpenChange,
}: UserHistoryDrawerProps) {
  const { data, isLoading, error } = useUserHistory(userId || null)

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
      // Usar normalizeUTCDate para evitar timezone shift (DATETIME_STANDARD.md)
      const date = normalizeUTCDate(dateString)
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  // Mapear papel do usuário para nome amigável
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'Administrador',
      COORDENADOR: 'Coordenador',
      ENFERMEIRO: 'Enfermeiro',
      TECNICO_ENFERMAGEM: 'Técnico de Enfermagem',
      CUIDADOR: 'Cuidador',
      MEDICO: 'Médico',
      NUTRICIONISTA: 'Nutricionista',
      FISIOTERAPEUTA: 'Fisioterapeuta',
      PSICOLOGO: 'Psicólogo',
      ASSISTENTE_SOCIAL: 'Assistente Social',
    }
    return roles[role] || role
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
            {userName ? (
              <>Registro completo de alterações de <strong>{userName}</strong></>
            ) : (
              'Registro completo de todas as alterações do usuário'
            )}
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
              {/* Informações gerais */}
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

              {/* Timeline de versões */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Linha do Tempo
                </h3>

                {data.history.map((version) => (
                  <Card key={version.id} className="relative">
                    <CardContent className="p-4">
                      {/* Header da versão */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            v{version.versionNumber}
                          </Badge>
                          {getChangeTypeBadge(version.changeType)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(version.changedAt)}
                        </span>
                      </div>

                      {/* Motivo da alteração */}
                      <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">
                          Motivo:
                        </p>
                        <p>{version.changeReason}</p>
                      </div>

                      {/* Campos alterados */}
                      {version.changedFields.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Campos Alterados:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {version.changedFields.map((field) => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {field === 'name' && 'Nome'}
                                {field === 'email' && 'E-mail'}
                                {field === 'role' && 'Papel'}
                                {field === 'isActive' && 'Status Ativo'}
                                {field === 'password' && 'Senha'}
                                {!['name', 'email', 'role', 'isActive', 'password'].includes(field) && field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alterações detalhadas */}
                      {version.changeType === 'UPDATE' && version.previousData && (
                        <div className="space-y-2 text-sm">
                          {version.changedFields.map((field) => {
                            const prevValue = (version.previousData as Partial<User>)?.[field as keyof User]
                            const newValue = (version.newData as Partial<User>)?.[field as keyof User]

                            // Não exibir password
                            if (field === 'password') {
                              return (
                                <div key={field} className="grid grid-cols-2 gap-2 pb-2 border-b">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Senha:</p>
                                    <p className="font-medium text-amber-600">
                                      {prevValue?.passwordChanged ? '●●●●●●●● (alterada)' : '●●●●●●●●'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">→</p>
                                    <p className="font-medium text-success">
                                      {newValue?.passwordChanged ? '●●●●●●●● (alterada)' : '●●●●●●●●'}
                                    </p>
                                  </div>
                                </div>
                              )
                            }

                            if (field === 'role') {
                              return (
                                <div key={field} className="grid grid-cols-2 gap-2 pb-2 border-b">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Papel Anterior:</p>
                                    <div className="flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      <p className="font-medium">{getRoleLabel(prevValue)}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">→ Novo Papel:</p>
                                    <div className="flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      <p className="font-medium text-success">{getRoleLabel(newValue)}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            if (field === 'isActive') {
                              return (
                                <div key={field} className="grid grid-cols-2 gap-2 pb-2 border-b">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Status Anterior:</p>
                                    <p className="font-medium">
                                      {prevValue ? (
                                        <Badge className="bg-success/10 text-success">Ativo</Badge>
                                      ) : (
                                        <Badge className="bg-danger/10 text-danger">Inativo</Badge>
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">→ Novo Status:</p>
                                    <p className="font-medium">
                                      {newValue ? (
                                        <Badge className="bg-success/10 text-success">Ativo</Badge>
                                      ) : (
                                        <Badge className="bg-danger/10 text-danger">Inativo</Badge>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div key={field} className="grid grid-cols-2 gap-2 pb-2 border-b">
                                <div>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {field === 'name' ? 'Nome' : field === 'email' ? 'E-mail' : field} Anterior:
                                  </p>
                                  <p className="font-medium">{String(prevValue || '-')}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">→ Novo:</p>
                                  <p className="font-medium text-success">{String(newValue || '-')}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Rodapé com autor */}
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>
                          Alterado por: <strong>{version.changedByName}</strong>
                        </span>
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
