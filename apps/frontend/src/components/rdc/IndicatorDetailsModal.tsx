import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RdcIndicatorType, RDC_INDICATOR_LABELS } from '@/types/incidents';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, Calendar, User, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DailyRecord {
  id: string;
  date: string;
  time: string;
  recordedBy: string;
  resident: {
    id: string;
    fullName: string;
  };
  data: {
    descricao: string;
    acaoTomada: string;
  };
  incidentSeverity?: string;
}

interface IndicatorDetailsModalProps {
  open: boolean;
  onClose: () => void;
  indicatorType: RdcIndicatorType;
  incidentIds: string[];
  year: number;
  month: number;
}

export function IndicatorDetailsModal({
  open,
  onClose,
  indicatorType,
  incidentIds,
  year,
  month,
}: IndicatorDetailsModalProps) {
  // Buscar detalhes das intercorrências
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incident-details', incidentIds],
    queryFn: async () => {
      if (!incidentIds || incidentIds.length === 0) return [];

      // Buscar todos os registros em paralelo
      const promises = incidentIds.map((id) =>
        api.get<DailyRecord>(`/daily-records/${id}`).then((res) => res.data),
      );

      const results = await Promise.all(promises);
      return results;
    },
    enabled: open && incidentIds && incidentIds.length > 0,
  });

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const severityColors: Record<string, string> = {
    LEVE: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    MODERADA:
      'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    GRAVE:
      'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    CRITICA: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  };

  const severityLabels: Record<string, string> = {
    LEVE: 'Leve',
    MODERADA: 'Moderada',
    GRAVE: 'Grave',
    CRITICA: 'Crítica',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Detalhamento de Casos - {RDC_INDICATOR_LABELS[indicatorType]}
          </DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">
            Período: {monthLabel}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Carregando detalhes...
            </div>
          </div>
        ) : !incidents || incidents.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Nenhum caso registrado</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4 pb-4">
              {incidents.map((incident, index) => (
                <div
                  key={incident.id}
                  className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  {/* Cabeçalho do caso */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          Caso #{index + 1}
                        </span>
                        {incident.incidentSeverity && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              severityColors[incident.incidentSeverity] ||
                              'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {severityLabels[incident.incidentSeverity] ||
                              incident.incidentSeverity}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground">
                        {incident.resident.fullName}
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `/dashboard/residentes/${incident.resident.id}`,
                          '_blank',
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Informações do registro */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(incident.date), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}{' '}
                        às {incident.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Registrado por: {incident.recordedBy}</span>
                    </div>
                  </div>

                  {/* Descrição e Ação */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-xs text-muted-foreground uppercase">
                          Descrição
                        </span>
                      </div>
                      <p className="text-foreground ml-5">
                        {incident.data.descricao}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-xs text-muted-foreground uppercase">
                          Ação Tomada
                        </span>
                      </div>
                      <p className="text-foreground ml-5">
                        {incident.data.acaoTomada}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            Total de {incidents?.length || 0}{' '}
            {incidents?.length === 1 ? 'caso registrado' : 'casos registrados'}
          </p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
