import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Users, Send, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/services/api';

interface TenantMessage {
  id: string;
  title: string;
  subject: string;
  htmlContent: string;
  recipientFilter: string;
  specificTenantIds: string[];
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

export default function TenantMessageView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: message, isLoading } = useQuery({
    queryKey: ['tenant-message', id],
    queryFn: async () => {
      const response = await api.get(`/tenant-messages/${id}`);
      return response.data as TenantMessage;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'SCHEDULED':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Calendar className="h-3 w-3 mr-1" />
            Agendado
          </Badge>
        );
      case 'SENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Enviando...
          </Badge>
        );
      case 'SENT':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">Mensagem não encontrada</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin/tenant-messages')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{message.title}</h1>
            <p className="text-muted-foreground mt-1">Visualização da mensagem</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(message.status)}
          {(message.status === 'DRAFT' || message.status === 'SCHEDULED') && (
            <Button onClick={() => navigate(`/superadmin/tenant-messages/${id}/edit`)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Informações gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Destinatários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{getRecipientFilterLabel(message.recipientFilter)}</p>
            {message.specificTenantIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {message.specificTenantIds.length} tenant(s) específico(s)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Criado em
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {format(new Date(message.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">por {message.creator.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {message.status === 'SENT' ? 'Enviado em' : 'Agendado para'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message.sentAt ? (
              <p className="text-sm font-medium">
                {format(new Date(message.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            ) : message.scheduledFor ? (
              <p className="text-sm font-medium">
                {format(new Date(message.scheduledFor), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Não agendado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de envio (se já foi enviado) */}
      {message.status === 'SENT' && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Envio</CardTitle>
            <CardDescription>Estatísticas do envio desta mensagem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{message.sentCount}</p>
                  <p className="text-sm text-muted-foreground">Enviado com sucesso</p>
                </div>
              </div>

              {message.failedCount > 0 && (
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{message.failedCount}</p>
                    <p className="text-sm text-muted-foreground">Falhas no envio</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo do email */}
      <Card>
        <CardHeader>
          <CardTitle>Assunto do Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{message.subject}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do Email</CardTitle>
          <CardDescription>Preview do conteúdo HTML que será enviado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-white">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: message.htmlContent }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
