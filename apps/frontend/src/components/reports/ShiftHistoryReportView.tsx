import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { formatShiftStatusLabel } from '@/utils/shiftStatus'
import { getShiftHistoryRecordTypeLabel } from '@/utils/shiftHistoryRecordTypeLabel'
import type { ShiftHistoryReport } from '@/services/reportsApi'
import { Users, ClipboardList, History, Clock } from 'lucide-react'

interface ShiftHistoryReportViewProps {
  report: ShiftHistoryReport
}

function EmptyStateRow() {
  return (
    <TableRow>
      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
        Nenhuma atividade registrada.
      </TableCell>
    </TableRow>
  )
}

export function ShiftHistoryReportView({ report }: ShiftHistoryReportViewProps) {
  const { summary, shiftMembersActivities, otherUsersActivities } = report

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <History className="h-4 w-4" />
                <span className="text-sm font-medium">Atividades Totais</span>
              </div>
              <p className="text-3xl font-bold">{summary.totalActivities}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Equipe do Plantão</span>
              </div>
              <p className="text-3xl font-bold">{summary.shiftMembersActivities}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Outros Usuários</span>
              </div>
              <p className="text-3xl font-bold">{summary.otherUsersActivities}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Encerrado em</span>
              </div>
              <p className="text-base font-semibold">{formatDateTimeSafe(summary.closedAt)}</p>
              <p className="text-xs text-muted-foreground mt-1">por {summary.closedBy}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Plantão</div>
              <div className="font-semibold">
                {summary.shiftName} ({summary.startTime} - {summary.endTime})
              </div>
              <div className="text-sm text-muted-foreground">
                Data: {formatDateOnlySafe(summary.date)}
              </div>
              <div className="text-sm text-muted-foreground">
                Equipe: {summary.teamName || 'Sem equipe'}
              </div>
              <Badge variant={summary.handoverType === 'ADMIN_CLOSED' ? 'outline' : 'secondary'}>
                {formatShiftStatusLabel(summary.status)}
              </Badge>
            </div>

            <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Passagem / Encerramento</div>
              <p className="text-sm whitespace-pre-wrap">{summary.report}</p>
              {summary.receivedBy && (
                <p className="text-xs text-muted-foreground">
                  Recebido por: {summary.receivedBy}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Atividades da Equipe do Plantão
            </span>
            <Badge variant="outline">{shiftMembersActivities.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora Registrada</TableHead>
                  <TableHead>Tipo do Registro</TableHead>
                  <TableHead>Residente</TableHead>
                  <TableHead>Usuário que Registrou</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftMembersActivities.length === 0 && <EmptyStateRow />}
                {shiftMembersActivities.map((activity, index) => (
                  <TableRow key={`${activity.recordType}-${activity.registeredTime}-${index}`}>
                    <TableCell className="font-mono text-xs">{activity.registeredTime}</TableCell>
                    <TableCell>
                      <div>{getShiftHistoryRecordTypeLabel(activity.recordType)}</div>
                      {activity.recordDetails && (
                        <div className="text-xs text-muted-foreground">{activity.recordDetails}</div>
                      )}
                    </TableCell>
                    <TableCell>{activity.residentName}</TableCell>
                    <TableCell>{activity.recordedBy}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {activity.timestamp ? formatDateTimeSafe(activity.timestamp) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Atividades Registradas por Outros Usuários
            </span>
            <Badge variant="outline">{otherUsersActivities.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora Registrada</TableHead>
                  <TableHead>Tipo do Registro</TableHead>
                  <TableHead>Residente</TableHead>
                  <TableHead>Usuário que Registrou</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherUsersActivities.length === 0 && <EmptyStateRow />}
                {otherUsersActivities.map((activity, index) => (
                  <TableRow key={`${activity.recordType}-${activity.registeredTime}-${index}`}>
                    <TableCell className="font-mono text-xs">{activity.registeredTime}</TableCell>
                    <TableCell>
                      <div>{getShiftHistoryRecordTypeLabel(activity.recordType)}</div>
                      {activity.recordDetails && (
                        <div className="text-xs text-muted-foreground">{activity.recordDetails}</div>
                      )}
                    </TableCell>
                    <TableCell>{activity.residentName}</TableCell>
                    <TableCell>{activity.recordedBy}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {activity.timestamp ? formatDateTimeSafe(activity.timestamp) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
