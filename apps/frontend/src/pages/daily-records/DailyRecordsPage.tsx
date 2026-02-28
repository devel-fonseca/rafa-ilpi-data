import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { TodayRecords } from './components/TodayRecords'

export default function DailyRecordsPage() {
  const location = useLocation()
  const [quickAddOpen, setQuickAddOpen] = useState(
    (location.state as { quickAdd?: boolean })?.quickAdd === true,
  )

  return (
    <Page>
      <PageHeader
        title="Registros Programados"
        subtitle="Registros programados para hoje"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Registros Diários', href: '/dashboard/registros-diarios' },
          { label: 'Programados' },
        ]}
      />
      <TodayRecords
        quickAddOpen={quickAddOpen}
        onQuickAddOpenChange={setQuickAddOpen}
      />
    </Page>
  )
}
