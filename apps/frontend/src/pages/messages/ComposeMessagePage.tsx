import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Send, Users, Mail, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Page, PageHeader, Section } from '@/design-system/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSendMessage } from '@/hooks/useMessages';
import { MessageType } from '@/api/messages.api';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';
import { useUsers } from '@/hooks/queries/useUsers';

const messageSchema = z.object({
  type: z.nativeEnum(MessageType),
  recipientIds: z.array(z.string()).optional(),
  subject: z.string().min(3, 'Assunto deve ter no mínimo 3 caracteres').max(255, 'Assunto deve ter no máximo 255 caracteres'),
  body: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres'),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function ComposeMessagePage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const sendMessageMutation = useSendMessage();
  const canBroadcast = hasPermission(PermissionType.BROADCAST_MESSAGES);
  const { data: usersData, isLoading: isLoadingUsers } = useUsers();

  // Backend retorna array diretamente, não { data: [...] }
  const users = usersData || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      type: MessageType.DIRECT,
      recipientIds: [],
      subject: '',
      body: '',
    },
  });

  const selectedType = watch('type');

  const onSubmit = (data: MessageFormData) => {
    const payload = {
      ...data,
      recipientIds: selectedType === MessageType.DIRECT
        ? Array.from(selectedRecipients)
        : undefined,
    };

    sendMessageMutation.mutate(payload, {
      onSuccess: () => {
        navigate('/dashboard/mensagens');
      },
    });
  };

  const toggleRecipient = (userId: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedRecipients(newSelected);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUsers = users.filter(u => selectedRecipients.has(u.id));

  return (
    <Page>
      <PageHeader
        title="Nova Mensagem"
        subtitle="Envie mensagens para usuários do seu tenant"
        onBack={() => navigate('/dashboard/mensagens')}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Section title="Tipo de Mensagem">
          <Card>
            <CardContent className="pt-6">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={MessageType.DIRECT} id="direct" />
                    <div className="flex-1 space-y-1 cursor-pointer" onClick={() => field.onChange(MessageType.DIRECT)}>
                      <Label htmlFor="direct" className="font-medium cursor-pointer flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Mensagem Direta
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Envie para um ou mais usuários específicos
                      </p>
                    </div>
                  </div>

                  {canBroadcast && (
                    <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={MessageType.BROADCAST} id="broadcast" />
                      <div className="flex-1 space-y-1 cursor-pointer" onClick={() => field.onChange(MessageType.BROADCAST)}>
                        <Label htmlFor="broadcast" className="font-medium cursor-pointer flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Broadcast
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Envie para todos os usuários do tenant
                        </p>
                      </div>
                    </div>
                  )}
                </RadioGroup>
              )}
            />
            </CardContent>
          </Card>
        </Section>

        {/* Destinatários (apenas para DIRECT) */}
        {selectedType === MessageType.DIRECT && (
          <Section title="Destinatários">
            <Card>
              <CardContent className="pt-6 space-y-4">
              {/* Buscar usuários */}
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Usuários selecionados */}
              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selecionados ({selectedUsers.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
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
                </div>
              )}

              <Separator />

              {/* Lista de usuários */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Usuários disponíveis</Label>
                {isLoadingUsers ? (
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    Carregando usuários...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] rounded-md border">
                    <div className="p-4 space-y-1">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleRecipient(user.id)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors ${
                            selectedRecipients.has(user.id) ? 'bg-primary/10 border border-primary' : ''
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedRecipients.has(user.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            }`}>
                              {selectedRecipients.has(user.id) && (
                                <svg
                                  className="w-3 h-3 text-primary-foreground"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {selectedType === MessageType.DIRECT && selectedRecipients.size === 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Selecione pelo menos um destinatário
                  </AlertDescription>
                </Alert>
              )}
              </CardContent>
            </Card>
          </Section>
        )}

        <Section title="Conteúdo da Mensagem">
          <Card>
            <CardContent className="pt-6 space-y-4">
            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                {...register('subject')}
                placeholder="Ex: Reunião de equipe - Mudanças no protocolo"
                maxLength={255}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            {/* Corpo */}
            <div className="space-y-2">
              <Label htmlFor="body">Mensagem *</Label>
              <Textarea
                id="body"
                {...register('body')}
                placeholder="Digite sua mensagem aqui...

Dicas:
• Seja claro e objetivo
• Use parágrafos curtos
• Destaque informações importantes"
                rows={12}
                className="resize-none"
              />
              {errors.body && (
                <p className="text-sm text-destructive">{errors.body.message}</p>
              )}
            </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Ações">
          <Card>
            <CardContent className="pt-6">
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={
                  sendMessageMutation.isPending ||
                  (selectedType === MessageType.DIRECT && selectedRecipients.size === 0)
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar Mensagem'}
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
        </Section>
      </form>
    </Page>
  );
}
