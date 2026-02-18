import { api } from '@/services/api'
import type { MultiDayReport } from '@/types/reports'

// ============================================================================
// Types para Relatório de Lista de Residentes
// ============================================================================

export interface ResidentListItem {
  id: string
  fullName: string
  age: number
  birthDate: string
  admissionDate: string
  stayDays: number
  dependencyLevel: string | null
  bedCode: string | null
  conditions: string[]
}

export interface DependencyCount {
  level: string
  count: number
  percentage: number
}

export interface ResidentsListSummary {
  generatedAt: string
  totalResidents: number
  byDependencyLevel: DependencyCount[]
  averageAge: number
  minAge: number
  maxAge: number
  averageStayDays: number
}

export interface ResidentsListReport {
  summary: ResidentsListSummary
  residents: ResidentListItem[]
}

// ============================================================================
// Types para Relatório Institucional de Perfil dos Residentes
// ============================================================================

export interface InstitutionalResidentProfileSummary {
  generatedAt: string
  referenceDate: string
  totalResidents: number
  averageAge: number
  minAge: number
  maxAge: number
  averageStayDays: number
  residentsWithLegalGuardian: number
  residentsWithoutBed: number
}

export interface InstitutionalResidentGenderDistribution {
  label: string
  count: number
  percentage: number
}

export interface InstitutionalResidentDependencyDistribution {
  level: string
  count: number
  percentage: number
  requiredCaregivers: number
}

export interface InstitutionalResidentClinicalIndicators {
  residentsWithConditions: number
  totalConditions: number
  residentsWithAllergies: number
  totalAllergies: number
  severeAllergies: number
  residentsWithDietaryRestrictions: number
  totalDietaryRestrictions: number
  residentsWithContraindications: number
}

export interface InstitutionalResidentTopCondition {
  condition: string
  count: number
  percentage: number
}

export interface InstitutionalResidentCareLoadSummary {
  totalActiveMedications: number
  residentsWithPolypharmacy: number
  totalRoutineSchedules: number
}

export interface InstitutionalResidentRoutineLoadByType {
  recordType: string
  count: number
}

export interface InstitutionalResidentProfileRow {
  id: string
  fullName: string
  age: number
  bedCode: string | null
  dependencyLevel: string
  mobilityAid: boolean
  dependencyAssessmentDate: string | null
  conditionsCount: number
  allergiesCount: number
  dietaryRestrictionsCount: number
  activeMedicationsCount: number
  routineSchedulesCount: number
  hasContraindications: boolean
}

export interface InstitutionalResidentProfileReport {
  summary: InstitutionalResidentProfileSummary
  genderDistribution: InstitutionalResidentGenderDistribution[]
  dependencyDistribution: InstitutionalResidentDependencyDistribution[]
  clinicalIndicators: InstitutionalResidentClinicalIndicators
  topConditions: InstitutionalResidentTopCondition[]
  careLoadSummary: InstitutionalResidentCareLoadSummary
  routineLoadByType: InstitutionalResidentRoutineLoadByType[]
  trendMonths: number
  dependencyTrend: Array<{
    month: string
    totalResidents: number
    grauI: number
    grauII: number
    grauIII: number
    notInformed: number
    requiredCaregivers: number
  }>
  careLoadTrend: Array<{
    month: string
    dailyRecordsCount: number
    medicationAdministrationsCount: number
    recordsPerResident: number
  }>
  residents: InstitutionalResidentProfileRow[]
}

// ============================================================================
// Types para Resumo Assistencial do Residente
// ============================================================================

export interface ResidentCareSummaryResidentBasicInfo {
  id: string
  fullName: string
  birthDate: string
  age: number
  cpf: string | null
  cns: string | null
  photoUrl: string | null
  admissionDate: string
  bedCode: string | null
}

export interface ResidentCareSummaryLegalGuardian {
  name: string
  phone: string | null
  email: string | null
  relationship: string
  guardianshipType: string | null
}

export interface ResidentCareSummaryEmergencyContact {
  name: string
  phone: string
  relationship: string | null
}

export interface ResidentCareSummaryHealthInsurance {
  name: string
  planNumber: string | null
}

export interface ResidentCareSummaryBloodType {
  bloodType: string
  rhFactor: string
  formatted: string
}

export interface ResidentCareSummaryAnthropometry {
  height: number | null
  weight: number | null
  bmi: number | null
  recordedAt: string | null
}

export interface ResidentCareSummaryVitalSigns {
  systolicPressure: number | null
  diastolicPressure: number | null
  bloodPressureRecordedAt: string | null
  heartRate: number | null
  heartRateRecordedAt: string | null
  temperature: number | null
  temperatureRecordedAt: string | null
  oxygenSaturation: number | null
  oxygenSaturationRecordedAt: string | null
  bloodGlucose: number | null
  bloodGlucoseRecordedAt: string | null
}

export interface ResidentCareSummaryClinicalProfile {
  healthStatus: string | null
  specialNeeds: string | null
  functionalAspects: string | null
  independenceLevel: string | null
}

export interface ResidentCareSummaryDependencyAssessment {
  level: string
  description: string
  assessmentDate: string
}

