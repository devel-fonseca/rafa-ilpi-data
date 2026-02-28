import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { residentsAPI } from '@/api/residents.api'
import { Button } from '@/components/ui/button'
import { Page, PageHeader } from '@/design-system/components'
import { ResidentSelectionGrid } from '@/components/residents/ResidentSelectionGrid'
import { DailyRecordsOverviewStats } from './components/DailyRecordsOverviewStats'
import { useLatestRecordsByResidents } from '@/hooks/useDailyRecords'
import { tenantKey } from '@/lib/query-keys'

export default function ResidentSelectionPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [clinicalOccurrenceResidentIds, setClinicalOccurrenceResidentIds] = useState<string[]>([])

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

  const handleQuickFilter = (
    filter: 'withoutRecord24h' | 'withClinicalOccurrences48h',
    residentIds?: string[]
  ) => {
    setStatusFilter(filter)
    if (filter === 'withClinicalOccurrences48h') {
      setClinicalOccurrenceResidentIds(Array.isArray(residentIds) ? residentIds : [])
    } else {
      setClinicalOccurrenceResidentIds([])
    }
  }

  const handleStatusFilterChange = (filter: string) => {
    setStatusFilter(filter)
    if (filter !== 'withClinicalOccurrences48h') {
      setClinicalOccurrenceResidentIds([])
    }
  }

  const handleClinicalOccurrenceResidentIdsChange = (residentIds: string[]) => {
    setClinicalOccurrenceResidentIds((current) => {
      if (current.length === residentIds.length && current.every((id, index) => id === residentIds[index])) {
        return current
      }
      return residentIds
    })
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
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard/registros-diarios/registros')}>
              Registros Programados
            </Button>
            <Button onClick={() => navigate('/dashboard/registros-diarios/registros', { state: { quickAdd: true } })}>
              <Plus className="h-4 w-4" />
              Registro Avulso
            </Button>
          </div>
        }
      />
      <ResidentSelectionGrid
        residents={residentsData?.data || []}
        latestRecords={latestRecords}
        onSelectResident={handleSelectResident}
        isLoading={isLoadingResidents || isLoadingLatest}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        clinicalOccurrenceResidentIds={clinicalOccurrenceResidentIds}
        statsComponent={
          <DailyRecordsOverviewStats
            residents={residentsData?.data || []}
            latestRecords={latestRecords}
            onApplyQuickFilter={handleQuickFilter}
            onClinicalOccurrenceResidentIdsChange={handleClinicalOccurrenceResidentIdsChange}
            activeQuickFilter={
              statusFilter === 'withoutRecord24h' || statusFilter === 'withClinicalOccurrences48h'
                ? statusFilter
                : null
            }
          />
        }
      />
    </Page>
  )
}
