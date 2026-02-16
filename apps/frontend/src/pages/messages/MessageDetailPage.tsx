import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Reply, ReplyAll, MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoViewer } from '@/components/form/PhotoViewer';
import { useArchiveMessage, useMarkMessagesAsRead, useMessage, useThread, useUnarchiveMessage } from '@/hooks/useMessages';
import { MessageStatus, MessageType } from '@/api/messages.api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageReadStatsDialog } from '@/components/messages/MessageReadStatsDialog';
import { useAuthStore } from '@/stores/auth.store';
import { Page, PageHeader, Section } from '@/design-system/components';

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: message, isLoading, isError } = useMessage(id, { markAsRead: false });
  const markAsReadMutation = useMarkMessagesAsRead();
  const archiveMessageMutation = useArchiveMessage();
  const unarchiveMessageMutation = useUnarchiveMessage();

  const conversationId = message ? (message.threadId || message.id) : undefined;
  const { data: threadData } = useThread(conversationId);

  // Verificar se o usuário é o remetente da mensagem
  const isSender = message && user && message.senderId === user.id;
  const canReply = message?.type === MessageType.DIRECT;
  const myRecipientStatus = message?.recipients?.find((r) => r.userId === user?.id)?.status;
  const isArchivedForRecipient = myRecipientStatus === MessageStatus.DELIVERED;
  const isArchivedForSender = !myRecipientStatus && !!(message?.metadata as { archivedBySenderIds?: string[] } | undefined)?.archivedBySenderIds?.includes(user?.id || '');
  const isArchived = isArchivedForRecipient || isArchivedForSender;

  const getReplySubject = (subject: string) => {
    return subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  };

  const getReplyToId = () => {
    if (!message || !user) return undefined;
    if (message.senderId !== user.id) return message.senderId;
    return message.recipients?.find((r) => r.userId !== user.id)?.userId;
  };

  const getReplyAllRecipientIds = () => {
    if (!message || !user) return [];
    const allParticipants = new Set<string>();

    allParticipants.add(message.senderId);
    message.recipients?.forEach((recipient) => allParticipants.add(recipient.userId));
    allParticipants.delete(user.id);

    return Array.from(allParticipants);
  };

  const handleReply = () => {
    if (!message) return;
    const threadId = message.threadId || message.id;
    const replyToId = getReplyToId();

    const params = new URLSearchParams();
    params.set('threadId', threadId);
    params.set('subject', getReplySubject(message.subject));
    if (replyToId) {
      params.set('replyTo', replyToId);
    }

    navigate(`/dashboard/mensagens/nova?${params.toString()}`);
  };

  const handleReplyAll = () => {
    if (!message) return;
    const threadId = message.threadId || message.id;
    const recipientIds = getReplyAllRecipientIds();

    const params = new URLSearchParams();
    params.set('threadId', threadId);
    params.set('subject', getReplySubject(message.subject));
    if (recipientIds.length > 0) {
      params.set('recipientIds', recipientIds.join(','));
    }

    navigate(`/dashboard/mensagens/nova?${params.toString()}`);
  };

  const handleArchiveToggle = () => {
    if (!id) return;
    if (isArchived) {
      unarchiveMessageMutation.mutate(id);
      return;
    }
    archiveMessageMutation.mutate(id);
  };

  // Marcar como lida após 5s de visualização contínua na tela de detalhe
  useEffect(() => {
    if (!id || !message || !user) return;
    if (message.senderId === user.id) return;
    if (myRecipientStatus === MessageStatus.READ || myRecipientStatus === MessageStatus.DELIVERED) return;

    const timer = setTimeout(() => {
      markAsReadMutation.mutate([id]);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, message, user, myRecipientStatus, markAsReadMutation]);

  if (isLoading) {
    return (
      <Page>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  if (isError || !message) {
    return (
      <Page>
        <PageHeader
          title="Mensagem não encontrada"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mensagens', href: '/dashboard/mensagens' },
            { label: 'Não encontrada' },
          ]}
          backButton={{ onClick: () => navigate('/dashboard/mensagens') }}
        />
        <Section>
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar a mensagem. Ela pode ter sido removida ou
              você não tem permissão para visualizá-la.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate('/dashboard/mensagens')}>
              Voltar para Mensagens
            </Button>
          </div>
        </Section>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={message.subject}
        subtitle={format(new Date(message.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
          locale: ptBR,
        })}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mensagens', href: '/dashboard/mensagens' },
          { label: message.subject },
        ]}
        backButton={{ onClick: () => navigate('/dashboard/mensagens') }}
        actions={
          message.type === MessageType.BROADCAST ? (
            <Badge variant="default" className="gap-1">
              <Users className="h-3 w-3" />
              Broadcast
            </Badge>
          ) : undefined
        }
      />

      <Section title="Detalhes">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <PhotoViewer
                  photoUrl={message.sender.profile?.profilePhoto || undefined}
                  altText={message.sender.name}
                  size="sm"
                  rounded={true}
                />
                <div>
                  <CardTitle className="text-lg">{message.sender.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {message.sender.email}
                  </p>
                  {message.type === MessageType.BROADCAST ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Para: Todos os usuários do tenant
                    </p>
                  ) : (
                    message.recipients && message.recipients.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Para: {message.recipients.map((r) => r.user.name).join(', ')}
                      </p>
                    )
                  )}
                  {conversationId && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Conversa: {conversationId === message.id ? 'mensagem original' : 'resposta'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSender && message.type === MessageType.BROADCAST && (
                  <MessageReadStatsDialog messageId={message.id} />
                )}
                {isSender && message.type === MessageType.DIRECT && message.recipients && message.recipients.length > 1 && (
                  <MessageReadStatsDialog messageId={message.id} />
                )}
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{message.body}</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Seção de Thread - exibir se a mensagem faz parte de uma conversa */}
      {threadData && threadData.replies && threadData.replies.length > 0 && (
        <Section title={`Conversa (${threadData.replies.length + 1} mensagens)`}>
          <div className="space-y-3">
            {/* Mensagem Original */}
            <Card className={message.id === threadData.original.id ? 'ring-2 ring-primary' : 'opacity-75'}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <PhotoViewer
                    photoUrl={threadData.original.sender.profile?.profilePhoto || undefined}
                    altText={threadData.original.sender.name}
                    size="xs"
                    rounded={true}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{threadData.original.sender.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(threadData.original.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {message.id === threadData.original.id && (
                    <Badge variant="outline" className="text-xs">Atual</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{threadData.original.body}</p>
                {message.id !== threadData.original.id && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1"
                    onClick={() => navigate(`/dashboard/mensagens/${threadData.original.id}`)}
                  >
                    Ver mensagem original
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Respostas */}
            {threadData.replies.map((reply) => (
              <Card
                key={reply.id}
                className={message.id === reply.id ? 'ring-2 ring-primary' : 'opacity-75'}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <PhotoViewer
                      photoUrl={reply.sender.profile?.profilePhoto || undefined}
                      altText={reply.sender.name}
                      size="xs"
                      rounded={true}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{reply.sender.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reply.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {message.id === reply.id && (
                      <Badge variant="outline" className="text-xs">Atual</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                  {message.id !== reply.id && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto mt-1"
                      onClick={() => navigate(`/dashboard/mensagens/${reply.id}`)}
                    >
                      Ver esta resposta
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Indicador de que esta mensagem é uma resposta (quando não há thread carregada) */}
      {message.isReply && message.threadId && !threadData && (
        <Section title="Conversa">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Esta mensagem é uma resposta a outra mensagem.</span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => navigate(`/dashboard/mensagens/${message.threadId}`)}
                >
                  Ver mensagem original
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>
      )}

      <Section title="Ações">
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard/mensagens')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {canReply && (
            <Button variant="default" onClick={handleReply}>
              <Reply className="h-4 w-4 mr-2" />
              Responder
            </Button>
          )}

          {canReply && getReplyAllRecipientIds().length > 1 && (
            <Button variant="secondary" onClick={handleReplyAll}>
              <ReplyAll className="h-4 w-4 mr-2" />
              Responder a todos
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleArchiveToggle}
            disabled={archiveMessageMutation.isPending || unarchiveMessageMutation.isPending}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Desarquivar
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </>
            )}
          </Button>
        </div>
      </Section>
    </Page>
  );
}
