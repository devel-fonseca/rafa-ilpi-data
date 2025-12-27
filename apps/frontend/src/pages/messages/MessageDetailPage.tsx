import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMessage } from '@/hooks/useMessages';
import { MessageType } from '@/api/messages.api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: message, isLoading, isError } = useMessage(id);

  if (isLoading) {
    return (
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
    );
  }

  if (isError || !message) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/mensagens')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Mensagem não encontrada</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar a mensagem. Ela pode ter sido removida ou
            você não tem permissão para visualizá-la.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/mensagens')}>
          Voltar para Mensagens
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/mensagens')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{message.subject}</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(message.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </p>
        </div>
        {message.type === MessageType.BROADCAST && (
          <Badge variant="default" className="gap-1">
            <Users className="h-3 w-3" />
            Broadcast
          </Badge>
        )}
      </div>

      {/* Detalhes da mensagem */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {message.sender.profile?.profilePhoto ? (
                <img
                  src={message.sender.profile.profilePhoto}
                  alt={message.sender.name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {message.sender.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{message.sender.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {message.sender.email}
                </p>
                {message.type === MessageType.BROADCAST && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Para: Todos os usuários do tenant
                  </p>
                )}
                {message.recipients && message.recipients.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Para: {message.recipients.map((r) => r.user.name).join(', ')}
                  </p>
                )}
              </div>
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

      {/* Ações */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate('/mensagens')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