export interface ResidentCareSummaryChronicCondition {
  name: string
  details: string | null
  contraindications: string | null
}

export interface ResidentCareSummaryAllergy {
  allergen: string
  severity: string
  reaction: string | null
  contraindications: string | null
}

export interface ResidentCareSummaryDietaryRestriction {
  restriction: string
  type: string
  notes: string | null
  contraindications: string | null
}

export interface ResidentCareSummaryVaccination {
  vaccineName: string
  doseNumber: string | null
  applicationDate: string
  manufacturer: string | null
  batchNumber: string | null
  applicationLocation: string | null
}

export interface ResidentCareSummaryMedication {
  name: string
  dosage: string | null
  route: string | null
  frequency: string | null
  schedules: string[]
}

export interface ResidentCareSummaryRoutineSchedule {
  recordType: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek: number | null
  dayOfMonth: number | null
  suggestedTimes: string[]
  mealType: string | null
}

export interface ResidentCareSummaryReport {
  generatedAt: string
  resident: ResidentCareSummaryResidentBasicInfo
  legalGuardian: ResidentCareSummaryLegalGuardian | null
  emergencyContacts: ResidentCareSummaryEmergencyContact[]
  healthInsurances: ResidentCareSummaryHealthInsurance[]
  bloodType: ResidentCareSummaryBloodType | null
  anthropometry: ResidentCareSummaryAnthropometry | null
  vitalSigns: ResidentCareSummaryVitalSigns | null
  clinicalProfile: ResidentCareSummaryClinicalProfile | null
  dependencyAssessment: ResidentCareSummaryDependencyAssessment | null
  chronicConditions: ResidentCareSummaryChronicCondition[]
  allergies: ResidentCareSummaryAllergy[]
  dietaryRestrictions: ResidentCareSummaryDietaryRestriction[]
  vaccinations: ResidentCareSummaryVaccination[]
  medications: ResidentCareSummaryMedication[]
  routineSchedules: ResidentCareSummaryRoutineSchedule[]
}

// ============================================================================
// Types para Relatório de Histórico de Plantão
// ============================================================================

export interface ShiftHistoryActivityRow {
  registeredTime: string
  recordType: string
  residentName: string
  recordDetails?: string | null
  recordedBy: string
  timestamp: string | null
}

export interface ShiftHistoryReportSummary {
  shiftId: string
  date: string
  shiftName: string
  startTime: string
  endTime: string
  teamName: string | null
  status: string
  closedAt: string
  closedBy: string
  handoverType: 'COMPLETED' | 'ADMIN_CLOSED'
  receivedBy: string | null
  report: string
  totalActivities: number
  shiftMembersActivities: number
  otherUsersActivities: number
}

export interface ShiftHistoryReport {
  summary: ShiftHistoryReportSummary
  shiftMembersActivities: ShiftHistoryActivityRow[]
  otherUsersActivities: ShiftHistoryActivityRow[]
}

// ============================================================================
// API Functions
// ============================================================================

export async function getDailyReport(
  startDate: string,
  endDate?: string,
  shiftTemplateId?: string,
  options?: {
    periodType?: 'DAY' | 'MONTH'
    yearMonth?: string
    reportType?: 'DAILY' | 'BY_SHIFT' | 'BY_RECORD_TYPE'
  },
): Promise<MultiDayReport> {
  const params = new URLSearchParams({ startDate })
  if (endDate) {
    params.set('endDate', endDate)
  }
  if (shiftTemplateId && shiftTemplateId !== 'ALL') {
    params.set('shiftTemplateId', shiftTemplateId)
  }
  if (options?.periodType) {
    params.set('periodType', options.periodType)
  }
  if (options?.yearMonth) {
    params.set('yearMonth', options.yearMonth)
  }
  if (options?.reportType) {
    params.set('reportType', options.reportType)
  }
  const response = await api.get(`/reports/daily?${params.toString()}`)
  return response.data
}

export async function getResidentsListReport(
  status: string = 'Ativo',
): Promise<ResidentsListReport> {
  const params = new URLSearchParams({ status })
  const response = await api.get(`/reports/residents?${params.toString()}`)
  return response.data
}

export async function getInstitutionalResidentProfileReport(
  asOfDate?: string,
  trendMonths?: number,
): Promise<InstitutionalResidentProfileReport> {
  const params = new URLSearchParams()
  if (asOfDate) {
    params.set('asOfDate', asOfDate)
  }
  if (trendMonths) {
    params.set('trendMonths', String(trendMonths))
  }
  const query = params.toString()
  const response = await api.get(
    `/reports/institutional/resident-profile${query ? `?${query}` : ''}`,
  )
  return response.data
}

export async function getResidentCareSummaryReport(
  residentId: string,
): Promise<ResidentCareSummaryReport> {
  const response = await api.get(`/reports/resident-care-summary/${residentId}`)
  return response.data
}

export async function getShiftHistoryReport(
  shiftId: string,
): Promise<ShiftHistoryReport> {
  const response = await api.get(`/reports/shift-history/${shiftId}`)
  return response.data
}
