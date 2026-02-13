import { Card, CardContent } from '@/components/ui/card'
import type { ResidentCareSummaryReport } from '@/services/reportsApi'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getRecordTypeLabel } from '@/utils/recordTypeLabels'

interface ResidentCareSummaryReportViewProps {
  report: ResidentCareSummaryReport
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-'
  return formatDateOnlySafe(dateString)
}

function formatDateTime(dateTime?: string | null): string {
  if (!dateTime) return '-'
  return formatDateTimeSafe(dateTime)
}

function formatNumber(value: number | null, decimals: number = 1): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' • ')
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface GroupedRoutineSchedule {
  recordType: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek: number | null
  dayOfMonth: number | null
  items: Array<{
    suggestedTimes: string[]
    mealType: string | null
  }>
}

function groupRoutineSchedules(
  routines: ResidentCareSummaryReport['routineSchedules'],
): GroupedRoutineSchedule[] {
  const map = new Map<string, GroupedRoutineSchedule>()

  for (const routine of routines) {
    const key = [
      routine.recordType,
      routine.frequency,
      routine.dayOfWeek ?? 'x',
      routine.dayOfMonth ?? 'x',
    ].join('|')

    if (!map.has(key)) {
      map.set(key, {
        recordType: routine.recordType,
        frequency: routine.frequency,
        dayOfWeek: routine.dayOfWeek,
        dayOfMonth: routine.dayOfMonth,
        items: [],
      })
    }

    map.get(key)!.items.push({
      suggestedTimes: [...routine.suggestedTimes].sort((a, b) => a.localeCompare(b)),
      mealType: routine.mealType,
    })
  }

  return Array.from(map.values()).sort((a, b) => {
    const frequencyOrder = { DAILY: 0, WEEKLY: 1, MONTHLY: 2 }
    const byFrequency = frequencyOrder[a.frequency] - frequencyOrder[b.frequency]
    if (byFrequency !== 0) return byFrequency

    const aTime = a.items[0]?.suggestedTimes[0] || '99:99'
    const bTime = b.items[0]?.suggestedTimes[0] || '99:99'
    return aTime.localeCompare(bTime)
  })
}

