import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

interface ComplianceStats {
  activeResidents: number
  medications: {
    scheduled: number
    administered: number
    total: number
  }
  scheduledRecords?: {
    expected: number
    completed: number
  }
  // Backward compatibility
  mandatoryRecords: {
    expected: number
    completed: number
  }
}

export function useAdminCompliance() {
  return useQuery<ComplianceStats>({
    queryKey: tenantKey('admin-compliance'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/daily-summary')
      return response.data
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
    staleTime: 30000, // Considera dados frescos por 30 segundos
  })
}
