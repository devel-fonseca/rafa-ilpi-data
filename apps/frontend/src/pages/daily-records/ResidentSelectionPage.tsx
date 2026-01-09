import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Page, PageHeader } from '@/design-system/components'
import { ResidentSelectionGrid } from '@/components/residents/ResidentSelectionGrid'
import { DailyRecordsOverviewStats } from './components/DailyRecordsOverviewStats'
import { useLatestRecordsByResidents } from '@/hooks/useDailyRecords'

export default function ResidentSelectionPage() {
  const navigate = useNavigate()

  // Buscar lista de residentes
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      const response = await api.get('/residents')
      return response.data
    },
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