export function ResidentCareSummaryReportView({ report }: ResidentCareSummaryReportViewProps) {
  const { resident } = report

  const residentIdentityLine = joinParts([
    resident.cns ? `CNS ${resident.cns}` : null,
    resident.cpf ? `CPF ${resident.cpf}` : null,
  ])

  const admissionLine = joinParts([
    `Admitido em ${formatDate(resident.admissionDate)}`,
    resident.bedCode ? `Leito ${resident.bedCode}` : null,
  ])

  const legalGuardianLine = report.legalGuardian
    ? joinParts([
        report.legalGuardian.name,
        report.legalGuardian.phone,
        report.legalGuardian.email,
        report.legalGuardian.relationship,
      ])
    : 'Não informado'

  const emergencyLines = report.emergencyContacts.length > 0
    ? report.emergencyContacts.map((contact) =>
        joinParts([contact.name, contact.phone, contact.relationship]),
      )
    : ['Não informado']

  const healthInsuranceLine = report.healthInsurances.length > 0
    ? report.healthInsurances
        .map((insurance) => joinParts([insurance.name, insurance.planNumber ? `Nº ${insurance.planNumber}` : null]))
        .join(' | ')
    : 'Não informado'

  const anthropometryLine = report.anthropometry
    ? joinParts([
        report.anthropometry.height !== null ? `Altura ${formatNumber(report.anthropometry.height, 2)} m` : null,
        report.anthropometry.weight !== null ? `Peso ${formatNumber(report.anthropometry.weight, 1)} kg` : null,
        report.anthropometry.bmi !== null ? `IMC ${formatNumber(report.anthropometry.bmi, 1)}` : null,
        report.anthropometry.recordedAt ? `Registro ${formatDateTime(report.anthropometry.recordedAt)}` : null,
      ]) || 'Não informado'
    : 'Não informado'

  const vitalSignsLine = report.vitalSigns
    ? joinParts([
        report.vitalSigns.systolicPressure !== null && report.vitalSigns.diastolicPressure !== null
          ? `PA ${report.vitalSigns.systolicPressure}/${report.vitalSigns.diastolicPressure}`
          : null,
        report.vitalSigns.heartRate !== null ? `FC ${report.vitalSigns.heartRate} bpm` : null,
        report.vitalSigns.temperature !== null ? `Temp ${formatNumber(report.vitalSigns.temperature, 1)}°C` : null,
        report.vitalSigns.oxygenSaturation !== null ? `SpO₂ ${report.vitalSigns.oxygenSaturation}%` : null,
        report.vitalSigns.bloodGlucose !== null ? `Glicemia ${report.vitalSigns.bloodGlucose} mg/dL` : null,
        report.vitalSigns.recordedAt ? `Registro ${formatDateTime(report.vitalSigns.recordedAt)}` : null,
      ]) || 'Não informado'
    : 'Não informado'

  const anthropometryValues = report.anthropometry
    ? {
        height: report.anthropometry.height !== null ? `${formatNumber(report.anthropometry.height, 2)} m` : '-',
        weight: report.anthropometry.weight !== null ? `${formatNumber(report.anthropometry.weight, 1)} kg` : '-',
        bmi: report.anthropometry.bmi !== null ? formatNumber(report.anthropometry.bmi, 1) : '-',
        recordedAt: report.anthropometry.recordedAt ? formatDateTime(report.anthropometry.recordedAt) : '-',
      }
    : {
        height: '-',
        weight: '-',
        bmi: '-',
        recordedAt: anthropometryLine || '-',
      }

  const vitalSignsValues = report.vitalSigns
    ? {
        bloodPressure:
          report.vitalSigns.systolicPressure !== null &&
          report.vitalSigns.diastolicPressure !== null
            ? `${report.vitalSigns.systolicPressure}/${report.vitalSigns.diastolicPressure}`
            : '-',
        heartRate: report.vitalSigns.heartRate !== null ? `${report.vitalSigns.heartRate} bpm` : '-',
        temperature: report.vitalSigns.temperature !== null ? `${formatNumber(report.vitalSigns.temperature, 1)}°C` : '-',
        oxygenSaturation: report.vitalSigns.oxygenSaturation !== null ? `${report.vitalSigns.oxygenSaturation}%` : '-',
        bloodGlucose: report.vitalSigns.bloodGlucose !== null ? `${report.vitalSigns.bloodGlucose} mg/dL` : '-',
        recordedAt: report.vitalSigns.recordedAt ? formatDateTime(report.vitalSigns.recordedAt) : '-',
      }
    : {
        bloodPressure: '-',
        heartRate: '-',
        temperature: '-',
        oxygenSaturation: '-',
        bloodGlucose: '-',
        recordedAt: vitalSignsLine || '-',
      }

  const dependencyLine = report.dependencyAssessment
    ? joinParts([
        report.dependencyAssessment.level,
        `Data da Avaliação ${formatDate(report.dependencyAssessment.assessmentDate)}`,
      ])
    : 'Não informado'

  const chronicConditionsLines = report.chronicConditions.length > 0
    ? report.chronicConditions.map((condition) =>
        joinParts([condition.name, condition.details || 'Sem detalhes adicionais']),
      )
    : ['Não informado']

  const allergiesLines = report.allergies.length > 0
    ? report.allergies.map((allergy) =>
        joinParts([
          allergy.allergen,
          allergy.severity,
          allergy.reaction ? `Reação: ${allergy.reaction}` : null,
        ]),
      )
    : ['Não informado']

  const dietaryRestrictionsLines = report.dietaryRestrictions.length > 0
    ? report.dietaryRestrictions.map((restriction) =>
        joinParts([restriction.restriction, restriction.type, restriction.notes]),
      )
    : ['Não informado']

  const vaccinationsLines = report.vaccinations.length > 0
    ? report.vaccinations.flatMap((vaccination) => [
        joinParts([vaccination.vaccineName, vaccination.doseNumber]),
        joinParts([
          formatDate(vaccination.applicationDate),
          vaccination.manufacturer,
          vaccination.batchNumber ? `Lote: ${vaccination.batchNumber}` : null,
          vaccination.applicationLocation,
        ]),
      ])
    : ['Não informado']

  const medicationsLines = report.medications.length > 0
    ? report.medications.map((medication) =>
        joinParts([
          medication.name,
          medication.dosage,
          medication.route,
          medication.schedules.length > 0 ? `Horários: ${medication.schedules.join(', ')}` : null,
        ]),
      )
    : ['Não informado']

  const groupedRoutineSchedules = groupRoutineSchedules(report.routineSchedules || [])
  const routineScheduleLines = groupedRoutineSchedules.length > 0
    ? groupedRoutineSchedules.map((group) => {
        const label = getRecordTypeLabel(group.recordType).label

        let timesText = ''
        if (group.recordType === 'ALIMENTACAO') {
          timesText = group.items
            .map((item) => `${item.mealType || 'Refeição'}: ${item.suggestedTimes[0] || '-'}`)
            .join(' • ')
        } else {
          timesText = group.items.flatMap((item) => item.suggestedTimes).join(', ')
        }

        const periodParts: string[] = []
        if (group.frequency === 'WEEKLY' && group.dayOfWeek !== null) {
          periodParts.push(WEEKDAY_SHORT[group.dayOfWeek] || `Dia ${group.dayOfWeek}`)
        }
        if (group.frequency === 'MONTHLY' && group.dayOfMonth !== null) {
          periodParts.push(`Dia ${group.dayOfMonth}`)
        }

        const frequencyLabel =
          group.frequency === 'WEEKLY'
            ? 'Semanal'
            : group.frequency === 'MONTHLY'
              ? 'Mensal'
              : null

        return joinParts([
          label,
          frequencyLabel,
          periodParts.join(' • ') || null,
          timesText || null,
        ])
      })
    : ['Não informado']

  return (
    <Card>
      <CardContent className="py-8 md:px-10">
        <div className="mx-auto max-w-4xl space-y-6 text-foreground">
          <header className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight uppercase">
              Resumo Assistencial do Residente
            </h2>
            <p className="text-sm italic text-muted-foreground">
              Documento consolidado para consulta institucional - {formatDateTime(report.generatedAt)}.
            </p>
          </header>

          <hr className="border-border" />

          <section className="space-y-1 text-lg">
            <h3 className="text-3xl font-semibold">{resident.fullName}</h3>
            <p>
              Data de nascimento {formatDate(resident.birthDate)} • {resident.age} anos
            </p>
            {residentIdentityLine && <p>{residentIdentityLine}</p>}
            <p className="pt-3">{admissionLine}</p>
          </section>

          <hr className="border-border" />

          <section className="space-y-7">
            <div>
              <h4 className="text-xl font-semibold">Responsável Legal</h4>
              <p className="text-lg">{legalGuardianLine}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Contatos de Emergência</h4>
              {emergencyLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <h4 className="text-xl font-semibold">Convênios</h4>
              <p className="text-lg">{healthInsuranceLine}</p>
            </div>
          </section>

          <hr className="border-border" />

          <section className="space-y-5">
            <div>
              <h4 className="text-xl font-semibold">
                Tipo Sanguíneo <span className="font-normal">{report.bloodType?.formatted || 'Não informado'}</span>
              </h4>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Medidas Antropométricas</h4>
              <div className="mt-3 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[18%]">Altura</TableHead>
                      <TableHead className="w-[18%]">Peso</TableHead>
                      <TableHead className="w-[14%]">IMC</TableHead>
                      <TableHead className="w-[50%]">Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-[18%]">{anthropometryValues.height}</TableCell>
                      <TableCell className="w-[18%]">{anthropometryValues.weight}</TableCell>
                      <TableCell className="w-[14%]">{anthropometryValues.bmi}</TableCell>
                      <TableCell className="w-[50%]">{anthropometryValues.recordedAt}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Sinais Vitais</h4>
              <div className="mt-3 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[19%]">Pressão Arterial</TableHead>
                      <TableHead className="w-[10%]">FC</TableHead>
                      <TableHead className="w-[13%]">Temperatura</TableHead>
                      <TableHead className="w-[9%]">SpO₂</TableHead>
                      <TableHead className="w-[14%]">Glicemia</TableHead>
                      <TableHead className="w-[35%]">Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-[19%]">{vitalSignsValues.bloodPressure}</TableCell>
                      <TableCell className="w-[10%]">{vitalSignsValues.heartRate}</TableCell>
                      <TableCell className="w-[13%]">{vitalSignsValues.temperature}</TableCell>
                      <TableCell className="w-[9%]">{vitalSignsValues.oxygenSaturation}</TableCell>
                      <TableCell className="w-[14%]">{vitalSignsValues.bloodGlucose}</TableCell>
                      <TableCell className="w-[35%]">{vitalSignsValues.recordedAt}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Estado de Saúde</h4>
              <p className="text-lg whitespace-pre-wrap">
                {report.clinicalProfile?.healthStatus || 'Não informado'}
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Necessidades Especiais</h4>
              <p className="text-lg whitespace-pre-wrap">
                {report.clinicalProfile?.specialNeeds || 'Não informado'}
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Aspectos Funcionais</h4>
              {report.clinicalProfile?.independenceLevel && (
                <p className="text-lg">✓ {report.clinicalProfile.independenceLevel}</p>
              )}
              <p className="text-lg whitespace-pre-wrap">
                {report.clinicalProfile?.functionalAspects || 'Não informado'}
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Grau de dependência</h4>
              <p className="text-lg">{dependencyLine}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold">Condições Crônicas</h4>
              {chronicConditionsLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <h4 className="text-xl font-semibold">Alergias</h4>
              {allergiesLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <h4 className="text-xl font-semibold">Restrições Alimentares</h4>
              {dietaryRestrictionsLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <h4 className="text-xl font-semibold">Imunizações</h4>
              {vaccinationsLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <h4 className="text-xl font-semibold">Medicamentos em uso</h4>
              {medicationsLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>

            <div>
              <h4 className="text-xl font-semibold">Programação da Rotina</h4>
              {routineScheduleLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-lg">
                  {line}
                </p>
              ))}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
