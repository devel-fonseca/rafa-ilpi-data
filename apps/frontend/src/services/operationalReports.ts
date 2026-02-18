import type { MultiDayReport, DailyComplianceMetric } from '@/types/reports'
import type { ReportType, RecordTypeFilter } from '@/types/reportsHub'

interface OperationalReportFilterOptions {
  reportType?: ReportType
  recordType?: RecordTypeFilter
}

function getDailyTypesForFilter(recordType?: RecordTypeFilter): string[] | null {
  if (!recordType || recordType === 'ALL') return null

  if (recordType === 'ALIMENTACAO') {
    return ['ALIMENTACAO', 'HIDRATACAO']
  }

  if (recordType === 'MEDICACAO') {
    return []
  }

  if (recordType === 'IMUNIZACOES') {
    return []
  }

  return [recordType]
}

function getComplianceForTypes(
  metrics: DailyComplianceMetric[] | undefined,
  types: string[],
): number {
  const entries = (metrics || []).filter((metric) => types.includes(metric.recordType))
  const due = entries.reduce((sum, metric) => sum + metric.due, 0)
  const done = entries.reduce((sum, metric) => sum + metric.done, 0)
  return due > 0 ? Math.round((done / due) * 100) : 0
}

export function applyOperationalReportFilter(
  report: MultiDayReport,
  options: OperationalReportFilterOptions,
): MultiDayReport {
  if (options.reportType !== 'BY_RECORD_TYPE') {
    return report
  }

  if (!options.recordType || options.recordType === 'ALL') {
    return report
  }

  const dailyTypes = getDailyTypesForFilter(options.recordType)
  const isMedicationOnly = options.recordType === 'MEDICACAO'
  const isImmunizationsOnly = options.recordType === 'IMUNIZACOES'
  const isScheduledEventsOnly = options.recordType === 'AGENDAMENTOS_PONTUAIS'

  const reports = report.reports.map((dayReport) => {
    const filteredDailyRecords = isMedicationOnly || isImmunizationsOnly || isScheduledEventsOnly
      ? []
      : dailyTypes
        ? dayReport.dailyRecords.filter((record) => dailyTypes.includes(record.type))
        : dayReport.dailyRecords

    const filteredMedicationAdministrations = isMedicationOnly
      ? dayReport.medicationAdministrations
      : []

    const filteredImmunizations = isImmunizationsOnly
      ? dayReport.immunizations || []
      : []

    const filteredScheduledEvents = isScheduledEventsOnly
      ? dayReport.scheduledEvents || []
      : []

    const filteredCompliance = isMedicationOnly || isImmunizationsOnly || isScheduledEventsOnly
      ? []
      : dailyTypes
        ? (dayReport.summary.compliance || []).filter((metric) =>
            dailyTypes.includes(metric.recordType),
          )
        : dayReport.summary.compliance

    const residentIds = new Set<string>()
    filteredDailyRecords.forEach((record) => residentIds.add(record.residentId))
    filteredMedicationAdministrations.forEach((medication) =>
      residentIds.add(`${medication.residentCpf}-${medication.residentName}`),
    )
    filteredScheduledEvents.forEach((event) =>
      residentIds.add(`${event.residentCpf}-${event.residentName}`),
    )
    filteredImmunizations.forEach((item) =>
      residentIds.add(`${item.residentCpf}-${item.residentName}`),
    )

    return {
      ...dayReport,
      dailyRecords: filteredDailyRecords,
      medicationAdministrations: filteredMedicationAdministrations,
      immunizations: filteredImmunizations,
      scheduledEvents: filteredScheduledEvents,
      summary: {
        ...dayReport.summary,
        totalResidents: residentIds.size,
        totalDailyRecords: isImmunizationsOnly
          ? filteredImmunizations.length
          : filteredDailyRecords.length,
        totalMedicationsAdministered: isMedicationOnly
          ? filteredMedicationAdministrations.filter((medication) => medication.wasAdministered)
              .length
          : 0,
        totalMedicationsScheduled: isMedicationOnly
          ? filteredMedicationAdministrations.length
          : 0,
        hygieneCoverage: getComplianceForTypes(filteredCompliance, ['HIGIENE']),
        feedingCoverage: getComplianceForTypes(filteredCompliance, ['ALIMENTACAO', 'HIDRATACAO']),
        vitalSignsCoverage: getComplianceForTypes(filteredCompliance, ['MONITORAMENTO']),
        compliance: filteredCompliance,
      },
    }
  })

  return {
    ...report,
    reports,
  }
}
