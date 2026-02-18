import { useMemo, useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ClipboardCheck,
  History,
  Loader2,
  Users,
  CalendarClock,
} from 'lucide-react';
import { Page, PageHeader } from '@/design-system/components';
import { useShifts } from '@/hooks/care-shifts/useShifts';
import { ShiftStatus, type Shift } from '@/types/care-shifts/care-shifts';
import { getCurrentDate, normalizeUTCDate, formatDateTimeSafe } from '@/utils/dateHelpers';
import { formatShiftStatusLabel } from '@/utils/shiftStatus';
import { getShiftHistoryRecordTypeLabel } from '@/utils/shiftHistoryRecordTypeLabel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONTINUITY_KEYWORD_PATTERN =
  '\\b(?:pend[eê]ncias?|pendentes?|aten[cç][aã]o|revis(?:ar|[aã]o|[oõ]es)|encaminh(?:ar|amentos?|ad[oa]s?)|intercorr[eê]ncias?|monitor(?:ar|amentos?|ad[oa]s?)|observ(?:ar|a[cç][aã]o|a[cç][oõ]es)|urgentes?|riscos?|reavali(?:ar|a[cç][aã]o|a[cç][oõ]es)|ajustes?|altera[cç][aã]o|altera[cç][oõ]es|suspens[oõ]es?|quedas?|alertas?|prioridade|acompanhamento)\\b';

const CONTINUITY_KEYWORD_REGEX = new RegExp(`(${CONTINUITY_KEYWORD_PATTERN})`, 'giu');
const CONTINUITY_KEYWORD_MATCH_REGEX = new RegExp(CONTINUITY_KEYWORD_PATTERN, 'iu');

function hasReport(shift: Shift): boolean {
  return (
    (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.ADMIN_CLOSED) &&
    !!shift.handover
  );
}

function sortByReportDateAsc(a: Shift, b: Shift): number {
  const aTime = a.handover?.createdAt ? new Date(a.handover.createdAt).getTime() : 0;
  const bTime = b.handover?.createdAt ? new Date(b.handover.createdAt).getTime() : 0;
  return aTime - bTime;
}

