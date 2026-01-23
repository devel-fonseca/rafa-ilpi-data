// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - CoverageReportTab (Aba de Relatório de Cobertura RDC)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Loader2, FileText, TrendingUp } from 'lucide-react';
import { getCurrentDate } from '@/utils/dateHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SeverityAlert } from '@/design-system/components';
import { CoverageStatusBadge } from '@/components/care-shifts/compliance/CoverageStatusBadge';
import { useGenerateCoverageReport } from '@/hooks/care-shifts/useRDCCalculation';
import type { ShiftWithCompliance } from '@/types/care-shifts/rdc-calculation';

export function CoverageReportTab() {
  const today = getCurrentDate();
  const yesterday = format(subDays(parseISO(today), 1), 'yyyy-MM-dd');
  const oneWeekAgo = format(subDays(parseISO(today), 7), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(oneWeekAgo);
  const [endDate, setEndDate] = useState(yesterday);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  // Validar período (máximo 60 dias)
  useEffect(() => {
    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const daysDiff = differenceInDays(end, start);

      if (daysDiff > 60) {
        setDateRangeError('O período máximo permitido é de 60 dias');
      } else if (daysDiff < 0) {
        setDateRangeError('A data inicial não pode ser posterior à data final');
      } else {
        setDateRangeError(null);
      }
    }
  }, [startDate, endDate]);

  // Buscar relatório de cobertura (desabilita se houver erro de validação)
  const { data: report, isLoading, error } = useGenerateCoverageReport({
    startDate,
    endDate,
  });

  // Agrupar plantões por data
  const shiftsByDate = (report?.shifts || []).reduce(
    (acc, shift) => {
      const dateKey = shift.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(shift);
      return acc;
    },
    {} as Record<string, ShiftWithCompliance[]>,
  );

  const sortedDates = Object.keys(shiftsByDate).sort();

  // Helper: Formatar horário do turno
  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // Helper: Formatar membros com função
  const formatMembers = (shift: ShiftWithCompliance): string => {
    if (shift.members.length === 0) {
      return '—';
    }
    return shift.members
      .map((m) => {
        const functionText = m.teamFunction ? ` (${m.teamFunction})` : '';
        return `${m.userName}${functionText}`;
      })
      .join(', ');
  };

  // Helper: Mensagem de conformidade
  const getComplianceMessage = (shift: ShiftWithCompliance): string => {
    if (shift.complianceStatus === 'compliant') {
      return 'Conforme';
    }
    if (shift.complianceStatus === 'non_compliant') {
      return `Não conformidade: 0 cuidadores designados (mínimo: ${shift.minimumRequired})`;
    }
    const deficit = shift.minimumRequired - shift.assignedCount;
    return `Déficit de ${deficit} cuidador${deficit > 1 ? 'es' : ''} (${shift.assignedCount}/${shift.minimumRequired})`;
  };

  return (
    <div className="space-y-6">
      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Cobertura RDC
          </CardTitle>
          <CardDescription>
            Visualize a conformidade dos plantões com a RDC 502/2021 por período (máximo 60 dias
            passados)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  max={yesterday}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={yesterday}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Alerta de erro de validação */}
            {dateRangeError && (
              <SeverityAlert
                severity="warning"
                title="Período inválido"
                message={dateRangeError}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total de Plantões */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Plantões</p>
                <p className="text-2xl font-bold">{report.summary.totalShifts}</p>
              </div>

              {/* Conformes */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Conformes</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-success">{report.summary.compliant}</p>
                  <Badge className="bg-success text-success-foreground">
                    {report.summary.totalShifts > 0
                      ? Math.round((report.summary.compliant / report.summary.totalShifts) * 100)
                      : 0}
                    %
                  </Badge>
                </div>
              </div>

              {/* Atenção */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Atenção</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-warning">{report.summary.attention}</p>
                  <Badge className="bg-warning text-warning-foreground">
                    {report.summary.totalShifts > 0
                      ? Math.round((report.summary.attention / report.summary.totalShifts) * 100)
                      : 0}
                    %
                  </Badge>
                </div>
              </div>

              {/* Não Conformes */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Não Conformes</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-destructive">
                    {report.summary.nonCompliant}
                  </p>
                  <Badge className="bg-destructive text-destructive-foreground">
                    {report.summary.totalShifts > 0
                      ? Math.round(
                          (report.summary.nonCompliant / report.summary.totalShifts) * 100,
                        )
                      : 0}
                    %
                  </Badge>
                </div>
              </div>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Conformidade Geral</span>
                <span className="font-semibold">
                  {report.summary.totalShifts > 0
                    ? ((report.summary.compliant / report.summary.totalShifts) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                {report.summary.totalShifts > 0 && (
                  <>
                    {/* Verde - Conforme */}
                    <div
                      className="bg-success"
                      style={{
                        width: `${(report.summary.compliant / report.summary.totalShifts) * 100}%`,
                      }}
                    />
                    {/* Amarelo - Atenção */}
                    <div
                      className="bg-warning"
                      style={{
                        width: `${(report.summary.attention / report.summary.totalShifts) * 100}%`,
                      }}
                    />
                    {/* Vermelho - Não Conforme */}
                    <div
                      className="bg-destructive"
                      style={{
                        width: `${(report.summary.nonCompliant / report.summary.totalShifts) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta de Erro */}
      {error && (
        <SeverityAlert
          severity="critical"
          title="Erro ao Carregar Relatório"
          message="Não foi possível carregar o relatório de cobertura. Tente novamente."
        />
      )}

      {/* Tabela de Plantões */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum plantão encontrado para o período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead className="w-[150px]">Turno</TableHead>
                  <TableHead className="w-[120px]">Horário</TableHead>
                  <TableHead>Equipe / Membros</TableHead>
                  <TableHead className="w-[300px]">Conformidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDates.map((dateKey) => {
                  const dateShifts = shiftsByDate[dateKey];
                  const formattedDate = format(
                    parseISO(dateKey),
                    "dd/MM/yy (EEE)",
                    { locale: ptBR },
                  );

                  return dateShifts.map((shift, index) => (
                    <TableRow key={`${dateKey}-${shift.shiftTemplate.id}`}>
                      {/* Data - rowSpan para agrupar */}
                      {index === 0 && (
                        <TableCell
                          rowSpan={dateShifts.length}
                          className="font-medium align-top capitalize"
                        >
                          {formattedDate}
                        </TableCell>
                      )}

                      {/* Turno */}
                      <TableCell className="font-medium">{shift.shiftTemplate.name}</TableCell>

                      {/* Horário */}
                      <TableCell className="text-muted-foreground">
                        {formatTimeRange(shift.shiftTemplate.startTime, shift.shiftTemplate.endTime)}
                      </TableCell>

                      {/* Equipe / Membros */}
                      <TableCell>
                        <div className="space-y-1">
                          {shift.team && (
                            <p className="font-medium text-sm">{shift.team.name}</p>
                          )}
                          <p className="text-sm text-muted-foreground">{formatMembers(shift)}</p>
                        </div>
                      </TableCell>

                      {/* Conformidade */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CoverageStatusBadge
                            assignedCount={shift.assignedCount}
                            minimumRequired={shift.minimumRequired}
                            showIcon={false}
                            showCount={false}
                          />
                          <span className="text-sm text-muted-foreground">
                            {getComplianceMessage(shift)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
