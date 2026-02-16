import { Page, PageHeader } from '@/design-system/components'
import { TodayActions } from './components/TodayActions'

export default function MedicationAdminPage() {
  return (
    <Page>
      <PageHeader
        title="Administração de Medicamentos"
        subtitle="Medicações programadas para hoje"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Administração de Medicamentos' },
        ]}
      />
      <TodayActions />
    </Page>
  )
}