function abbreviateSurname(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Usuário';

  const parts = normalized.split(' ');
  if (parts.length === 1) return parts[0];

  const baseName = parts.slice(0, -1).join(' ');
  const surnameInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${baseName} ${surnameInitial}.`;
}

function highlightContinuityKeywords(text: string) {
  const parts = text.split(CONTINUITY_KEYWORD_REGEX);

  return parts.map((part, index) => {
    if (CONTINUITY_KEYWORD_MATCH_REGEX.test(part)) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded-sm bg-amber-100/90 px-1 font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
        >
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function MyShiftReportsPage() {
  const today = getCurrentDate();
  const [startDate, setStartDate] = useState(
    format(subDays(normalizeUTCDate(today), 90), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = useState(today);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const { data: shifts = [], isLoading } = useShifts({ startDate, endDate });

  const reports = useMemo(() => {
    return shifts.filter(hasReport).sort(sortByReportDateAsc);
  }, [shifts]);

  const selectedReport = useMemo(
    () => reports.find((shift) => shift.id === selectedShiftId) || null,
    [reports, selectedShiftId],
  );

  const selectedIndex = selectedReport
    ? reports.findIndex((shift) => shift.id === selectedReport.id)
    : -1;

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedShiftId(null);
      return;
    }

    const stillExists = selectedShiftId && reports.some((shift) => shift.id === selectedShiftId);
    if (stillExists) {
      return;
    }

    // Abre o relatório mais recente por padrão
    setSelectedShiftId(reports[reports.length - 1].id);
  }, [reports, selectedShiftId]);

  const goToPrevious = () => {
    if (selectedIndex <= 0) return;
    setSelectedShiftId(reports[selectedIndex - 1].id);
  };

  const goToNext = () => {
    if (selectedIndex < 0 || selectedIndex >= reports.length - 1) return;
    setSelectedShiftId(reports[selectedIndex + 1].id);
  };

  const selectedSnapshot = selectedReport?.handover?.activitiesSnapshot;
  const totalActivities = selectedSnapshot?.totals?.totalActivities ?? selectedSnapshot?.totalRecords ?? 0;
  const shiftMembersActivities = selectedSnapshot?.totals?.bySource?.shiftMembers ?? 0;
  const otherUsersActivities = selectedSnapshot?.totals?.bySource?.others ?? 0;
  const teamComposition = useMemo(() => {
    if (!selectedReport) return [];

    const names = selectedReport.members
      .map((member) => abbreviateSurname(member.user?.name || 'Usuário'))
      .filter(Boolean);

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [selectedReport]);

  return (
    <Page>
      <PageHeader
        title="Relatórios de Plantão"
        subtitle="Leitura cronológica de todos os relatórios de plantões encerrados para continuidade assistencial."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Relatórios de Plantão' },
        ]}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período dos Relatórios</CardTitle>
            <CardDescription>
              Ajuste o intervalo para navegar pelos relatórios de plantões encerrados.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="my-shift-reports-start-date">Data Inicial</Label>
              <Input
                id="my-shift-reports-start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="my-shift-reports-end-date">Data Final</Label>
              <Input
                id="my-shift-reports-end-date"
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum relatório de plantão encontrado no período selecionado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Relatório <span className="font-medium text-foreground">{selectedIndex + 1}</span> de{' '}
                  <span className="font-medium text-foreground">{reports.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevious}
                    disabled={selectedIndex <= 0}
                    aria-label="Relatório anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNext}
                    disabled={selectedIndex >= reports.length - 1}
                    aria-label="Próximo relatório"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedReport && selectedReport.handover && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="h-5 w-5" />
                      {selectedReport.shiftTemplate?.name || 'Turno'} •{' '}
                      {format(normalizeUTCDate(selectedReport.date), 'dd/MM/yyyy')}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <div>
                        {selectedReport.shiftTemplate?.startTime} - {selectedReport.shiftTemplate?.endTime} •{' '}
                        {selectedReport.team?.name || 'Sem equipe'}
                      </div>
                      <div className="text-xs">
                        Composição da equipe:{' '}
                        {teamComposition.length > 0 ? teamComposition.join(' • ') : 'Sem membros designados'}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatShiftStatusLabel(selectedReport.status)}</Badge>
                      <Badge variant="secondary">
                        Encerrado em {formatDateTimeSafe(selectedReport.handover.createdAt)}
                      </Badge>
                      <Badge variant="secondary">
                        Por {selectedReport.handover.handedOverByUser?.name || 'Usuário'}
                      </Badge>
                      {selectedReport.handover.receivedByUser?.name && (
                        <Badge variant="secondary">
                          Recebido por {selectedReport.handover.receivedByUser.name}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>Ocorrências do Turno</span>
                      </div>
                      <p className="text-sm p-3 bg-muted rounded-lg whitespace-pre-wrap">
                        {selectedReport.notes
                          ? highlightContinuityKeywords(selectedReport.notes)
                          : 'Sem ocorrências registradas para este plantão.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ClipboardCheck className="h-4 w-4 text-success" />
                        <span>Relatório da Passagem</span>
                      </div>
                      <div className="bg-success/10 border border-success/30 p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {highlightContinuityKeywords(selectedReport.handover.report)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Destaques automáticos: pendências, atenção, revisar, encaminhar, intercorrência e termos correlatos.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Resumo de Atividades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Atividades Totais</p>
                        <p className="text-2xl font-semibold">{totalActivities}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Equipe do Plantão</p>
                        <p className="text-2xl font-semibold">{shiftMembersActivities}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-sm text-muted-foreground">Outros Usuários</p>
                        <p className="text-2xl font-semibold">{otherUsersActivities}</p>
                      </div>
                    </div>

                    {selectedSnapshot?.byType && selectedSnapshot.byType.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Distribuição por Tipo de Registro
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedSnapshot.byType.map((item) => (
                            <Badge key={item.type} variant="outline">
                              {getShiftHistoryRecordTypeLabel(item.type)}: {item.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
