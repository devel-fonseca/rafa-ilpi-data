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
  heartRate: number | null
  temperature: number | null
  oxygenSaturation: number | null
  bloodGlucose: number | null
  recordedAt: string | null
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
): Promise<MultiDayReport> {
  const params = new URLSearchParams({ startDate })
  if (endDate) {
    params.set('endDate', endDate)
  }
  if (shiftTemplateId && shiftTemplateId !== 'ALL') {
    params.set('shiftTemplateId', shiftTemplateId)
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
