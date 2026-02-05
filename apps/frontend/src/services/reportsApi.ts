import { api } from '@/services/api'
import type { MultiDayReport } from '@/types/reports'

export async function getDailyReport(
  startDate: string,
  endDate?: string,
): Promise<MultiDayReport> {
  const params = new URLSearchParams({ startDate })
  if (endDate) {
    params.set('endDate', endDate)
  }
  const response = await api.get(`/reports/daily?${params.toString()}`)
  return response.data
}
