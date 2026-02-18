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
import type { InstitutionalResidentProfileReport } from '@/services/reportsApi'
import { formatDate } from '@/utils/formatters'
import { getRecordTypeLabel, isRecordType } from '@/utils/recordTypeLabels'
import { ClipboardList, Users, Activity, Stethoscope, TrendingUp } from 'lucide-react'

interface InstitutionalResidentProfileReportViewProps {
  report: InstitutionalResidentProfileReport
}

function formatRoutineType(recordType: string): string {
  if (isRecordType(recordType)) {
    return getRecordTypeLabel(recordType).label
  }
  return recordType
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMonthLabel(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value
  const [year, month] = value.split('-')
  return `${month}/${year}`
}

export function InstitutionalResidentProfileReportView({
  report,
}: InstitutionalResidentProfileReportViewProps) {
  const { summary } = report

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Resumo Executivo da Visão Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Residentes ativos</p>
              <p className="text-2xl font-semibold">{summary.totalResidents}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Média de idade</p>
              <p className="text-2xl font-semibold">{summary.averageAge} anos</p>
              <p className="text-xs text-muted-foreground">
                {summary.minAge} a {summary.maxAge}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Permanência média</p>
              <p className="text-2xl font-semibold">{summary.averageStayDays} dias</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Com responsável legal</p>
              <p className="text-2xl font-semibold">{summary.residentsWithLegalGuardian}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem leito atribuído</p>
              <p className="text-2xl font-semibold">{summary.residentsWithoutBed}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Referência: {formatDate(summary.referenceDate)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              1-2. Perfil Demográfico e Dependência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Distribuição por sexo</p>
              <div className="flex flex-wrap gap-2">
                {report.genderDistribution.map((item) => (
                  <Badge key={item.label} variant="outline">
                    {item.label}: {item.count} ({item.percentage}%)
                  </Badge>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dependência</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-center">Cuidadores (teórico)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.dependencyDistribution.map((item) => (
                    <TableRow key={item.level}>
                      <TableCell>{item.level}</TableCell>
                      <TableCell className="text-center">{item.count}</TableCell>
                      <TableCell className="text-center">{item.percentage}%</TableCell>
                      <TableCell className="text-center">{item.requiredCaregivers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5" />
              3. Perfil Clínico Assistencial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Condições crônicas</p>
                <p className="text-xl font-semibold">{report.clinicalIndicators.totalConditions}</p>
                <p className="text-xs text-muted-foreground">
                  {report.clinicalIndicators.residentsWithConditions} residentes
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Alergias</p>
                <p className="text-xl font-semibold">{report.clinicalIndicators.totalAllergies}</p>
                <p className="text-xs text-muted-foreground">
                  Graves: {report.clinicalIndicators.severeAllergies}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Restrições alimentares</p>
                <p className="text-xl font-semibold">
                  {report.clinicalIndicators.totalDietaryRestrictions}
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.clinicalIndicators.residentsWithDietaryRestrictions} residentes
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Com contraindicações</p>
                <p className="text-xl font-semibold">
                  {report.clinicalIndicators.residentsWithContraindications}
                </p>
              </div>
            </div>

            {report.topConditions.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condição mais prevalente</TableHead>
                      <TableHead className="text-center">Residentes</TableHead>
                      <TableHead className="text-center">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.topConditions.map((item) => (
                      <TableRow key={item.condition}>
                        <TableCell>{item.condition}</TableCell>
                        <TableCell className="text-center">{item.count}</TableCell>
                        <TableCell className="text-center">{item.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            6. Carga Assistencial Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Medicações ativas</p>
              <p className="text-2xl font-semibold">{report.careLoadSummary.totalActiveMedications}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Residentes com polifarmácia (&gt;=5)</p>
              <p className="text-2xl font-semibold">{report.careLoadSummary.residentsWithPolypharmacy}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Rotinas assistenciais ativas</p>
              <p className="text-2xl font-semibold">{report.careLoadSummary.totalRoutineSchedules}</p>
            </div>
          </div>

          {report.routineLoadByType.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de rotina</TableHead>
                    <TableHead className="text-center">Configurações ativas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.routineLoadByType.map((item) => (
                    <TableRow key={item.recordType}>
                      <TableCell>{formatRoutineType(item.recordType)}</TableCell>
                      <TableCell className="text-center">{item.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Fase 2. Tendências ({report.trendMonths} meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Residentes</TableHead>
                  <TableHead className="text-center">Grau I</TableHead>
                  <TableHead className="text-center">Grau II</TableHead>
                  <TableHead className="text-center">Grau III</TableHead>
                  <TableHead className="text-center">Não informado</TableHead>
                  <TableHead className="text-center">Cuidadores (teórico)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.dependencyTrend.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{formatMonthLabel(row.month)}</TableCell>
                    <TableCell className="text-center">{row.totalResidents}</TableCell>
                    <TableCell className="text-center">{row.grauI}</TableCell>
                    <TableCell className="text-center">{row.grauII}</TableCell>
                    <TableCell className="text-center">{row.grauIII}</TableCell>
                    <TableCell className="text-center">{row.notInformed}</TableCell>
                    <TableCell className="text-center">{row.requiredCaregivers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Registros diários</TableHead>
                  <TableHead className="text-center">Administrações de medicação</TableHead>
                  <TableHead className="text-center">Registros por residente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.careLoadTrend.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell>{formatMonthLabel(row.month)}</TableCell>
                    <TableCell className="text-center">{row.dailyRecordsCount}</TableCell>
                    <TableCell className="text-center">{row.medicationAdministrationsCount}</TableCell>
                    <TableCell className="text-center">{row.recordsPerResident}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Residentes (visão atual)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Residente</TableHead>
                  <TableHead>Leito</TableHead>
                  <TableHead>Dependência</TableHead>
                  <TableHead className="text-center">Auxílio</TableHead>
                  <TableHead className="text-center">C/A/R</TableHead>
                  <TableHead className="text-center">Meds</TableHead>
                  <TableHead className="text-center">Rotinas</TableHead>
                  <TableHead className="text-center">Contraindicações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.residents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">{resident.fullName}</TableCell>
                    <TableCell>{resident.bedCode || '-'}</TableCell>
                    <TableCell>
                      <div>{resident.dependencyLevel}</div>
                      <div className="text-xs text-muted-foreground">
                        {resident.dependencyAssessmentDate
                          ? `Aval.: ${formatDate(resident.dependencyAssessmentDate)}`
                          : 'Sem avaliação'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{resident.mobilityAid ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-center">
                      {resident.conditionsCount}/{resident.allergiesCount}/{resident.dietaryRestrictionsCount}
                    </TableCell>
                    <TableCell className="text-center">{resident.activeMedicationsCount}</TableCell>
                    <TableCell className="text-center">{resident.routineSchedulesCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={resident.hasContraindications ? 'destructive' : 'outline'}>
                        {resident.hasContraindications ? 'Sim' : 'Não'}
                      </Badge>
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
