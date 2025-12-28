import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Inbox, Search, Plus, Eye, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useInbox,
  useSent,
  useMessagesStats,
  useMarkMessagesAsRead,
} from '@/hooks/useMessages';
import { MessageType, MessageStatus } from '@/api/messages.api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MessagesListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');

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

  const handleSearch = () => {
    if (activeTab === 'inbox') {
      setInboxQuery({ ...inboxQuery, search: searchTerm, page: 1 });
    } else {
      setSentQuery({ ...sentQuery, search: searchTerm, page: 1 });
    }
  };

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate(undefined);
  };

  const getStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case MessageStatus.READ:
        return <Badge variant="secondary">Lida</Badge>;
      case MessageStatus.DELIVERED:
        return <Badge variant="outline">Entregue</Badge>;
      case MessageStatus.SENT:
        return <Badge variant="outline">Enviada</Badge>;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Mensagens</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua comunicação interna
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/mensagens/nova')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Mensagem
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unread}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Mensagens aguardando leitura
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.received}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de mensagens recebidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de mensagens enviadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar em assunto e mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            {activeTab === 'inbox' && stats && stats.unread > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Eye className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Inbox vs Sent */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inbox">
                <Inbox className="h-4 w-4 mr-2" />
                Caixa de Entrada
              </TabsTrigger>
              <TabsTrigger value="sent">
                <Send className="h-4 w-4 mr-2" />
                Enviadas
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="inbox">
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboxMessages.map((message) => (
                  <TableRow
                    key={message.id}
                    className={`cursor-pointer ${
                      message.recipientStatus !== MessageStatus.READ
                        ? 'bg-blue-50 dark:bg-blue-950/20 font-medium'
                        : ''
                    }`}
                    onClick={() => navigate(`/dashboard/mensagens/${message.id}`)}
                  >
                    <TableCell>
                      {message.recipientStatus !== MessageStatus.READ && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </TableCell>
                    <TableCell>{message.sender.name}</TableCell>
                    <TableCell>{message.subject}</TableCell>
                    <TableCell>{getTypeBadge(message.type)}</TableCell>
                    <TableCell>
                      {getStatusBadge(message.recipientStatus!)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

              {/* Pagination */}
              {inboxMeta && inboxMeta.totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {inboxMeta.page} de {inboxMeta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setInboxQuery({ ...inboxQuery, page: inboxQuery.page! - 1 })
                      }
                      disabled={inboxMeta.page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setInboxQuery({ ...inboxQuery, page: inboxQuery.page! + 1 })
                      }
                      disabled={inboxMeta.page === inboxMeta.totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="sent">
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentMessages.map((message) => (
                  <TableRow
                    key={message.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/dashboard/mensagens/${message.id}`)}
                  >
                    <TableCell></TableCell>
                    <TableCell>
                      {message.type === MessageType.BROADCAST
                        ? 'Todos os usuários'
                        : message.recipients
                            ?.map((r) => r.user.name)
                            .join(', ')}
                    </TableCell>
                    <TableCell>{message.subject}</TableCell>
                    <TableCell>{getTypeBadge(message.type)}</TableCell>
                    <TableCell>
                      {format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

              {/* Pagination */}
              {sentMeta && sentMeta.totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {sentMeta.page} de {sentMeta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSentQuery({ ...sentQuery, page: sentQuery.page! - 1 })
                      }
                      disabled={sentMeta.page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSentQuery({ ...sentQuery, page: sentQuery.page! + 1 })
                      }
                      disabled={sentMeta.page === sentMeta.totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
