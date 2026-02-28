import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Page, PageHeader } from '@/design-system/components'
import { TodayRecords } from './components/TodayRecords'

export default function DailyRecordsPage() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <Page>
      <PageHeader
        title="Registros de Atividades (AVDs)"
        subtitle="Registros programados para hoje"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Registros AVDs' },
        ]}
        actions={
          <Button onClick={() => setQuickAddOpen(true)}>
            Registro Avulso
          </Button>
        }
      />
      <TodayRecords
        quickAddOpen={quickAddOpen}
        onQuickAddOpenChange={setQuickAddOpen}
      />
    </Page>
  )
}
