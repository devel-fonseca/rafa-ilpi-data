import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Mail, Send, Users, X } from 'lucide-react';
import { Page, PageHeader } from '@/design-system/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { MessageType } from '@/api/messages.api';
import { useSendMessage } from '@/hooks/useMessages';
import { PermissionType, usePermissions } from '@/hooks/usePermissions';
import { useUsers } from '@/hooks/queries/useUsers';

const messageSchema = z.object({
  type: z.nativeEnum(MessageType),
  recipientIds: z.array(z.string()).optional(),
  subject: z
    .string()
    .min(3, 'Assunto deve ter no mínimo 3 caracteres')
    .max(255, 'Assunto deve ter no máximo 255 caracteres'),
  body: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres'),
  threadId: z.string().uuid().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;
type UserOption = { id: string; name: string; email: string };

export default function ComposeMessagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const threadIdParam = searchParams.get('threadId');
  const replyToParam = searchParams.get('replyTo');
  const recipientIdsParam = searchParams.get('recipientIds');
  const subjectParam = searchParams.get('subject');
  const isReplyMode = !!threadIdParam;
  const isReplyAllMode = !!recipientIdsParam;

  const sendMessageMutation = useSendMessage();
  const canBroadcast = hasPermission(PermissionType.BROADCAST_MESSAGES);
  const { data: usersData, isLoading: isLoadingUsers } = useUsers();
  const users: UserOption[] = useMemo(
    () => (Array.isArray(usersData) ? (usersData as UserOption[]) : []),
    [usersData],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      type: MessageType.DIRECT,
      recipientIds: [],
      subject: subjectParam || '',
      body: '',
      threadId: threadIdParam || undefined,
    },
  });

  useEffect(() => {
    const preselected = new Set<string>();

    if (recipientIdsParam) {
      recipientIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .forEach((id) => preselected.add(id));
    }

    if (replyToParam) {
      preselected.add(replyToParam);
    }

    if (preselected.size > 0) {
      setSelectedRecipients(preselected);
    }
  }, [recipientIdsParam, replyToParam]);

  const selectedType = watch('type');
  const selectedUsers = useMemo(
    () => users.filter((user) => selectedRecipients.has(user.id)),
    [users, selectedRecipients],
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [users, searchTerm],
  );

  const toggleRecipient = (userId: string) => {
    const next = new Set(selectedRecipients);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedRecipients(next);
  };

  const onSubmit = (data: MessageFormData) => {
    const payload = {
      ...data,
      recipientIds:
        selectedType === MessageType.DIRECT ? Array.from(selectedRecipients) : undefined,
      threadId: threadIdParam || undefined,
    };

    sendMessageMutation.mutate(payload, {
      onSuccess: () => navigate('/dashboard/mensagens'),
    });
  };

  return (
    <Page maxWidth="full">
      <PageHeader
        title={isReplyMode ? 'Responder Mensagem' : 'Nova Mensagem'}
        subtitle={
          isReplyAllMode
            ? 'Resposta para todos os participantes da conversa'
            : isReplyMode
              ? 'Resposta em uma conversa existente'
              : 'Componha uma mensagem interna'
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mensagens', href: '/dashboard/mensagens' },
          { label: isReplyMode ? 'Responder' : 'Nova Mensagem' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-24 md:pb-0">
        {(isReplyMode || isReplyAllMode) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isReplyAllMode
                ? 'Modo resposta para todos ativo. Revise os destinatários antes de enviar.'
                : 'Modo resposta ativo. O assunto e a thread já foram vinculados.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:items-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Composição</CardTitle>
              <CardDescription>Preencha os campos e envie.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={selectedType === MessageType.DIRECT ? 'default' : 'outline'}
                  onClick={() => setValue('type', MessageType.DIRECT)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Direta
                </Button>
                {canBroadcast && (
                  <Button
                    type="button"
                    variant={selectedType === MessageType.BROADCAST ? 'default' : 'outline'}
                    onClick={() => setValue('type', MessageType.BROADCAST)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Broadcast
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Para</Label>
                {selectedType === MessageType.BROADCAST ? (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    Todos os usuários do tenant
                  </div>
                ) : (
                  <div className="min-h-11 rounded-md border px-3 py-2">
                    {selectedUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Selecione destinatários no painel à direita</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((user) => (
                          <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
                            {user.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => toggleRecipient(user.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {selectedType === MessageType.DIRECT && selectedRecipients.size === 0 && (
                  <p className="text-sm text-destructive">Selecione pelo menos um destinatário</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  {...register('subject')}
                  maxLength={255}
                  placeholder="Ex: Mudança de plantão"
                />
                {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Mensagem</Label>
                <Textarea
                  id="body"
                  {...register('body')}
                  rows={12}
                  className="resize-none"
                  placeholder="Digite sua mensagem..."
                />
                {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
              </div>

              <Separator />
              <div className="hidden md:flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    sendMessageMutation.isPending ||
                    (selectedType === MessageType.DIRECT && selectedRecipients.size === 0)
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/mensagens')}
                  disabled={sendMessageMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedType === MessageType.DIRECT && (
            <Card className="h-[500px] overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>Destinatários</CardTitle>
                <CardDescription>{selectedRecipients.size} selecionado(s)</CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-73px)] flex flex-col gap-3">
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-shrink-0"
                />

                {isLoadingUsers ? (
                  <div className="text-sm text-muted-foreground text-center py-6">Carregando usuários...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado</div>
                ) : (
                  <ScrollArea className="flex-1 rounded-md border">
                    <div className="p-2 space-y-1">
                      {filteredUsers.map((user) => {
                        const selected = selectedRecipients.has(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleRecipient(user.id)}
                            className={`w-full text-left rounded-md px-3 py-2 transition-colors ${
                              selected ? 'bg-primary/10 border border-primary' : 'hover:bg-accent'
                            }`}
                          >
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Barra sticky no mobile para reduzir scroll até as ações */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-7xl px-4 py-3 flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={
                sendMessageMutation.isPending ||
                (selectedType === MessageType.DIRECT && selectedRecipients.size === 0)
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/dashboard/mensagens')}
              disabled={sendMessageMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </Page>
  );
}
