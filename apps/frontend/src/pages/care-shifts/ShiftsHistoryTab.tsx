// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - ShiftsHistoryTab (Aba de Histórico de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Loader2, FileText, Clock } from 'lucide-react';
import { extractDateOnly, getCurrentDate, normalizeUTCDate } from '@/utils/dateHelpers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShiftDetailsModal } from '@/components/care-shifts/shifts/ShiftDetailsModal';
import { useShifts } from '@/hooks/care-shifts/useShifts';
import { useRDCCalculation } from '@/hooks/care-shifts/useRDCCalculation';
import type { Shift, ShiftStatus } from '@/types/care-shifts/care-shifts';

type PeriodPreset = '7' | '30' | '90' | 'custom';

/**
 * Aba de histórico de plantões para Admin/RT
 * Permite visualizar plantões passados (COMPLETED) e seus relatórios de passagem
 */
export function ShiftsHistoryTab() {
  const today = getCurrentDate();

  // Estado dos filtros
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('7');
  const [customStartDate, setCustomStartDate] = useState(
    format(subDays(normalizeUTCDate(today), 7), 'yyyy-MM-dd'),
  );
  const [customEndDate, setCustomEndDate] = useState(today);

  // Estado do modal
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Calcular datas baseado no preset
  const getDateRange = () => {
    if (periodPreset === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    const days = parseInt(periodPreset, 10);
    return {
      startDate: format(subDays(normalizeUTCDate(today), days), 'yyyy-MM-dd'),
      endDate: today,
    };
  };

  const { startDate, endDate } = getDateRange();

  // Buscar plantões
  const { data: allShifts, isLoading } = useShifts({ startDate, endDate });

  // Buscar cálculo RDC para a data inicial
  const { data: rdcCalculation } = useRDCCalculation({ date: startDate });

  // Filtrar apenas plantões COMPLETED
  const completedShifts = (allShifts || []).filter(
    (shift) => shift.status === ('COMPLETED' as ShiftStatus),
  );

  // Agrupar por data (mais recentes primeiro)
  const shiftsByDate = completedShifts.reduce(
    (acc, shift) => {
      const dateKey = extractDateOnly(shift.date);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(shift);
      return acc;
    },
    {} as Record<string, Shift[]>,
  );

  const sortedDates = Object.keys(shiftsByDate).sort().reverse();

  const handleViewDetails = (shift: Shift) => {
    setSelectedShift(shift);
    setDetailsOpen(true);
  };

  const handlePresetChange = (value: PeriodPreset) => {
    setPeriodPreset(value);
    if (value !== 'custom') {
      const days = parseInt(value, 10);
      setCustomStartDate(format(subDays(normalizeUTCDate(today), days), 'yyyy-MM-dd'));
      setCustomEndDate(today);
    }
  };

  // Função para obter o mínimo RDC para um turno específico
  const getMinimumRequired = (shiftTemplateId: string): number => {
    if (!rdcCalculation) return 0;
    const calc = rdcCalculation.calculations.find(
      (c) => c.shiftTemplate.id === shiftTemplateId,
    );
    return calc?.minimumRequired || 0;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = normalizeUTCDate(dateString);
      return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Plantões
          </CardTitle>
          <CardDescription>
            Visualize plantões concluídos e seus relatórios de passagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Preset de período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Datas customizadas */}
            {periodPreset === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="historyStartDate">Data Inicial</Label>
                  <Input
                    id="historyStartDate"
                    type="date"
                    value={customStartDate}
                    max={customEndDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historyEndDate">Data Final</Label>
                  <Input
                    id="historyEndDate"
                    type="date"
                    value={customEndDate}
                    min={customStartDate}
                    max={today}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Plantões */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum plantão concluído encontrado para o período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dateShifts = shiftsByDate[dateKey];
            const formattedDate = formatDate(dateKey);

            return (
              <div key={dateKey} className="space-y-3">
                {/* Cabeçalho da Data */}
                <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 py-2">
                  <h3 className="text-lg font-semibold capitalize">{formattedDate}</h3>
                </div>

                {/* Cards dos plantões */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dateShifts.map((shift) => (
                    <ShiftHistoryCard
                      key={shift.id}
                      shift={shift}
                      onViewDetails={() => handleViewDetails(shift)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes */}
      <ShiftDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        shift={selectedShift}
        minimumRequired={
          selectedShift ? getMinimumRequired(selectedShift.shiftTemplateId) : 0
        }
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Componente interno para card de histórico
// ────────────────────────────────────────────────────────────────────────────

interface ShiftHistoryCardProps {
  shift: Shift;
  onViewDetails: () => void;
}

function ShiftHistoryCard({ shift, onViewDetails }: ShiftHistoryCardProps) {
  const activeMembers = shift.members?.filter((m) => !m.removedAt) || [];
  const hasHandover = !!shift.handover;

  // Preview do relatório (primeiras 150 caracteres)
  const reportPreview = shift.handover?.report
    ? shift.handover.report.length > 150
      ? shift.handover.report.slice(0, 150) + '...'
      : shift.handover.report
    : shift.notes
      ? shift.notes.length > 150
        ? shift.notes.slice(0, 150) + '...'
        : shift.notes
      : null;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{shift.shiftTemplate?.name}</span>
            <span className="text-sm text-muted-foreground">
              ({shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime})
            </span>
          </div>
          <Badge variant="secondary">
            Concluído
          </Badge>
        </div>

        {/* Equipe */}
        {shift.team && (
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: shift.team.color || '#3B82F6' }}
            />
            <span>{shift.team.name}</span>
            <span className="text-muted-foreground">
              • {activeMembers.length} cuidador{activeMembers.length !== 1 ? 'es' : ''}
            </span>
          </div>
        )}

        {/* Preview do relatório */}
        {reportPreview && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="h-3 w-3" />
              {hasHandover ? 'Relatório de Passagem' : 'Ocorrências do Turno'}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {reportPreview}
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between pt-2">
          {hasHandover && shift.handover?.handedOverByUser && (
            <span className="text-xs text-muted-foreground">
              Passagem por {shift.handover.handedOverByUser.name}
            </span>
          )}
          {!hasHandover && <span />}
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
