import { api } from '@/services/api'

// ==================== TYPES ====================

// Blood Type
export type BloodType =
  | 'A_POSITIVO'
  | 'A_NEGATIVO'
  | 'B_POSITIVO'
  | 'B_NEGATIVO'
  | 'AB_POSITIVO'
  | 'AB_NEGATIVO'
  | 'O_POSITIVO'
  | 'O_NEGATIVO'
  | 'NAO_INFORMADO'

export interface ResidentBloodType {
  id: string
  tenantId: string
  residentId: string
  bloodType: BloodType
  source: string | null
  confirmedAt: string | null
  versionNumber: number
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string | null
  creator?: {
    id: string
    name: string
    email: string
  }
  updater?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateBloodTypeDto {
  residentId: string
  bloodType: BloodType
  source?: string
  confirmedAt?: string
}

export interface UpdateBloodTypeDto {
  bloodType?: BloodType
  source?: string
  confirmedAt?: string
  changeReason: string
}

// Anthropometry
export interface ResidentAnthropometry {
  id: string
  tenantId: string
  residentId: string
  height: number
  weight: number
  bmi: number
  measurementDate: string
  notes: string | null
  versionNumber: number
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string | null
  creator?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateAnthropometryDto {
  residentId: string
  height: number
  weight: number
  measurementDate: string
  notes?: string
}

export interface UpdateAnthropometryDto {
  height?: number
  weight?: number
  measurementDate?: string
  notes?: string
  changeReason: string
}

// Dependency Assessment
export type DependencyLevel = 'GRAU_I' | 'GRAU_II' | 'GRAU_III'

export interface ResidentDependencyAssessment {
  id: string
  tenantId: string
  residentId: string
  dependencyLevel: DependencyLevel
  effectiveDate: string
  endDate: string | null
  assessmentInstrument: string
  assessmentScore: number | null
  assessedBy: string
  mobilityAid: boolean
  mobilityAidDescription: string | null
  notes: string | null
  versionNumber: number
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string | null
  assessor?: {
    id: string
    name: string
    email: string
  }
  creator?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateDependencyAssessmentDto {
  residentId: string
  dependencyLevel: DependencyLevel
  effectiveDate: string
  assessmentInstrument: string
  assessmentScore?: number
  mobilityAid: boolean
  mobilityAidDescription?: string
  notes?: string
}

export interface UpdateDependencyAssessmentDto {
  dependencyLevel?: DependencyLevel
  endDate?: string
  assessmentInstrument?: string
  assessmentScore?: number
  mobilityAid?: boolean
  mobilityAidDescription?: string
  notes?: string
  changeReason: string
}

// Health Summary
export interface ResidentHealthSummary {
  bloodType: ResidentBloodType | null
  latestAnthropometry: ResidentAnthropometry | null
  currentAssessment: ResidentDependencyAssessment | null
}

// ==================== API FUNCTIONS ====================

// Summary
export async function getResidentHealthSummary(
  residentId: string
): Promise<ResidentHealthSummary> {
  const response = await api.get(`/resident-health/${residentId}/summary`)
  return response.data
}

// Blood Type
export async function getBloodType(
  residentId: string
): Promise<ResidentBloodType | null> {
  const response = await api.get(`/resident-health/${residentId}/blood-type`)
  return response.data
}

export async function createBloodType(
  data: CreateBloodTypeDto
): Promise<ResidentBloodType> {
  const response = await api.post('/resident-health/blood-type', data)
  return response.data
}

export async function updateBloodType(
  id: string,
  data: UpdateBloodTypeDto
): Promise<ResidentBloodType> {
  const response = await api.patch(`/resident-health/blood-type/${id}`, data)
  return response.data
}

// Anthropometry
export async function getAnthropometryRecords(
  residentId: string,
  limit = 10
): Promise<ResidentAnthropometry[]> {
  const response = await api.get(
    `/resident-health/${residentId}/anthropometry`,
    { params: { limit } }
  )
  return response.data
}

export async function getLatestAnthropometry(
  residentId: string
): Promise<ResidentAnthropometry | null> {
  const response = await api.get(
    `/resident-health/${residentId}/anthropometry/latest`
  )
  return response.data
}

export async function createAnthropometry(
  data: CreateAnthropometryDto
): Promise<ResidentAnthropometry> {
  const response = await api.post('/resident-health/anthropometry', data)
  return response.data
}

export async function updateAnthropometry(
  id: string,
  data: UpdateAnthropometryDto
): Promise<ResidentAnthropometry> {
  const response = await api.patch(`/resident-health/anthropometry/${id}`, data)
  return response.data
}

export async function deleteAnthropometry(
  id: string,
  deleteReason: string
): Promise<{ message: string }> {
  const response = await api.delete(`/resident-health/anthropometry/${id}`, {
    data: { deleteReason },
  })
  return response.data
}

// Dependency Assessment
export async function getDependencyAssessments(
  residentId: string
): Promise<ResidentDependencyAssessment[]> {
  const response = await api.get(
    `/resident-health/${residentId}/dependency-assessments`
  )
  return response.data
}

export async function getCurrentDependencyAssessment(
  residentId: string
): Promise<ResidentDependencyAssessment | null> {
  const response = await api.get(
    `/resident-health/${residentId}/dependency-assessments/current`
  )
  return response.data
}

export async function createDependencyAssessment(
  data: CreateDependencyAssessmentDto
): Promise<ResidentDependencyAssessment> {
  const response = await api.post(
    '/resident-health/dependency-assessments',
    data
  )
  return response.data
}

export async function updateDependencyAssessment(
  id: string,
  data: UpdateDependencyAssessmentDto
): Promise<ResidentDependencyAssessment> {
  const response = await api.patch(
    `/resident-health/dependency-assessments/${id}`,
    data
  )
  return response.data
}

// ==================== HELPERS ====================

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POSITIVO: 'A+',
  A_NEGATIVO: 'A-',
  B_POSITIVO: 'B+',
  B_NEGATIVO: 'B-',
  AB_POSITIVO: 'AB+',
  AB_NEGATIVO: 'AB-',
  O_POSITIVO: 'O+',
  O_NEGATIVO: 'O-',
  NAO_INFORMADO: 'Não informado',
}

export const DEPENDENCY_LEVEL_LABELS: Record<DependencyLevel, string> = {
  GRAU_I: 'Grau I - Independente',
  GRAU_II: 'Grau II - Parcialmente Dependente',
  GRAU_III: 'Grau III - Totalmente Dependente',
}

export const DEPENDENCY_LEVEL_SHORT_LABELS: Record<DependencyLevel, string> = {
  GRAU_I: 'Grau I',
  GRAU_II: 'Grau II',
  GRAU_III: 'Grau III',
}

export const DEPENDENCY_LEVEL_COLORS: Record<DependencyLevel, string> = {
  GRAU_I: 'green',
  GRAU_II: 'yellow',
  GRAU_III: 'red',
}

export function getBMIClassification(bmi: number): {
  label: string
  color: string
} {
  if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'yellow' }
  if (bmi < 25) return { label: 'Normal', color: 'green' }
  if (bmi < 30) return { label: 'Sobrepeso', color: 'yellow' }
  if (bmi < 35) return { label: 'Obesidade I', color: 'orange' }
  if (bmi < 40) return { label: 'Obesidade II', color: 'red' }
  return { label: 'Obesidade III', color: 'red' }
}
