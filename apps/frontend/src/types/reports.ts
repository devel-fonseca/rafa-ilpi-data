export interface DailyRecordReport {
  residentId: string
  residentName: string
  residentCpf: string
  residentCns?: string
  bedCode: string
  date: string
  time: string
  type: string
  recordedBy: string
  details: Record<string, any>
  notes?: string
  createdAt: string
  origin: 'SCHEDULED' | 'AD_HOC'
  scheduleConfigId?: string
}

export interface MedicationAdministrationReport {
  residentName: string
  residentCpf: string
  residentCns?: string
  bedCode: string
  medicationName: string
  dose: string
  route: string
  scheduledTime: string
  actualTime?: string
  wasAdministered: boolean
  administeredBy?: string
  reason?: string
  notes?: string
}

export interface VitalSignsReport {
  residentName: string
  residentCpf: string
  bedCode: string
  time: string
  bloodPressure?: string
  heartRate?: number
  temperature?: number
  oxygenSaturation?: number
  glucose?: number
}

export interface ShiftReport {
  id: string
  date: string
  name: string
  startTime: string
  endTime: string
  teamName?: string
  teamColor?: string
  status: string
}

export interface DailyReportSummary {
  date: string
  totalResidents: number
  totalDailyRecords: number
  totalMedicationsAdministered: number
  totalMedicationsScheduled: number
  hygieneCoverage: number // percentage
  feedingCoverage: number // percentage
  vitalSignsCoverage: number // percentage
  compliance: DailyComplianceMetric[]
}

export interface DailyComplianceMetric {
  recordType: string
  due: number
  done: number
  overdue: number
  adHoc: number
  compliance: number | null
}

export interface DailyReport {
  summary: DailyReportSummary
  dailyRecords: DailyRecordReport[]
  medicationAdministrations: MedicationAdministrationReport[]
  vitalSigns: VitalSignsReport[]
  shifts: ShiftReport[]
}

export interface MultiDayReport {
  startDate: string
  endDate: string
  reports: DailyReport[]
}
