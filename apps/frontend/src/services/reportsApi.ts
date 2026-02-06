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
