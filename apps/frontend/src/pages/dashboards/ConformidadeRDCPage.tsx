import React, { useEffect, useMemo, useState } from 'react';
import { Page, PageHeader } from '@/design-system/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Plus,
  RefreshCw,
  Unlock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { generateRdcPdfReport } from '@/utils/rdcPdfExport';
import {
  formatDateOnlySafe,
  formatDateTimeSafe,
  getCurrentDate,
  getCurrentTime,
} from '@/utils/dateHelpers';
import { RdcIndicatorCard } from '@/components/rdc/RdcIndicatorCard';
import { RdcTrendChart } from '@/components/rdc/RdcTrendChart';
import {
  ReviewDecisionPayload,
  RegisterManualRdcCasePayload,
  RdcIndicatorMonthData,
  RdcReviewStatus,
  useCloseRdcMonth,
  useRdcAnnualConsolidated,
  useRdcIndicatorReviewCases,
  useRdcIndicators,
  useRdcIndicatorsHistory,
  useRegisterManualRdcCase,
  useReopenRdcMonth,
  useRecalculateIndicators,
  useSaveRdcIndicatorReview,
} from '@/hooks/useRdcIndicators';
import {
  IncidentSeverity,
  INCIDENT_SEVERITY_LABELS,
  RdcIndicatorType,
  RDC_INDICATOR_LABELS,
} from '@/types/incidents';
import { useResidents } from '@/hooks/useResidents';

type IndicatorMetadata = {
  pendingCount?: number;
  confirmedCount?: number;
  discardedCount?: number;
  totalCandidates?: number;
  populationReferenceDate?: string;
  periodClosure?: {
    status?: 'OPEN' | 'CLOSED';
    closedAt?: string;
    closedByName?: string;
    note?: string | null;
  };
};

const INDICATOR_ORDER: RdcIndicatorType[] = [
  RdcIndicatorType.MORTALIDADE,
  RdcIndicatorType.DIARREIA_AGUDA,
  RdcIndicatorType.ESCABIOSE,
  RdcIndicatorType.DESIDRATACAO,
  RdcIndicatorType.ULCERA_DECUBITO,
  RdcIndicatorType.DESNUTRICAO,
];

function getIndicatorMetadata(
  data: RdcIndicatorMonthData | undefined,
): IndicatorMetadata {
  const fromPayload: IndicatorMetadata = {
    pendingCount: data?.pendingCount,
    confirmedCount: data?.confirmedCount,
    discardedCount: data?.discardedCount,
    totalCandidates: data?.totalCandidates,
    populationReferenceDate: data?.populationReferenceDate || undefined,
    periodClosure:
      data?.periodStatus
        ? {
            status: data.periodStatus,
            closedAt: data.periodClosedAt || undefined,
            closedByName: data.periodClosedByName || undefined,
            note: data.periodCloseNote || null,
          }
        : undefined,
  };

  if (!data?.metadata || typeof data.metadata !== 'object') {
    return fromPayload;
  }

  const metadata = data.metadata as IndicatorMetadata;
  return {
    ...metadata,
    ...fromPayload,
    periodClosure: fromPayload.periodClosure || metadata.periodClosure,
  };
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateTime?: string | null): string {
  if (!dateTime) return '-';
  try {
    return formatDateTimeSafe(dateTime);
  } catch {
    return '-';
  }
}

function formatDateOnly(dateTime?: string | null): string {
  if (!dateTime) return '-';
  try {
    return formatDateOnlySafe(dateTime);
  } catch {
    return '-';
  }
}

