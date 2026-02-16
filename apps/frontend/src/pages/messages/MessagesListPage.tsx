import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Inbox, Search, Plus, Eye, Users, ArrowRight, Reply, ReplyAll, Archive, ArchiveRestore } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useInbox,
  useSent,
  useMessagesStats,
  useMarkMessagesAsRead,
  useArchiveMessage,
  useMessage,
  useUnarchiveMessage,
} from '@/hooks/useMessages';
import { MessageType, MessageStatus } from '@/api/messages.api';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageReadStatsDialog } from '@/components/messages/MessageReadStatsDialog';
import { Page, PageHeader, Section } from '@/design-system/components';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';

export default function MessagesListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [folderView, setFolderView] = useState<'active' | 'archived'>('active');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const { data: stats } = useMessagesStats();
  const {
    messages: inboxMessages,
    query: inboxQuery,
    setQuery: setInboxQuery,
    meta: inboxMeta,
  } = useInbox();
  const {
    messages: sentMessages,
    query: sentQuery,
    setQuery: setSentQuery,
    meta: sentMeta,
  } = useSent();
  const markAsReadMutation = useMarkMessagesAsRead();
  const archiveMessageMutation = useArchiveMessage();
  const unarchiveMessageMutation = useUnarchiveMessage();
  const { data: selectedMessage, isLoading: selectedMessageLoading } = useMessage(
    selectedMessageId || undefined,
    { markAsRead: false }
  );

  const handleSearch = () => {
    const archivedOnlyParam = folderView === 'archived' ? true : undefined;
    if (activeTab === 'inbox') {
      setInboxQuery({ ...inboxQuery, search: searchTerm, page: 1, archivedOnly: archivedOnlyParam });
    } else {
      setSentQuery({ ...sentQuery, search: searchTerm, page: 1, archivedOnly: archivedOnlyParam });
    }
    setSelectedMessageId(null);
  };

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate(undefined);
  };

  // Status para caixa de entrada (destinatário)
  const getInboxStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case MessageStatus.READ:
        return <Badge variant="secondary">Lida</Badge>;
      case MessageStatus.DELIVERED:
        return <Badge variant="outline">Arquivada</Badge>;
      case MessageStatus.SENT:
        return <Badge variant="outline">Recebida</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: MessageType) => {
    if (type === MessageType.BROADCAST) {
      return (
        <Badge variant="default" className="gap-1">
          <Users className="h-3 w-3" />
          Broadcast
        </Badge>
      );
    }
    return null;
  };

  const getConversationBadge = (
    threadId?: string,
    isReply?: boolean,
    conversationRepliesCount?: number,
  ) => {
    if (!threadId && !isReply && !conversationRepliesCount) return null;
    return <Badge variant="outline">Conversa</Badge>;
  };

  const currentMessages = activeTab === 'inbox' ? inboxMessages : sentMessages;
  const currentMeta = activeTab === 'inbox' ? inboxMeta : sentMeta;
  const currentQuery = activeTab === 'inbox' ? inboxQuery : sentQuery;
  const setCurrentQuery = activeTab === 'inbox' ? setInboxQuery : setSentQuery;
  const isArchivedView = folderView === 'archived';
  const isSelectedMessageSender = selectedMessage && user && selectedMessage.senderId === user.id;
  const selectedListMessage = currentMessages.find((m) => m.id === selectedMessageId);
  const canReplySelected = selectedMessage?.type === MessageType.DIRECT;

  const getReplySubject = (subject: string) => {
    return subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  };

  const getSelectedReplyToId = () => {
    if (!selectedMessage || !user) return undefined;
    if (selectedMessage.senderId !== user.id) return selectedMessage.senderId;
    return selectedMessage.recipients?.find((r) => r.userId !== user.id)?.userId;
  };

  const getSelectedReplyAllRecipientIds = () => {
    if (!selectedMessage || !user) return [];
    const allParticipants = new Set<string>();

    allParticipants.add(selectedMessage.senderId);
    selectedMessage.recipients?.forEach((recipient) => allParticipants.add(recipient.userId));
    allParticipants.delete(user.id);

    return Array.from(allParticipants);
  };

  const handleQuickReply = () => {
    if (!selectedMessage) return;
    const threadId = selectedMessage.threadId || selectedMessage.id;
    const replyToId = getSelectedReplyToId();

    const params = new URLSearchParams();
    params.set('threadId', threadId);
    params.set('subject', getReplySubject(selectedMessage.subject));
    if (replyToId) {
      params.set('replyTo', replyToId);
    }

    navigate(`/dashboard/mensagens/nova?${params.toString()}`);
  };

  const handleQuickReplyAll = () => {
    if (!selectedMessage) return;
    const threadId = selectedMessage.threadId || selectedMessage.id;
    const recipientIds = getSelectedReplyAllRecipientIds();

    const params = new URLSearchParams();
    params.set('threadId', threadId);
    params.set('subject', getReplySubject(selectedMessage.subject));
    if (recipientIds.length > 0) {
      params.set('recipientIds', recipientIds.join(','));
    }

    navigate(`/dashboard/mensagens/nova?${params.toString()}`);
  };

  const handleSelectedArchiveToggle = () => {
    if (!selectedMessageId) return;
    if (isArchivedView) {
      unarchiveMessageMutation.mutate(selectedMessageId);
    } else {
      archiveMessageMutation.mutate(selectedMessageId);
      setSelectedMessageId(null);
    }
  };

  // Marcar como lida após 5s de visualização contínua no painel desktop
  useEffect(() => {
    if (activeTab !== 'inbox' || !selectedMessageId) return;
    if (
      !selectedListMessage ||
      selectedListMessage.recipientStatus === MessageStatus.READ ||
      selectedListMessage.recipientStatus === MessageStatus.DELIVERED
    ) return;

    const timer = setTimeout(() => {
      markAsReadMutation.mutate([selectedMessageId]);
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    selectedMessageId,
    selectedListMessage,
    markAsReadMutation,
  ]);

  useEffect(() => {
    const archivedOnly = folderView === 'archived';
    setSelectedMessageId(null);

    if (activeTab === 'inbox') {
      setInboxQuery((prev) => ({ ...prev, archivedOnly: archivedOnly ? true : undefined, page: 1 }));
    } else {
      setSentQuery((prev) => ({ ...prev, archivedOnly: archivedOnly ? true : undefined, page: 1 }));
    }
  }, [activeTab, folderView, setInboxQuery, setSentQuery]);

  const handleMessageClick = (messageId: string) => {
    if (window.innerWidth >= 1024) {
      setSelectedMessageId(messageId);
      return;
    }
    navigate(`/dashboard/mensagens/${messageId}`);
  };

  return (
    <Page>
      <PageHeader
        title="Mensagens"
        subtitle="Gerencie sua comunicação interna"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mensagens' },
        ]}
        actions={
          <div className="flex gap-2">
            {activeTab === 'inbox' && !isArchivedView && stats && stats.unread > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Eye className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
            <Button onClick={() => navigate('/dashboard/mensagens/nova')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Mensagem
            </Button>
          </div>
        }
      />

      {/* Resumo */}
      {stats && (
        <Section title="Visão Geral">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Não lidas</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-semibold">{stats.unread}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
                <Inbox className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-semibold">{stats.received}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-semibold">{stats.sent}</div>
              </CardContent>
            </Card>
          </div>
        </Section>
      )}

      {/* Caixa de mensagens */}
      <Section title="Caixa de Mensagens">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex">
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('inbox');
                    setSelectedMessageId(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === 'inbox'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Caixa de Entrada
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('sent');
                    setSelectedMessageId(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                    activeTab === 'sent'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Enviadas
                </button>
              </div>
              </div>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFolderView('active')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    folderView === 'active'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Ativas
                </button>
                <button
                  type="button"
                  onClick={() => setFolderView('archived')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                    folderView === 'archived'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  Arquivadas
                </button>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="relative w-[280px]">
                  <Input
                    placeholder="Buscar mensagens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {activeTab === 'inbox' ? 'Mensagens recebidas' : 'Mensagens enviadas'} {isArchivedView ? 'arquivadas' : 'ativas'}
                  </p>
                  {currentMeta && (
                    <p className="text-xs text-muted-foreground">{currentMeta.total} total</p>
                  )}
                </div>
                <ScrollArea className="h-[56vh] lg:h-[62vh]">
                  {currentMessages.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      Nenhuma mensagem encontrada.
                    </div>
                  )}
                  <div className="divide-y">
                    {currentMessages.map((message) => (
                      <button
                        key={message.id}
                        className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                          selectedMessageId === message.id ? 'bg-accent' : ''
                        } ${
                          activeTab === 'inbox' && message.recipientStatus !== MessageStatus.READ
                            ? 'font-medium'
                            : ''
                        }`}
                        onClick={() => handleMessageClick(message.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {activeTab === 'inbox' && !isArchivedView && message.recipientStatus !== MessageStatus.READ ? (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            ) : (
                              <div className="w-2 h-2 bg-muted rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm truncate">
                                {activeTab === 'inbox'
                                  ? message.sender.name
                                  : message.type === MessageType.BROADCAST
                                    ? 'Todos os usuários'
                                    : message.recipients?.map((r) => r.user.name).join(', ')}
                              </p>
                              <p className="text-xs text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(message.createdAt), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                            <p className="text-sm truncate">{message.subject}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {message.body}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getTypeBadge(message.type)}
                              {getConversationBadge(
                                message.threadId,
                                message.isReply,
                                message.conversationRepliesCount,
                              )}
                              {activeTab === 'inbox' && message.recipientStatus && !isArchivedView && (
                                getInboxStatusBadge(message.recipientStatus)
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground lg:hidden" />
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                {currentMeta && currentMeta.totalPages > 1 && (
                  <div className="p-3 border-t flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Página {currentMeta.page} de {currentMeta.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentMeta.page === 1}
                        onClick={() => setCurrentQuery({ ...currentQuery, page: currentQuery.page! - 1 })}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentMeta.page === currentMeta.totalPages}
                        onClick={() => setCurrentQuery({ ...currentQuery, page: currentQuery.page! + 1 })}
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden lg:block border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/40">
                  <p className="text-sm font-medium">Leitura</p>
                </div>
                {!selectedMessageId && (
                  <div className="h-[62vh] flex items-center justify-center text-sm text-muted-foreground">
                    Selecione uma mensagem para visualizar
                  </div>
                )}
                {selectedMessageId && selectedMessageLoading && (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                )}
                {selectedMessage && !selectedMessageLoading && (
                  <div className="h-[62vh] flex flex-col">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                          <CardDescription className="mt-1">
                            {format(new Date(selectedMessage.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(selectedMessage.type)}
                          {getConversationBadge(
                            selectedMessage.threadId,
                            selectedMessage.isReply,
                            selectedMessage.conversationRepliesCount,
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-3">
                        <span className="text-muted-foreground">De:</span> {selectedMessage.sender.name}
                      </p>
                      {selectedMessage.recipients && selectedMessage.recipients.length > 0 && (
                        <p className="text-sm mt-1 truncate">
                          <span className="text-muted-foreground">Para:</span>{' '}
                          {selectedMessage.type === MessageType.BROADCAST
                            ? 'Todos os usuários do tenant'
                            : selectedMessage.recipients.map((r) => r.user.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <Separator />
                    <ScrollArea className="flex-1 p-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
                    </ScrollArea>
                    <Separator />
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="flex gap-2 flex-wrap">
                        {canReplySelected && (
                          <Button onClick={handleQuickReply}>
                            <Reply className="h-4 w-4 mr-2" />
                            Responder
                          </Button>
                        )}
                        {canReplySelected && getSelectedReplyAllRecipientIds().length > 1 && (
                          <Button variant="secondary" onClick={handleQuickReplyAll}>
                            <ReplyAll className="h-4 w-4 mr-2" />
                            Responder a todos
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/dashboard/mensagens/${selectedMessage.id}`)}
                        >
                          Abrir detalhes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSelectedArchiveToggle}
                          disabled={archiveMessageMutation.isPending || unarchiveMessageMutation.isPending}
                        >
                          {isArchivedView ? (
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
                      <div className="flex gap-2">
                        {isSelectedMessageSender && selectedMessage.type === MessageType.BROADCAST && (
                          <MessageReadStatsDialog messageId={selectedMessage.id} />
                        )}
                        {isSelectedMessageSender &&
                          selectedMessage.type === MessageType.DIRECT &&
                          selectedMessage.recipients &&
                          selectedMessage.recipients.length > 1 && (
                            <MessageReadStatsDialog messageId={selectedMessage.id} />
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </Page>
  );
}
