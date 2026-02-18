import { useMemo, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { CalendarClock, History, Loader2, Users } from 'lucide-react';
import { Page, PageHeader } from '@/design-system/components';
import { getCurrentDate, normalizeUTCDate, extractDateOnly } from '@/utils/dateHelpers';
import { formatShiftStatusLabel } from '@/utils/shiftStatus';
import { ShiftStatus, type Shift } from '@/types/care-shifts/care-shifts';
import { useMyShiftsWorkspace } from '@/hooks/care-shifts/useShifts';
import { ShiftDetailsModal } from '@/components/care-shifts/shifts/ShiftDetailsModal';
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

function isHistoricShift(shift: Shift, today: string) {
  if (
    shift.status === ShiftStatus.COMPLETED ||
    shift.status === ShiftStatus.ADMIN_CLOSED ||
    shift.status === ShiftStatus.CANCELLED
  ) {
    return true;
  }

  return extractDateOnly(shift.date) < today;
}

export default function MyShiftsPage() {
  const today = getCurrentDate();
  const [startDate, setStartDate] = useState(
    format(subDays(normalizeUTCDate(today), 30), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = useState(
    format(addDays(normalizeUTCDate(today), 30), 'yyyy-MM-dd'),
  );
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading } = useMyShiftsWorkspace({ startDate, endDate });
  const teamMemberships = data?.teamMemberships || [];

  const { activeOrUpcoming, history } = useMemo(() => {
    const sourceShifts = data?.shifts || [];
    const activeOrUpcomingList: Shift[] = [];
    const historyList: Shift[] = [];

    for (const shift of sourceShifts) {
      if (isHistoricShift(shift, today)) {
        historyList.push(shift);
      } else {
        activeOrUpcomingList.push(shift);
      }
    }

    return {
      activeOrUpcoming: activeOrUpcomingList,
      history: historyList,
    };
  }, [data?.shifts, today]);

  const openShiftDetails = (shift: Shift) => {
    setSelectedShift(shift);
    setDetailsOpen(true);
  };

  const renderShiftRow = (shift: Shift) => (
    <tr key={shift.id} className="border-b last:border-b-0">
      <td className="py-2 pr-3 text-sm">{format(normalizeUTCDate(shift.date), 'dd/MM/yyyy')}</td>
      <td className="py-2 pr-3 text-sm">
        <div className="font-medium">{shift.shiftTemplate?.name || 'Turno'}</div>
        <div className="text-muted-foreground">
          {shift.shiftTemplate?.startTime} - {shift.shiftTemplate?.endTime}
        </div>
      </td>
      <td className="py-2 pr-3 text-sm">{shift.team?.name || 'Sem equipe'}</td>
      <td className="py-2 pr-3 text-sm">
        <Badge variant="outline">{formatShiftStatusLabel(shift.status)}</Badge>
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openShiftDetails(shift)}>
            Ver
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <Page>
      <PageHeader
        title="Meus Plantões"
        subtitle="Visualize os plantões em que você está ou esteve designado e seu histórico de equipes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Meus Plantões' },
        ]}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período</CardTitle>
            <CardDescription>Filtre os dados exibidos nesta página.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="my-shifts-start-date">Data Inicial</Label>
              <Input
                id="my-shifts-start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="my-shifts-end-date">Data Final</Label>
              <Input
                id="my-shifts-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" />
                  Plantões Atuais e Próximos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeOrUpcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum plantão atual/próximo para o período selecionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2 pr-3">Data</th>
                          <th className="py-2 pr-3">Turno</th>
                          <th className="py-2 pr-3">Equipe</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>{activeOrUpcoming.map(renderShiftRow)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Plantões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum plantão histórico para o período selecionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2 pr-3">Data</th>
                          <th className="py-2 pr-3">Turno</th>
                          <th className="py-2 pr-3">Equipe</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>{history.map(renderShiftRow)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Minhas Equipes
                </CardTitle>
                <CardDescription>Equipes atuais e vínculos anteriores.</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMemberships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum vínculo de equipe encontrado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg p-3"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">
                            {membership.team?.name || 'Equipe removida'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Função: {membership.role}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Desde {format(new Date(membership.addedAt), 'dd/MM/yyyy HH:mm')}
                            {membership.removedAt
                              ? ` • Até ${format(new Date(membership.removedAt), 'dd/MM/yyyy HH:mm')}`
                              : ''}
                          </div>
                        </div>
                        <Badge variant={membership.isCurrent ? 'default' : 'secondary'}>
                          {membership.isCurrent ? 'Atual' : 'Histórico'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ShiftDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        shift={selectedShift}
      />
    </Page>
  );
}
