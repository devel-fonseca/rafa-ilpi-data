import { api } from '@/services/api'
import type { DailyReport } from '@/types/reports'

export async function getDailyReport(date: string): Promise<DailyReport> {
  const response = await api.get(`/reports/daily/${date}`)
  return response.data
}
