import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SentinelEvent {
  id: string;
  dailyRecordId: string;
  residentName: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  description: string;
  status: 'PENDENTE' | 'ENVIADO' | 'CONFIRMADO';
  protocolo?: string;
  dataEnvio?: string;
  dataConfirmacao?: string;
  responsavelEnvio?: string;
  emailEnviado: boolean;
  emailEnviadoEm?: string;
  observacoes?: string;
  createdAt: string;
}

interface SentinelEventTrackingModalProps {
  open: boolean;
  onClose: () => void;
  event?: SentinelEvent;
  onUpdateStatus: (eventId: string, data: Partial<SentinelEvent>) => Promise<void>;
}

const STATUS_CONFIG = {
  PENDENTE: {
    label: 'Pendente de Notificação',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  ENVIADO: {
    label: 'Enviado à Vigilância',
    icon: Send,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  CONFIRMADO: {
    label: 'Confirmado pela Vigilância',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};

export function SentinelEventTrackingModal({
  open,
  onClose,
  event,
  onUpdateStatus,
}: SentinelEventTrackingModalProps) {
  const [protocolo, setProtocolo] = useState(event?.protocolo || '');
  const [observacoes, setObservacoes] = useState(event?.observacoes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!event) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[event.status];
  const StatusIcon = statusConfig.icon;

  const handleMarkAsEnviado = async () => {
    if (!protocolo.trim()) {
      toast.error('Protocolo é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateStatus(event.id, {
        status: 'ENVIADO',
        protocolo,
        dataEnvio: new Date().toISOString(),
        observacoes,
      });
      toast.success('Status atualizado para "Enviado à Vigilância"');
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsConfirmado = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(event.id, {
        status: 'CONFIRMADO',
        dataConfirmacao: new Date().toISOString(),
        observacoes,
      });
      toast.success('Status atualizado para "Confirmado"');
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Evento Sentinela - Tracking de Notificação
          </DialogTitle>
          <DialogDescription>
            Acompanhamento de notificação obrigatória à Autoridade Sanitária Local
            (RDC 502/2021 Art. 55)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Status Atual */}
            <div
              className={`p-4 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.borderColor}`}
            >
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                <div>
                  <h3 className={`font-semibold ${statusConfig.color}`}>
                    {statusConfig.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {event.status === 'PENDENTE' &&
                      'Aguardando envio à vigilância (prazo: 24 horas)'}
                    {event.status === 'ENVIADO' &&
                      'Notificação enviada, aguardando confirmação'}
                    {event.status === 'CONFIRMADO' &&
                      'Processo de notificação finalizado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Informações do Evento */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Informações do Evento</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Residente</Label>
                  <p className="font-medium">{event.residentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Evento</Label>
                  <p className="font-medium">{event.eventType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium">
                    {format(new Date(event.eventDate), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Registrado em</Label>
                  <p className="font-medium">
                    {format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm mt-1 p-3 bg-muted rounded">{event.description}</p>
              </div>
            </div>

            {/* Timeline de Notificação */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Timeline de Notificação</h4>
              <div className="space-y-4">
                {/* Criação do Evento */}
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Evento Registrado</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>

                {/* Email ao RT */}
                {event.emailEnviado && event.emailEnviadoEm && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Email enviado ao RT</p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(event.emailEnviadoEm),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR },
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Envio à Vigilância */}
                {event.dataEnvio && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Enviado à Vigilância</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.dataEnvio), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {event.protocolo && (
                        <p className="text-xs mt-1">
                          <span className="font-medium">Protocolo:</span> {event.protocolo}
                        </p>
                      )}
                      {event.responsavelEnvio && (
                        <p className="text-xs">
                          <span className="font-medium">Responsável:</span>{' '}
                          {event.responsavelEnvio}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirmação */}
                {event.dataConfirmacao && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Confirmado pela Vigilância</p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(event.dataConfirmacao),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR },
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ações de Atualização de Status */}
            {event.status === 'PENDENTE' && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Registrar Envio à Vigilância
                </h4>

                <div>
                  <Label htmlFor="protocolo">Protocolo de Notificação *</Label>
                  <Input
                    id="protocolo"
                    value={protocolo}
                    onChange={(e) => setProtocolo(e.target.value)}
                    placeholder="Ex: VIG-2024-001234"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Informações adicionais sobre o envio..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleMarkAsEnviado}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Marcar como Enviado
                </Button>
              </div>
            )}

            {event.status === 'ENVIADO' && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Recebimento pela Vigilância
                </h4>

                <div>
                  <Label htmlFor="observacoes-confirmacao">
                    Observações sobre a Confirmação
                  </Label>
                  <Textarea
                    id="observacoes-confirmacao"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Informações sobre a confirmação..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleMarkAsConfirmado}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Confirmado
                </Button>
              </div>
            )}

            {event.status === 'CONFIRMADO' && event.observacoes && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-2">
                  Observações Finais
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {event.observacoes}
                </p>
              </div>
            )}

            {/* Evento Sentinela – Notificação Obrigatória */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-3">
                ⚖️ Evento Sentinela – Notificação Obrigatória
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3 leading-relaxed">
                Este registro caracteriza <strong>evento sentinela</strong>, nos
                termos do <strong>art. 55 da RDC nº 502/2021</strong>, que impõe à
                instituição o dever de{' '}
                <strong>notificar imediatamente a Autoridade Sanitária Local</strong>,
                devendo ser acompanhado até a confirmação do envio, observado o{' '}
                <strong>prazo máximo de 24 horas</strong>.
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                A manutenção do histórico e do status da notificação é essencial
                para fins de <strong>conformidade sanitária, rastreabilidade e auditoria</strong>.
              </p>
              <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Status atual:</strong>{' '}
                  {event.status === 'CONFIRMADO'
                    ? '✅ Notificação confirmada pela Autoridade Sanitária'
                    : event.status === 'ENVIADO'
                      ? '📤 Notificação enviada, aguardando confirmação'
                      : '⏳ Pendente de notificação à Autoridade Sanitária'}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
