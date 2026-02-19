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
          <div className="mt-3 flex flex-wrap gap-2">
            {report.ageRangeDistribution.map((range) => (
              <Badge key={range.range} variant="outline">
                {range.range}: {range.count} ({range.percentage}%)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              1. Perfil Demográfico e Dependência
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Índice de complexidade</p>
                <p className="text-xl font-semibold">{report.complexityIndicators.complexityIndex}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Com auxílio de mobilidade</p>
                <p className="text-xl font-semibold">
                  {report.complexityIndicators.residentsWithMobilityAid} ({report.complexityIndicators.mobilityAidPercentage}%)
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Cuidadores mínimos por turno</p>
                <p className="text-xl font-semibold">{report.complexityIndicators.requiredCaregiversPerShift}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5" />
              2. Perfil Clínico Assistencial
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
                <p className="text-xs text-muted-foreground">
                  Total: {report.clinicalIndicators.contraindicationsTotal}
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severidade de alergias</TableHead>
                      <TableHead className="text-center">Qtd.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.allergiesBySeverity.map((item) => (
                      <TableRow key={item.severity}>
                        <TableCell>{item.severity}</TableCell>
                        <TableCell className="text-center">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de restrição alimentar</TableHead>
                      <TableHead className="text-center">Qtd.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.dietaryRestrictionsByType.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-center">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            3. Estado Nutricional e Funcional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IMC</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.nutritionalFunctionalIndicators.bmiDistribution.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-center">{item.count}</TableCell>
                    <TableCell className="text-center">{item.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Sem antropometria recente ({report.nutritionalFunctionalIndicators.anthropometryRecencyDays} dias)
              </p>
              <p className="text-2xl font-semibold">
                {report.nutritionalFunctionalIndicators.percentWithoutRecentAnthropometry}%
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem avaliação de dependência vigente</p>
              <p className="text-2xl font-semibold">
                {report.nutritionalFunctionalIndicators.percentWithoutDependencyAssessment}%
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem perfil clínico preenchido</p>
              <p className="text-2xl font-semibold">
                {report.nutritionalFunctionalIndicators.percentWithoutClinicalProfile}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            4. Tratamento e Rotina Assistencial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Medicações ativas</p>
              <p className="text-2xl font-semibold">{report.careLoadSummary.totalActiveMedications}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Com prescrição ativa</p>
              <p className="text-2xl font-semibold">
                {report.treatmentRoutineIndicators.residentsWithActivePrescription}
              </p>
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

          {report.treatmentRoutineIndicators.routineCoverageByType.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cobertura de rotina (tipo)</TableHead>
                    <TableHead className="text-center">Devido</TableHead>
                    <TableHead className="text-center">Realizado</TableHead>
                    <TableHead className="text-center">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.treatmentRoutineIndicators.routineCoverageByType.map((item) => (
                    <TableRow key={item.recordType}>
                      <TableCell>{formatRoutineType(item.recordType)}</TableCell>
                      <TableCell className="text-center">{item.due}</TableCell>
                      <TableCell className="text-center">{item.done}</TableCell>
                      <TableCell className="text-center">{item.compliance}%</TableCell>
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
            <ClipboardList className="h-5 w-5" />
            5. Governança e Qualidade de Cadastro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem responsável legal</p>
              <p className="text-2xl font-semibold">
                {report.governanceQualityIndicators.residentsWithoutLegalGuardian}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem contato de emergência</p>
              <p className="text-2xl font-semibold">
                {report.governanceQualityIndicators.residentsWithoutEmergencyContact}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem leito definido</p>
              <p className="text-2xl font-semibold">
                {report.governanceQualityIndicators.residentsWithoutBed}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sem contrato vigente</p>
              <p className="text-2xl font-semibold">
                {report.governanceQualityIndicators.residentsWithoutActiveContract}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Com campos críticos incompletos</p>
              <p className="text-2xl font-semibold">
                {report.governanceQualityIndicators.residentsWithCriticalIncompleteFields}
              </p>
            </div>
          </div>

          {report.criticalIncompleteResidents.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Residente</TableHead>
                    <TableHead>Leito</TableHead>
                    <TableHead className="text-center">Campos faltantes</TableHead>
                    <TableHead>Itens críticos incompletos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.criticalIncompleteResidents.map((item) => (
                    <TableRow key={item.residentId}>
                      <TableCell className="font-medium">{item.residentName}</TableCell>
                      <TableCell>{item.bedCode || '-'}</TableCell>
                      <TableCell className="text-center">{item.missingFieldsCount}</TableCell>
                      <TableCell>{item.missingFields.join(' • ')}</TableCell>
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
            6. Tendências ({report.trendMonths} meses)
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
          <CardTitle className="text-lg">7. Residentes (visão atual)</CardTitle>
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
