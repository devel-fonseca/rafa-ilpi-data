import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Users, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhotoViewer } from '@/components/form/PhotoViewer';
import {
  useInbox,
  useUnreadMessagesCount,
  useMarkMessagesAsRead,
} from '@/hooks/useMessages';
import { MessageType } from '@/api/messages.api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MessagesDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCountData } = useUnreadMessagesCount();
  const { messages, isLoading } = useInbox({
    unreadOnly: true,
    limit: 10,
  });
  const markAsReadMutation = useMarkMessagesAsRead();

  const unreadCount = unreadCountData?.count || 0;

  const handleMessageClick = (messageId: string) => {
    setIsOpen(false);
    navigate(`/dashboard/mensagens/${messageId}`);
  };

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate(undefined);
  };

  const getTypeIcon = (type: MessageType) => {
    return type === MessageType.BROADCAST ? (
      <Users className="h-3 w-3" />
    ) : (
      <Mail className="h-3 w-3" />
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Mail className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[420px]">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <h3 className="font-semibold">Mensagens</h3>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary">
              {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[calc(100vh-200px)] min-h-[300px]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma mensagem não lida
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => handleMessageClick(message.id)}
                  className="w-full px-4 py-3 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <PhotoViewer
                        photoUrl={message.sender.profile?.profilePhoto || undefined}
                        altText={message.sender.name}
                        size="xs"
                        rounded={true}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {message.sender.name}
                        </p>
                        {message.type === MessageType.BROADCAST && (
                          <Badge variant="outline" className="h-5 gap-1">
                            {getTypeIcon(message.type)}
                            <span className="text-xs">Broadcast</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {message.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {message.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    {message.recipientStatus !== 'READ' && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />

        <div className="p-2 space-y-1">
          {unreadCount > 0 && (
            <DropdownMenuItem
              onClick={handleMarkAllAsRead}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              navigate('/dashboard/mensagens/nova');
            }}
            className="cursor-pointer"
          >
            <Send className="mr-2 h-4 w-4" />
            Nova mensagem
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              navigate('/dashboard/mensagens');
            }}
            className="cursor-pointer font-medium"
          >
            <Mail className="mr-2 h-4 w-4" />
            Ver todas as mensagens
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
