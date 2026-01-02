import { useState } from 'react';
import { Eye, Users, CheckCircle2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhotoViewer } from '@/components/form/PhotoViewer';
import { useMessageReadStats } from '@/hooks/useMessages';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { POSITION_CODE_LABELS } from '@/types/permissions';

interface MessageReadStatsDialogProps {
  messageId: string;
  trigger?: React.ReactNode;
}

export function MessageReadStatsDialog({ messageId, trigger }: MessageReadStatsDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: stats, isLoading } = useMessageReadStats(open ? messageId : undefined);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <Eye className="h-4 w-4" />
      Ver quem leu
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estatísticas de Leitura
          </DialogTitle>
          <DialogDescription>
            Veja quem já leu e quem ainda não leu esta mensagem
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : stats ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Leituras</span>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold">
                  {stats.readCount} / {stats.total}
                </p>
                <Progress value={stats.readPercentage} className="mt-2" />
              </div>

              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Pendentes</span>
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <p className="text-2xl font-bold">
                  {stats.unreadCount}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.readPercentage}% visualizaram
                </p>
              </div>
            </div>

            {/* Tabs com listas */}
            <Tabs defaultValue="read" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="read" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Lidas ({stats.readCount})
                </TabsTrigger>
                <TabsTrigger value="unread" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Não lidas ({stats.unreadCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="read" className="flex-1 mt-4 overflow-hidden">
                {stats.recipients.read.length > 0 ? (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {stats.recipients.read.map((recipient) => (
                        <div
                          key={recipient.userId}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          <PhotoViewer
                            photoUrl={recipient.userPhoto}
                            altText={recipient.userName}
                            size="sm"
                            rounded={true}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {recipient.userName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {recipient.userEmail}
                            </p>
                            {recipient.positionCode && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {POSITION_CODE_LABELS[recipient.positionCode] || recipient.positionCode}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-medium text-success">
                              Lida
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(recipient.readAt), "dd/MM 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-2 text-muted" />
                    <p className="text-sm">Nenhuma leitura registrada ainda</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unread" className="flex-1 mt-4 overflow-hidden">
                {stats.recipients.unread.length > 0 ? (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {stats.recipients.unread.map((recipient) => (
                        <div
                          key={recipient.userId}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          <PhotoViewer
                            photoUrl={recipient.userPhoto}
                            altText={recipient.userName}
                            size="sm"
                            rounded={true}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {recipient.userName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {recipient.userEmail}
                            </p>
                            {recipient.positionCode && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {POSITION_CODE_LABELS[recipient.positionCode] || recipient.positionCode}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              Aguardando
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-2 text-success" />
                    <p className="text-sm font-medium text-success">Todos leram! 🎉</p>
                    <p className="text-xs mt-1">100% dos destinatários visualizaram</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <p className="text-sm">Não foi possível carregar as estatísticas</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