function getMonthBounds(year: number, month: number) {
  const safeMonth = Math.min(Math.max(month, 1), 12);
  const monthStr = String(safeMonth).padStart(2, '0');
  const lastDay = new Date(year, safeMonth, 0).getDate();
  return {
    start: `${year}-${monthStr}-01`,
    end: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

function clampDateToMonth(date: string, bounds: { start: string; end: string }) {
  if (date < bounds.start) return bounds.start;
  if (date > bounds.end) return bounds.end;
  return date;
}

export function ConformidadeRDCPage() {
  const { user } = useAuthStore();
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [consolidatedYear, setConsolidatedYear] = useState(now.getFullYear() - 1);

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    indicatorType: RdcIndicatorType | null;
  }>({
    open: false,
    indicatorType: null,
  });
  const [reviewDraft, setReviewDraft] = useState<
    Record<string, { decision: RdcReviewStatus; reason: string }>
  >({});

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeNote, setCloseNote] = useState('');
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [manualCaseDialogOpen, setManualCaseDialogOpen] = useState(false);
  const [manualCaseIndicatorType, setManualCaseIndicatorType] = useState<RdcIndicatorType>(
    RdcIndicatorType.DIARREIA_AGUDA,
  );
  const [manualCaseResidentId, setManualCaseResidentId] = useState('');
  const [manualCaseDate, setManualCaseDate] = useState(getCurrentDate());
  const [manualCaseTime, setManualCaseTime] = useState(getCurrentTime());
  const [manualCaseSeverity, setManualCaseSeverity] = useState<IncidentSeverity>(
    IncidentSeverity.MODERADA,
  );
  const [manualCaseDescription, setManualCaseDescription] = useState('');
  const [manualCaseActionTaken, setManualCaseActionTaken] = useState('');
  const [manualCaseNote, setManualCaseNote] = useState('');
  const [manualCaseResidentSearch, setManualCaseResidentSearch] = useState('');

  const { data: indicators, isLoading: isLoadingIndicators } = useRdcIndicators(
    selectedYear,
    selectedMonth,
  );
  const { data: history, isLoading: isLoadingHistory } = useRdcIndicatorsHistory(12);
  const { data: annualConsolidated, isLoading: isLoadingAnnual } =
    useRdcAnnualConsolidated(consolidatedYear);
  const { residents } = useResidents({
    page: 1,
    limit: 500,
    sortBy: 'fullName',
    sortOrder: 'asc',
  });

  const recalculateMutation = useRecalculateIndicators();
  const saveReviewMutation = useSaveRdcIndicatorReview();
  const closeMonthMutation = useCloseRdcMonth();
  const reopenMonthMutation = useReopenRdcMonth();
  const registerManualCaseMutation = useRegisterManualRdcCase();

  const reviewCasesQuery = useRdcIndicatorReviewCases({
    year: selectedYear,
    month: selectedMonth,
    indicatorType: reviewDialog.indicatorType,
    enabled: reviewDialog.open && Boolean(reviewDialog.indicatorType),
  });

  useEffect(() => {
    if (!reviewCasesQuery.data) return;

    const nextDraft: Record<string, { decision: RdcReviewStatus; reason: string }> =
      {};
    reviewCasesQuery.data.candidates.forEach((candidate) => {
      nextDraft[candidate.incidentId] = {
        decision: candidate.reviewStatus,
        reason: candidate.reviewReason || '',
      };
    });
    setReviewDraft(nextDraft);
  }, [reviewCasesQuery.data]);

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  const monthLabel = useMemo(
    () => formatMonthYear(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );
  const monthBounds = useMemo(
    () => getMonthBounds(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  const availableResidents = useMemo(() => {
    return residents
      .filter((resident) => {
        const normalizedStatus = String(resident.status || '')
          .trim()
          .toUpperCase();
        return normalizedStatus !== 'FALECIDO';
      })
      .filter((resident) => {
        if (!manualCaseResidentSearch.trim()) return true;
        const query = manualCaseResidentSearch.trim().toLowerCase();
        const bedCode = resident.bed?.code || '';
        return (
          resident.fullName.toLowerCase().includes(query) ||
          String(resident.cpf || '')
            .replace(/\D/g, '')
            .includes(query.replace(/\D/g, '')) ||
          bedCode.toLowerCase().includes(query)
        );
      });
  }, [manualCaseResidentSearch, residents]);

  const previousMonthData = useMemo(() => {
    if (!history || history.length < 2) return null;

    const currentPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const sortedHistory = [...history].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    const currentIndex = sortedHistory.findIndex(
      (item) =>
        `${item.year}-${String(item.month).padStart(2, '0')}` === currentPeriod,
    );

    if (currentIndex >= 0 && currentIndex < sortedHistory.length - 1) {
      return sortedHistory[currentIndex + 1];
    }
    return null;
  }, [history, selectedYear, selectedMonth]);

  const indicatorRows = useMemo(() => {
    return INDICATOR_ORDER.map((indicatorType) => {
      const data = indicators?.[indicatorType];
      const metadata = getIndicatorMetadata(data);
      return {
        indicatorType,
        numerator: data?.numerator || 0,
        denominator: data?.denominator || 0,
        rate: data?.rate || 0,
        incidentIds: data?.incidentIds || [],
        pendingCount: metadata.pendingCount || 0,
        confirmedCount: metadata.confirmedCount || 0,
        discardedCount: metadata.discardedCount || 0,
        totalCandidates: metadata.totalCandidates || 0,
      };
    });
  }, [indicators]);

  const monthMetadata = useMemo(() => {
    const firstIndicator = indicators?.[INDICATOR_ORDER[0]];
    return getIndicatorMetadata(firstIndicator);
  }, [indicators]);

  const monthClosure = monthMetadata.periodClosure;
  const isMonthClosed = monthClosure?.status === 'CLOSED';
  const totalPendingCases = indicatorRows.reduce(
    (acc, row) => acc + row.pendingCount,
    0,
  );

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleRecalculate = async () => {
    if (isMonthClosed) {
      toast.error('Mês fechado. Reabra o período antes de recalcular.');
      return;
    }

    try {
      await recalculateMutation.mutateAsync({
        year: selectedYear,
        month: selectedMonth,
      });
      toast.success('Indicadores recalculados com sucesso.');
    } catch (error) {
      toast.error('Não foi possível recalcular os indicadores.');
    }
  };

  const handleOpenReview = (indicatorType: RdcIndicatorType) => {
    setReviewDialog({ open: true, indicatorType });
  };

  const handleSaveReview = async () => {
    if (!reviewDialog.indicatorType || !reviewCasesQuery.data) return;

    const decisions: ReviewDecisionPayload[] = reviewCasesQuery.data.candidates.map(
      (candidate) => {
        const draft = reviewDraft[candidate.incidentId];
        return {
          incidentId: candidate.incidentId,
          decision: draft?.decision || 'PENDING',
          reason:
            draft?.decision === 'DISCARDED' ? draft.reason.trim() || undefined : undefined,
        };
      },
    );

    const discardedWithoutReason = decisions.some(
      (item) =>
        item.decision === 'DISCARDED' &&
        (!item.reason || item.reason.trim().length < 5),
    );
    if (discardedWithoutReason) {
      toast.error('Informe motivo com no mínimo 5 caracteres para descarte.');
      return;
    }

    try {
      await saveReviewMutation.mutateAsync({
        year: selectedYear,
        month: selectedMonth,
        indicatorType: reviewDialog.indicatorType,
        decisions,
      });
      toast.success('Revisão de casos salva com sucesso.');
      setReviewDialog({ open: false, indicatorType: null });
    } catch (error) {
      toast.error('Não foi possível salvar a revisão dos casos.');
    }
  };

  const handleCloseMonth = async () => {
    try {
      await closeMonthMutation.mutateAsync({
        year: selectedYear,
        month: selectedMonth,
        note: closeNote.trim() || undefined,
      });
      setCloseDialogOpen(false);
      setCloseNote('');
      toast.success('Período fechado com sucesso.');
    } catch (error) {
      toast.error('Não foi possível fechar o período mensal.');
    }
  };

  const handleReopenMonth = async () => {
    const normalizedReason = reopenReason.trim();
    if (normalizedReason.length < 5) {
      toast.error('Informe o motivo da reabertura com no mínimo 5 caracteres.');
      return;
    }

    try {
      await reopenMonthMutation.mutateAsync({
        year: selectedYear,
        month: selectedMonth,
        reason: normalizedReason,
      });
      toast.success('Período reaberto com sucesso.');
      setReopenDialogOpen(false);
      setReopenReason('');
    } catch (error) {
      toast.error('Não foi possível reabrir o período.');
    }
  };

  const handleOpenManualCaseDialog = () => {
    setManualCaseIndicatorType(RdcIndicatorType.DIARREIA_AGUDA);
    setManualCaseResidentId('');
    setManualCaseDate(clampDateToMonth(getCurrentDate(), monthBounds));
    setManualCaseTime(getCurrentTime());
    setManualCaseSeverity(IncidentSeverity.MODERADA);
    setManualCaseDescription('');
    setManualCaseActionTaken('');
    setManualCaseNote('');
    setManualCaseResidentSearch('');
    setManualCaseDialogOpen(true);
  };

  const handleSaveManualCase = async () => {
    if (!manualCaseResidentId) {
      toast.error('Selecione um residente para registrar o caso.');
      return;
    }

    const normalizedDescription = manualCaseDescription.trim();
    const normalizedActionTaken = manualCaseActionTaken.trim();
    const normalizedDate = manualCaseDate.trim();
    const normalizedTime = manualCaseTime.trim();

    if (normalizedDate < monthBounds.start || normalizedDate > monthBounds.end) {
      toast.error('A data da confirmação deve estar dentro do mês selecionado.');
      return;
    }

    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(normalizedTime)) {
      toast.error('Informe um horário válido no formato HH:mm.');
      return;
    }

    if (normalizedDescription.length < 5) {
      toast.error('Descreva o caso com no mínimo 5 caracteres.');
      return;
    }

    if (normalizedActionTaken.length < 5) {
      toast.error('Informe a ação tomada com no mínimo 5 caracteres.');
      return;
    }

    const payload: RegisterManualRdcCasePayload = {
      year: selectedYear,
      month: selectedMonth,
      indicatorType: manualCaseIndicatorType,
      residentId: manualCaseResidentId,
      date: normalizedDate,
      time: normalizedTime,
      severity: manualCaseSeverity,
      description: normalizedDescription,
      actionTaken: normalizedActionTaken,
      note: manualCaseNote.trim() || undefined,
    };

    try {
      await registerManualCaseMutation.mutateAsync(payload);
      toast.success('Caso registrado e confirmado no indicador.');
      setManualCaseDialogOpen(false);
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string | string[] } };
      };
      const message = Array.isArray(apiError.response?.data?.message)
        ? apiError.response?.data?.message.join(' ')
        : apiError.response?.data?.message;
      toast.error(message || 'Não foi possível registrar o caso manual.');
    }
  };

  const handleExportPdf = async () => {
    if (!indicators) {
      toast.error('Nenhum dado disponível para exportar.');
      return;
    }

    try {
      await generateRdcPdfReport({
        year: selectedYear,
        month: selectedMonth,
        indicators,
        history: history || [],
        tenantName: user?.tenant?.name,
        generatedBy: user?.name,
      });
      toast.success('Relatório PDF gerado com sucesso.');
    } catch (error) {
      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Indicadores Mensais Obrigatórios"
        subtitle="RDC 502/2021 (Art. 58, 59, 60 e Anexo)"
        breadcrumbs={[
          { label: 'Hub de Conformidade', href: '/dashboard/conformidade' },
          { label: 'Indicadores Mensais' },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[220px] text-center text-lg font-semibold capitalize">
            {monthLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenManualCaseDialog}
            disabled={isMonthClosed || registerManualCaseMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Incluir caso
          </Button>
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={recalculateMutation.isPending || isMonthClosed}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalcular
          </Button>
          {isMonthClosed && (
            <Button
              variant="outline"
              onClick={() => setReopenDialogOpen(true)}
              disabled={reopenMonthMutation.isPending}
            >
              <Unlock className="mr-2 h-4 w-4" />
              Reabrir mês
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setCloseDialogOpen(true)}
            disabled={isMonthClosed || totalPendingCases > 0}
          >
            <Lock className="mr-2 h-4 w-4" />
            Fechar mês
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={!indicators || isLoadingIndicators}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status do período</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">População exposta (dia 15)</p>
            <p className="text-2xl font-semibold">
              {indicatorRows[0]?.denominator || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Referência:{' '}
              {monthMetadata.populationReferenceDate || `${selectedYear}-${selectedMonth}-15`}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Casos pendentes de revisão</p>
            <p className="text-2xl font-semibold">{totalPendingCases}</p>
            <p className="text-xs text-muted-foreground">
              Confirmar/descartar antes do fechamento
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Situação do mês</p>
            <div className="mt-1 flex items-center gap-2">
              {isMonthClosed ? (
                <Badge className="bg-success">Fechado</Badge>
              ) : (
                <Badge variant="secondary">Aberto</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isMonthClosed
                ? `Fechado em ${formatDateTime(monthClosure?.closedAt)} por ${monthClosure?.closedByName || 'Usuário'}`
                : 'Período aberto para revisão.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INDICATOR_ORDER.map((indicatorType) => {
          const data = indicators?.[indicatorType];
          const previousData = previousMonthData?.indicators[indicatorType];

          return (
            <RdcIndicatorCard
              key={indicatorType}
              indicatorType={indicatorType}
              rate={data?.rate || 0}
              numerator={data?.numerator || 0}
              denominator={data?.denominator || 0}
              previousRate={previousData?.rate}
              incidentIds={data?.incidentIds || []}
              year={selectedYear}
              month={selectedMonth}
              onViewDetails={() => handleOpenReview(indicatorType)}
              isLoading={isLoadingIndicators}
            />
          );
        })}
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Revisão de casos por indicador</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-2">Indicador</th>
                <th className="px-2 py-2 text-center">Candidatos</th>
                <th className="px-2 py-2 text-center">Confirmados</th>
                <th className="px-2 py-2 text-center">Descartados</th>
                <th className="px-2 py-2 text-center">Pendentes</th>
                <th className="px-2 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {indicatorRows.map((row) => (
                <tr key={row.indicatorType} className="border-b last:border-0">
                  <td className="px-2 py-3 font-medium">
                    {RDC_INDICATOR_LABELS[row.indicatorType]}
                  </td>
                  <td className="px-2 py-3 text-center">{row.totalCandidates}</td>
                  <td className="px-2 py-3 text-center text-success">
                    {row.confirmedCount}
                  </td>
                  <td className="px-2 py-3 text-center text-danger">
                    {row.discardedCount}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span
                      className={
                        row.pendingCount > 0 ? 'font-semibold text-warning' : ''
                      }
                    >
                      {row.pendingCount}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReview(row.indicatorType)}
                    >
                      Revisar casos
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mb-8">
        <RdcTrendChart data={history || []} isLoading={isLoadingHistory} />
      </div>

      <Card className="mb-8">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Consolidado anual (Art. 60)</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConsolidatedYear((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              className="h-9 w-24 text-center"
              value={consolidatedYear}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isNaN(value)) {
                  setConsolidatedYear(value);
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConsolidatedYear((prev) => prev + 1)}
              disabled={consolidatedYear >= now.getFullYear()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {annualConsolidated && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Meses fechados</p>
                <p className="text-xl font-semibold">{annualConsolidated.summary.closedMonths}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Meses abertos</p>
                <p className="text-xl font-semibold">{annualConsolidated.summary.openMonths}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Meses sem cálculo</p>
                <p className="text-xl font-semibold">{annualConsolidated.summary.missingMonths}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pronto para envio</p>
                {annualConsolidated.summary.readyToSubmit ? (
                  <Badge className="mt-1 bg-success">Sim</Badge>
                ) : (
                  <Badge className="mt-1" variant="secondary">
                    Não
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-2">Mês</th>
                  <th className="px-2 py-2">Situação</th>
                  <th className="px-2 py-2">Fechamento</th>
                  <th className="px-2 py-2 text-right">Indicadores fechados</th>
                </tr>
              </thead>
              <tbody>
                {annualConsolidated?.months.map((month) => {
                  const closedIndicators = month.indicators.filter((item) => item.closed)
                    .length;
                  return (
                    <tr key={month.month} className="border-b last:border-0">
                      <td className="px-2 py-3 font-medium">
                        {new Date(consolidatedYear, month.month - 1, 1).toLocaleDateString(
                          'pt-BR',
                          {
                            month: 'long',
                            year: 'numeric',
                          },
                        )}
                      </td>
                      <td className="px-2 py-3">
                        {month.status === 'CLOSED' && <Badge className="bg-success">Fechado</Badge>}
                        {month.status === 'OPEN' && <Badge variant="secondary">Aberto</Badge>}
                        {month.status === 'MISSING' && <Badge variant="outline">Sem cálculo</Badge>}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {month.indicators.find((item) => item.closed)?.closedAt
                          ? formatDateTime(
                              month.indicators.find((item) => item.closed)?.closedAt || null,
                            )
                          : '-'}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {closedIndicators}/{month.indicators.length}
                      </td>
                    </tr>
                  );
                })}
                {isLoadingAnnual && (
                  <tr>
                    <td className="px-2 py-4 text-muted-foreground" colSpan={4}>
                      Carregando consolidado anual...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Base legal e método de cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Art. 58 e 59: avaliação continuada do desempenho institucional com os
            indicadores obrigatórios do Anexo da RDC 502/2021.
          </p>
          <p>
            População exposta: número de residentes do dia 15 de cada mês (nota do
            Anexo).
          </p>
          <p>
            Art. 60: em janeiro, encaminhar à Vigilância Sanitária o consolidado do
            ano anterior.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog({ open: false, indicatorType: null });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Revisão de casos -{' '}
              {reviewDialog.indicatorType
                ? RDC_INDICATOR_LABELS[reviewDialog.indicatorType]
                : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto pr-1">
            {reviewCasesQuery.isLoading && (
              <div className="py-8 text-center text-muted-foreground">
                Carregando casos candidatos...
              </div>
            )}

            {reviewCasesQuery.isError && (
              <div className="rounded-md border border-danger/30 bg-danger/10 p-4 text-danger">
                Não foi possível carregar os casos para revisão.
              </div>
            )}

            {reviewCasesQuery.data && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Candidatos</p>
                    <p className="text-xl font-semibold">
                      {reviewCasesQuery.data.summary.total}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Confirmados</p>
                    <p className="text-xl font-semibold text-success">
                      {reviewCasesQuery.data.summary.confirmed}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Descartados</p>
                    <p className="text-xl font-semibold text-danger">
                      {reviewCasesQuery.data.summary.discarded}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-xl font-semibold text-warning">
                      {reviewCasesQuery.data.summary.pending}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {reviewCasesQuery.data.candidates.length === 0 && (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">
                      Não há casos candidatos para este indicador no período selecionado.
                    </div>
                  )}
                  {reviewCasesQuery.data.candidates.map((candidate) => {
                    const draft = reviewDraft[candidate.incidentId] || {
                      decision: 'PENDING' as RdcReviewStatus,
                      reason: '',
                    };

                    return (
                      <div key={candidate.incidentId} className="rounded-md border p-3">
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{candidate.residentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateOnly(candidate.date)}{' '}
                              {candidate.time !== '--:--' ? `• ${candidate.time}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline">{candidate.severity}</Badge>
                        </div>

                        <p className="mb-3 text-sm text-muted-foreground">
                          {candidate.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={draft.decision === 'CONFIRMED' ? 'default' : 'outline'}
                            onClick={() =>
                              setReviewDraft((prev) => ({
                                ...prev,
                                [candidate.incidentId]: {
                                  ...prev[candidate.incidentId],
                                  decision: 'CONFIRMED',
                                  reason: '',
                                },
                              }))
                            }
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant={draft.decision === 'DISCARDED' ? 'destructive' : 'outline'}
                            onClick={() =>
                              setReviewDraft((prev) => ({
                                ...prev,
                                [candidate.incidentId]: {
                                  ...prev[candidate.incidentId],
                                  decision: 'DISCARDED',
                                },
                              }))
                            }
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Descartar
                          </Button>
                          <Button
                            size="sm"
                            variant={draft.decision === 'PENDING' ? 'secondary' : 'outline'}
                            onClick={() =>
                              setReviewDraft((prev) => ({
                                ...prev,
                                [candidate.incidentId]: {
                                  ...prev[candidate.incidentId],
                                  decision: 'PENDING',
                                  reason: '',
                                },
                              }))
                            }
                          >
                            <CalendarClock className="mr-1 h-4 w-4" />
                            Manter pendente
                          </Button>
                        </div>

                        {draft.decision === 'DISCARDED' && (
                          <div className="mt-3">
                            <label className="mb-1 block text-xs text-muted-foreground">
                              Motivo do descarte (mínimo 5 caracteres)
                            </label>
                            <Textarea
                              value={draft.reason}
                              onChange={(event) =>
                                setReviewDraft((prev) => ({
                                  ...prev,
                                  [candidate.incidentId]: {
                                    ...prev[candidate.incidentId],
                                    reason: event.target.value,
                                  },
                                }))
                              }
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog({ open: false, indicatorType: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveReview}
              disabled={
                saveReviewMutation.isPending ||
                !reviewCasesQuery.data ||
                reviewCasesQuery.data.candidates.length === 0
              }
            >
              Salvar revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manualCaseDialogOpen}
        onOpenChange={(open) => {
          setManualCaseDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar caso do indicador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use este fluxo para incluir caso confirmado tardiamente no mês{' '}
              <strong className="capitalize">{monthLabel}</strong>. O caso será
              registrado e confirmado automaticamente no indicador selecionado.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Indicador *
                </label>
                <Select
                  value={manualCaseIndicatorType}
                  onValueChange={(value) =>
                    setManualCaseIndicatorType(value as RdcIndicatorType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o indicador" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDICATOR_ORDER.map((indicatorType) => (
                      <SelectItem key={indicatorType} value={indicatorType}>
                        {RDC_INDICATOR_LABELS[indicatorType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Severidade *
                </label>
                <Select
                  value={manualCaseSeverity}
                  onValueChange={(value) =>
                    setManualCaseSeverity(value as IncidentSeverity)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(IncidentSeverity).map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {INCIDENT_SEVERITY_LABELS[severity]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Buscar residente
              </label>
              <Input
                value={manualCaseResidentSearch}
                onChange={(event) => setManualCaseResidentSearch(event.target.value)}
                placeholder="Nome, CPF ou leito"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Residente *
              </label>
              <Select value={manualCaseResidentId} onValueChange={setManualCaseResidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o residente" />
                </SelectTrigger>
                <SelectContent>
                  {availableResidents.map((resident) => (
                    <SelectItem key={resident.id} value={resident.id}>
                      {resident.fullName}
                      {resident.bed?.code ? ` • ${resident.bed.code}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableResidents.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nenhum residente encontrado para o filtro informado.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Data de confirmação *
                </label>
                <Input
                  type="date"
                  value={manualCaseDate}
                  min={monthBounds.start}
                  max={monthBounds.end}
                  onChange={(event) => setManualCaseDate(event.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Período permitido: {formatDateOnlySafe(monthBounds.start)} a{' '}
                  {formatDateOnlySafe(monthBounds.end)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Hora de confirmação *
                </label>
                <Input
                  type="time"
                  value={manualCaseTime}
                  onChange={(event) => setManualCaseTime(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Descrição clínica do caso *
              </label>
              <Textarea
                value={manualCaseDescription}
                onChange={(event) => setManualCaseDescription(event.target.value)}
                rows={3}
                placeholder="Descreva os achados clínicos que justificam a inclusão do caso."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Ação tomada *
              </label>
              <Textarea
                value={manualCaseActionTaken}
                onChange={(event) => setManualCaseActionTaken(event.target.value)}
                rows={3}
                placeholder="Informe a conduta adotada no momento da confirmação."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Observação (opcional)
              </label>
              <Textarea
                value={manualCaseNote}
                onChange={(event) => setManualCaseNote(event.target.value)}
                rows={2}
                placeholder="Informação adicional para auditoria."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualCaseDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveManualCase}
              disabled={registerManualCaseMutation.isPending}
            >
              Confirmar inclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Fechar período mensal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              O fechamento bloqueia alterações das decisões do mês{' '}
              <strong className="capitalize">{monthLabel}</strong>.
            </p>
            {totalPendingCases > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <AlertCircle className="mr-2 inline-block h-4 w-4" />
                Existem {totalPendingCases} casos pendentes. Finalize a revisão antes
                de fechar.
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Observação de fechamento (opcional)
              </label>
              <Textarea
                value={closeNote}
                onChange={(event) => setCloseNote(event.target.value)}
                rows={3}
                placeholder="Ex.: Indicadores revisados e validados para consolidação anual."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCloseMonth}
              disabled={closeMonthMutation.isPending || totalPendingCases > 0}
            >
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reabrir período mensal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              A reabertura permite revisar e incluir casos no mês{' '}
              <strong className="capitalize">{monthLabel}</strong> antes do novo
              fechamento.
            </p>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Motivo da reabertura (obrigatório)
              </label>
              <Textarea
                value={reopenReason}
                onChange={(event) => setReopenReason(event.target.value)}
                rows={3}
                placeholder="Ex.: Caso confirmado após revisão clínica tardia do prontuário."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Esta ação ficará registrada em auditoria com usuário, data/hora e motivo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReopenMonth}
              disabled={
                reopenMonthMutation.isPending || reopenReason.trim().length < 5
              }
            >
              Confirmar reabertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
