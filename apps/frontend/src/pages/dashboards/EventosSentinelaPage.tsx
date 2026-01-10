import { useState } from 'react';
import { Page, PageHeader } from '@/design-system/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useSentinelEvents,
  useUpdateSentinelEventStatus,
  SentinelEvent,
} from '@/hooks/useSentinelEvents';
import { SentinelEventTrackingModal } from '@/components/rdc/SentinelEventTrackingModal';
import { useNavigate } from 'react-router-dom';

type StatusFilter = 'TODOS' | 'PENDENTE' | 'ENVIADO' | 'CONFIRMADO';

export function EventosSentinelaPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
  const [selectedEvent, setSelectedEvent] = useState<SentinelEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Buscar eventos com filtro
  const filters =
    statusFilter === 'TODOS' ? undefined : { status: statusFilter };
  const { data: events, isLoading } = useSentinelEvents(filters);
  const { mutateAsync: updateStatus } = useUpdateSentinelEventStatus();

  // Estatísticas
  const stats = {
    total: events?.length || 0,
    pendentes:
      events?.filter((e) => e.status === 'PENDENTE').length || 0,
    enviados: events?.filter((e) => e.status === 'ENVIADO').length || 0,
    confirmados:
      events?.filter((e) => e.status === 'CONFIRMADO').length || 0,
    atrasados:
      events?.filter((e) => {
        if (e.status !== 'PENDENTE') return false;
        const hoursElapsed = differenceInHours(
          new Date(),
          new Date(e.createdAt),
        );
        return hoursElapsed > 24;
      }).length || 0,
  };

  const handleOpenEvent = (event: SentinelEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  const handleUpdateStatus = async (
    eventId: string,
    data: Partial<SentinelEvent>,
  ) => {
    await updateStatus({
      eventId,
      status: data.status as 'ENVIADO' | 'CONFIRMADO',
      protocolo: data.protocolo,
      observacoes: data.observacoes,
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDENTE: {
        variant: 'destructive' as const,
        label: 'Pendente',
        icon: Clock,
      },
      ENVIADO: {
        variant: 'default' as const,
        label: 'Enviado',
        icon: Send,
      },
      CONFIRMADO: {
        variant: 'secondary' as const,
        label: 'Confirmado',
        icon: CheckCircle2,
      },
    };
    const cfg = config[status as keyof typeof config] || config.PENDENTE;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  const isOverdue = (event: SentinelEvent) => {
    if (event.status !== 'PENDENTE') return false;
    const hoursElapsed = differenceInHours(new Date(), new Date(event.createdAt));
    return hoursElapsed > 24;
  };

  return (
    <Page>
      <PageHeader
        title="Eventos Sentinela"
        subtitle="Rastreamento de notificações obrigatórias à Vigilância Sanitária (RDC 502/2021 Art. 55)"
        breadcrumbs={[
          { label: 'Conformidade', href: '/dashboard/conformidade' },
          { label: 'Eventos Sentinela' },
        ]}
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Eventos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">
              {stats.pendentes}
            </div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.enviados}
            </div>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.confirmados}
            </div>
            <p className="text-xs text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
        <Card className={stats.atrasados > 0 ? 'border-red-500' : ''}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              {stats.atrasados > 0 && <AlertTriangle className="h-5 w-5" />}
              {stats.atrasados}
            </div>
            <p className="text-xs text-muted-foreground">Atrasados (&gt;24h)</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de eventos atrasados */}
      {stats.atrasados > 0 && (
        <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  ⚠️ Atenção: {stats.atrasados} evento(s) pendente(s) há mais de 24
                  horas
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  A RDC 502/2021 Art. 55 exige notificação à Autoridade Sanitária
                  Local em até 24 horas. Regularize imediatamente para evitar
                  infrações.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="w-64">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Status</SelectItem>
                  <SelectItem value="PENDENTE">Pendentes</SelectItem>
                  <SelectItem value="ENVIADO">Enviados</SelectItem>
                  <SelectItem value="CONFIRMADO">Confirmados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Mostrando {events?.length || 0} evento(s)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando eventos...
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum evento sentinela registrado</p>
              <p className="text-xs mt-1">
                Eventos sentinela são detectados automaticamente quando há quedas
                com lesão ou tentativas de suicídio
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                    isOverdue(event) ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''
                  }`}
                  onClick={() => handleOpenEvent(event)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isOverdue(event) && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <h4 className="font-semibold">{event.residentName}</h4>
                        {getStatusBadge(event.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.eventType}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/residentes/${event.residentId}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Data/Hora</p>
                      <p className="font-medium">
                        {format(new Date(event.eventDate), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}{' '}
                        {event.eventTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Registrado</p>
                      <p className="font-medium">
                        {format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {event.protocolo && (
                      <div>
                        <p className="text-xs text-muted-foreground">Protocolo</p>
                        <p className="font-medium">{event.protocolo}</p>
                      </div>
                    )}
                    {event.status === 'PENDENTE' && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Tempo Decorrido
                        </p>
                        <p
                          className={`font-medium ${
                            isOverdue(event) ? 'text-red-600' : ''
                          }`}
                        >
                          {Math.floor(
                            differenceInHours(
                              new Date(),
                              new Date(event.createdAt),
                            ),
                          )}
                          h
                        </p>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm mt-3 p-2 bg-muted rounded">
                      {event.description}
                    </p>
                  )}

                  {isOverdue(event) && (
                    <div className="mt-3 text-xs text-red-600 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prazo de 24h excedido! Notificação urgente necessária.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Informativo */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">
            📋 Sobre Eventos Sentinela (RDC 502/2021)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Definição:</strong> Eventos sentinela são ocorrências graves
            que exigem notificação obrigatória à Autoridade Sanitária Local.
          </p>
          <p>
            <strong>Eventos cobertos:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Quedas com lesão</li>
            <li>Tentativas de suicídio</li>
          </ul>
          <p>
            <strong>Obrigações legais (Art. 55):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Notificar à Autoridade Sanitária Local em até 24 horas</li>
            <li>Notificar o Responsável Técnico imediatamente</li>
            <li>Obter protocolo de notificação</li>
            <li>Manter registro completo do evento e rastreamento</li>
          </ul>
          <p className="text-xs mt-4 pt-4 border-t">
            <strong>Detecção Automática:</strong> O sistema detecta
            automaticamente eventos sentinela nos registros diários e cria
            notificação crítica + email para o RT.
          </p>
        </CardContent>
      </Card>

      {/* Modal de Tracking */}
      {selectedEvent && (
        <SentinelEventTrackingModal
          open={modalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </Page>
  );
}
