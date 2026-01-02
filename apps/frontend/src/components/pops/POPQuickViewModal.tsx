import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Calendar,
  User,
  Tag,
  Paperclip,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { usePop } from '@/hooks/usePops'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

// ──────────────────────────────────────────────────────────────────────────
// PROPS
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  popId: string | null
  onClose: () => void
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ──────────────────────────────────────────────────────────────────────────

export function POPQuickViewModal({ popId, onClose }: Props) {
  const navigate = useNavigate()

  // Buscar dados do POP
  const { data: pop, isLoading, isError } = usePop(popId || undefined)

  // Editor Tiptap para visualizar conteúdo HTML (read-only)
  const editor = useEditor({
    extensions: [StarterKit],
    content: pop?.content || '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
      },
    },
  })

  // Atualizar conteúdo do editor quando POP carregar
  useEffect(() => {
    if (pop?.content && editor) {
      editor.commands.setContent(pop.content)
    }
  }, [pop?.content, editor])

  // Traduzir categoria
  const translateCategory = (category: string) => {
    const map: Record<string, string> = {
      HIGIENE: 'Higiene',
      ALIMENTACAO: 'Alimentação',
      MEDICACAO: 'Medicação',
      MONITORAMENTO: 'Monitoramento',
      MOBILIDADE: 'Mobilidade',
      SEGURANCA: 'Segurança',
      ADMINISTRATIVO: 'Administrativo',
      EMERGENCIA: 'Emergência',
      OUTROS: 'Outros',
    }
    return map[category] || category
  }

  // Traduzir status
  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'Rascunho',
      PUBLISHED: 'Publicado',
      OBSOLETE: 'Obsoleto',
    }
    return map[status] || status
  }

  // Variant do badge de status
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    const map: Record<string, 'default' | 'secondary' | 'destructive'> = {
      DRAFT: 'secondary',
      PUBLISHED: 'default',
      OBSOLETE: 'destructive',
    }
    return map[status] || 'secondary'
  }

  // Navegar para página completa do POP
  const handleViewFullPop = () => {
    if (popId) {
      navigate(`/dashboard/pops/${popId}`)
      onClose()
    }
  }

  if (!popId) {
    return null
  }

  return (
    <Dialog open={!!popId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Visualização Rápida - POP
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !pop ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
            <p className="text-sm font-medium">Erro ao carregar POP</p>
            <p className="text-xs mt-1">O procedimento pode ter sido removido ou você não tem permissão para visualizá-lo</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Fechar
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
            <div className="space-y-4 pb-4">
              {/* Header: Título + Status */}
              <div className="pb-3 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {pop.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(pop.status)}>
                        {translateStatus(pop.status)}
                      </Badge>
                      <Badge variant="outline">
                        v{pop.version}
                      </Badge>
                      <Badge variant="secondary">
                        {translateCategory(pop.category)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo do Procedimento - DESTAQUE PRINCIPAL */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3 bg-primary/5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Procedimento Operacional Padrão
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  {editor ? (
                    <div className="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
                      <EditorContent editor={editor} />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Carregando conteúdo do procedimento...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Anexos */}
              {pop.attachments && pop.attachments.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-primary" />
                      Anexos de Apoio ({pop.attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pop.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {attachment.fileName}
                            </p>
                            {attachment.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {attachment.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(attachment.fileUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notas do POP */}
              {pop.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Observações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {pop.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Informações Técnicas - Colapsível e secundário */}
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Informações Técnicas</span>
                        </div>
                        <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </summary>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Publicação */}
                      {pop.publishedAt && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Publicado em
                          </p>
                          <p className="text-foreground">
                            {format(new Date(pop.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}

                      {/* Intervalo de Revisão */}
                      {pop.reviewIntervalMonths && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Revisão
                          </p>
                          <p className="text-foreground">
                            A cada {pop.reviewIntervalMonths} {pop.reviewIntervalMonths === 1 ? 'mês' : 'meses'}
                          </p>
                        </div>
                      )}

                      {/* Última Revisão */}
                      {pop.lastReviewedAt && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Última Revisão
                          </p>
                          <p className="text-foreground">
                            {format(new Date(pop.lastReviewedAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}

                      {/* Próxima Revisão */}
                      {pop.nextReviewDate && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Próxima Revisão
                          </p>
                          <p className="text-foreground">
                            {format(new Date(pop.nextReviewDate), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </details>

              {/* Botão para ver detalhes completos */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button onClick={handleViewFullPop} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Ver Detalhes Completos
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
