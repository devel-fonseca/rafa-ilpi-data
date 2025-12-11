import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Send,
  FileText,
  GitBranch,
  History,
  Paperclip,
  Download,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Separator } from '../../components/ui/separator'
import { usePop, useMarkPopReviewed, usePublishPop } from '../../hooks/usePops'
import {
  PopStatus,
  PopStatusLabels,
  PopCategoryLabels,
  PopStatusColors,
} from '../../types/pop.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PopVersionModal from './PopVersionModal'
import PopObsoleteModal from './PopObsoleteModal'

export default function PopViewer() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showObsoleteModal, setShowObsoleteModal] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)

  const { data: pop, isLoading } = usePop(id)
  const markReviewed = useMarkPopReviewed()
  const publishPop = usePublishPop()

  const handleMarkAsReviewed = async () => {
    if (id) {
      await markReviewed.mutateAsync(id)
      setShowReviewDialog(false)
    }
  }

  const handlePublish = async () => {
    if (id) {
      await publishPop.mutateAsync(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Carregando POP...</p>
        </div>
      </div>
    )
  }

  if (!pop) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">POP não encontrado</h3>
          <Button className="mt-4" onClick={() => navigate('/dashboard/pops')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/pops')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {pop.title}
                </h1>
                <Badge variant={PopStatusColors[pop.status]}>
                  {PopStatusLabels[pop.status]}
                </Badge>
                {pop.requiresReview && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Precisa Revisão
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-4 w-4" />
                  Versão {pop.version}
                </span>
                <span>•</span>
                <span>{PopCategoryLabels[pop.category]}</span>
                <span>•</span>
                <span>
                  Criado em{' '}
                  {format(new Date(pop.createdAt), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {/* Edit (only DRAFT) */}
            {pop.status === PopStatus.DRAFT && (
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboard/pops/${id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}

            {/* Publish (only DRAFT) - TODO: Add permission check */}
            {pop.status === PopStatus.DRAFT && (
              <Button onClick={handlePublish}>
                <Send className="mr-2 h-4 w-4" />
                Publicar
              </Button>
            )}

            {/* New Version (only PUBLISHED) - TODO: Add permission check */}
            {pop.status === PopStatus.PUBLISHED && (
              <Button onClick={() => setShowVersionModal(true)}>
                <GitBranch className="mr-2 h-4 w-4" />
                Nova Versão
              </Button>
            )}

            {/* Mark Obsolete (only PUBLISHED) - TODO: Add permission check */}
            {pop.status === PopStatus.PUBLISHED && (
              <Button
                variant="destructive"
                onClick={() => setShowObsoleteModal(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Marcar Obsoleto
              </Button>
            )}

            {/* Mark as Reviewed (only if requiresReview) - TODO: Add permission check */}
            {pop.requiresReview && pop.status === PopStatus.PUBLISHED && (
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(true)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como Revisado
              </Button>
            )}

            {/* History */}
            <Button
              variant="ghost"
              onClick={() => navigate(`/dashboard/pops/${id}/history`)}
            >
              <History className="mr-2 h-4 w-4" />
              Histórico
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {pop.requiresReview && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-semibold">Este POP precisa de revisão</p>
                <p className="text-sm text-muted-foreground">
                  A data de revisão venceu. Revise o conteúdo e marque como
                  revisado ou crie uma nova versão.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo do POP</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="tiptap prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: pop.content }}
                />
              </CardContent>
            </Card>

            {/* Attachments */}
            {pop.attachments && pop.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Anexos ({pop.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pop.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{attachment.fileName}</p>
                            {attachment.description && (
                              <p className="text-sm text-muted-foreground">
                                {attachment.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Info */}
            {pop.status === PopStatus.PUBLISHED && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Revisão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {pop.lastReviewedAt && (
                    <div>
                      <p className="font-medium">Última Revisão</p>
                      <p className="text-muted-foreground">
                        {format(new Date(pop.lastReviewedAt), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                  {pop.nextReviewDate && (
                    <div>
                      <p className="font-medium">Próxima Revisão</p>
                      <p className="text-muted-foreground">
                        {format(new Date(pop.nextReviewDate), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                  {pop.reviewIntervalMonths && (
                    <div>
                      <p className="font-medium">Intervalo</p>
                      <p className="text-muted-foreground">
                        {pop.reviewIntervalMonths} meses
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Categoria</p>
                  <p className="text-muted-foreground">
                    {PopCategoryLabels[pop.category]}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium">Criado em</p>
                  <p className="text-muted-foreground">
                    {format(new Date(pop.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Atualizado em</p>
                  <p className="text-muted-foreground">
                    {format(new Date(pop.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {pop.publishedAt && (
                  <div>
                    <p className="font-medium">Publicado em</p>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(pop.publishedAt),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {pop.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas Internas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {pop.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Version History Link */}
            {pop.version > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Versionamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Este POP está na versão {pop.version}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/dashboard/pops/${id}/history`)}
                  >
                    Ver Todas as Versões
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PopVersionModal
        open={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        popId={id!}
        currentTitle={pop.title}
        currentContent={pop.content}
        currentReviewMonths={pop.reviewIntervalMonths || undefined}
      />

      <PopObsoleteModal
        open={showObsoleteModal}
        onClose={() => setShowObsoleteModal(false)}
        popId={id!}
        popTitle={pop.title}
      />

      {/* Review Confirmation Dialog */}
      <AlertDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Revisado</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma que este POP foi revisado e o conteúdo continua adequado
              sem necessidade de alterações? A próxima data de revisão será
              recalculada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsReviewed}>
              Confirmar Revisão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
