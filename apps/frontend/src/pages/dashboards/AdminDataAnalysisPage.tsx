import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Page, PageHeader } from '@/design-system/components'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { MandatoryRecordsChart } from '@/components/admin/MandatoryRecordsChart'
import { OccupancyRateChart } from '@/components/admin/OccupancyRateChart'
import { useAdminDashboardOverview } from '@/hooks/useAdminDashboard'
import { useAdminDashboardRealtime } from '@/hooks/useAdminDashboardRealtime'

export function AdminDataAnalysisPage() {
  const navigate = useNavigate()
  useAdminDashboardRealtime()
  const { data: overview, isLoading, refetch, isFetching } = useAdminDashboardOverview()

  const residentsGrowth = overview?.residentsGrowth || []
  const medicationsHistory = overview?.medicationsHistory || []
  const recordsHistory = overview?.scheduledRecordsHistory || []
  const occupancyRate = overview?.occupancyRate

  return (
    <Page maxWidth="wide" spacing="compact">
      <PageHeader
        title="Análise de Dados"
        subtitle="Indicadores operacionais para acompanhamento assistencial e ocupação"
        backButton={{ onClick: () => navigate('/dashboard') }}
        actions={(
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResidentsGrowthChart
          data={residentsGrowth}
          isLoading={isLoading}
        />
        <OccupancyRateChart
          data={occupancyRate?.data || []}
          hasBedsConfigured={occupancyRate?.hasBedsConfigured}
          capacityDeclared={occupancyRate?.capacityDeclared}
          capacityLicensed={occupancyRate?.capacityLicensed}
          isLoading={isLoading}
        />
        <MandatoryRecordsChart
          data={recordsHistory}
          isLoading={isLoading}
        />
        <MedicationAdministrationChart
          data={medicationsHistory}
          isLoading={isLoading}
        />
      </div>
    </Page>
  )
}
