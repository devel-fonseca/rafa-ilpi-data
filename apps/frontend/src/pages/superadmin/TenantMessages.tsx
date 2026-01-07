import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquare,
  Plus,
  Send,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/services/api';

interface TenantMessage {
  id: string;
  title: string;
  subject: string;
  recipientFilter: string;
  scheduledFor: string | null;
  sentAt: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT';
  sentCount: number;
  failedCount: number;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

export default function TenantMessages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sendId, setSendId] = useState<string | null>(null);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['tenant-messages'],
    queryFn: async () => {
      const response = await api.get('/tenant-messages');
      return response.data as { messages: TenantMessage[]; total: number };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tenant-messages/${id}`);
    },
    onSuccess: () => {
      toast.success('Mensagem deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tenant-messages'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar mensagem');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/tenant-messages/${id}/send`);
    },
    onSuccess: () => {
      toast.success('Mensagem enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tenant-messages'] });
      setSendId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao enviar mensagem');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'SCHEDULED':
        return (
          <Badge className="bg-primary/10 text-primary/90 hover:bg-primary/10">
            <Calendar className="h-3 w-3 mr-1" />
            Agendado
          </Badge>
        );
      case 'SENDING':
        return (
          <Badge className="bg-warning/10 text-warning/90 hover:bg-warning/10">
            Enviando...
          </Badge>
        );
      case 'SENT':
        return (
          <Badge className="bg-success/10 text-success/90 hover:bg-success/10">
            <Send className="h-3 w-3 mr-1" />
            Enviado
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRecipientFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      ALL_TENANTS: 'Todos os tenants',
      ACTIVE_ONLY: 'Apenas ativos',
      TRIAL_ONLY: 'Apenas trial',
      OVERDUE_ONLY: 'Apenas inadimplentes',
      SPECIFIC_TENANTS: 'Tenants específicos',
    };
    return labels[filter] || filter;
  };

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Mensagens para Tenants
            </h1>
            <p className="text-muted-foreground mt-1">
              Envie novidades, atualizações e comunicados para os tenants
            </p>
          </div>
          <Button onClick={() => navigate('/superadmin/tenant-messages/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Mensagem
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messagesData?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rascunhos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {messagesData?.messages.filter((m) => m.status === 'DRAFT').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Agendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {messagesData?.messages.filter((m) => m.status === 'SCHEDULED').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">
                Enviadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {messagesData?.messages.filter((m) => m.status === 'SENT').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : messagesData && messagesData.messages.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Destinatários</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agendado para</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messagesData.messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{message.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {message.subject}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {getRecipientFilterLabel(message.recipientFilter)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell>
                          {message.scheduledFor ? (
                            <div className="text-sm">
                              {format(new Date(message.scheduledFor), 'dd/MM/yyyy HH:mm', {
                                locale: ptBR,
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {message.sentAt ? (
                            <div className="text-sm">
                              {format(new Date(message.sentAt), 'dd/MM/yyyy HH:mm', {
                                locale: ptBR,
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {message.status === 'SENT' ? (
                            <div className="text-sm space-y-1">
                              <div className="text-success">
                                ✓ {message.sentCount} enviado{message.sentCount !== 1 && 's'}
                              </div>
                              {message.failedCount > 0 && (
                                <div className="text-danger">
                                  ✗ {message.failedCount} falha{message.failedCount !== 1 && 's'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/superadmin/tenant-messages/${message.id}`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>

                              {(message.status === 'DRAFT' || message.status === 'SCHEDULED') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(`/superadmin/tenant-messages/${message.id}/edit`)
                                    }
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => setSendId(message.id)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar Agora
                                  </DropdownMenuItem>
                                </>
                              )}

                              {message.status === 'DRAFT' && (
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(message.id)}
                                  className="text-danger"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Deletar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma mensagem criada ainda
                </p>
                <Button onClick={() => navigate('/superadmin/tenant-messages/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira mensagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-danger/60 hover:bg-danger/70"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de envio */}
      <AlertDialog open={!!sendId} onOpenChange={() => setSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar mensagem agora?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem será enviada imediatamente para todos os destinatários selecionados.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendId && sendMutation.mutate(sendId)}
              className="bg-success/60 hover:bg-success/70"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
