import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { residentsAPI } from '@/api/residents.api'
import { Page, PageHeader } from '@/design-system/components'
import { ResidentSelectionGrid } from '@/components/residents/ResidentSelectionGrid'
import { DailyRecordsOverviewStats } from './components/DailyRecordsOverviewStats'
import { useLatestRecordsByResidents } from '@/hooks/useDailyRecords'
import { tenantKey } from '@/lib/query-keys'

export default function ResidentSelectionPage() {
  const navigate = useNavigate()

  // Buscar lista de residentes
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery({
    queryKey: tenantKey('residents', 'daily-records-selection', 'page-1-limit-1000'),
    queryFn: () => residentsAPI.getAll({
      page: 1,
      limit: 1000,
      sortBy: 'fullName',
      sortOrder: 'asc',
    }),
  })

  // Buscar últimos registros
  const { data: latestRecords = [], isLoading: isLoadingLatest } =
    useLatestRecordsByResidents()

  const handleSelectResident = (residentId: string) => {
    navigate(`/dashboard/registros-diarios/${residentId}`)
  }

  return (
    <Page>
      <PageHeader
        title="Registros Diários"
        subtitle="Selecione um residente para visualizar ou adicionar registros"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Registros Diários' },
        ]}
      />
      <ResidentSelectionGrid
        residents={residentsData?.data || []}
        latestRecords={latestRecords}
        onSelectResident={handleSelectResident}
        isLoading={isLoadingResidents || isLoadingLatest}
        statsComponent={
          <DailyRecordsOverviewStats
            residents={residentsData?.data || []}
            latestRecords={latestRecords}
          />
        }
      />
    </Page>
  )
}
