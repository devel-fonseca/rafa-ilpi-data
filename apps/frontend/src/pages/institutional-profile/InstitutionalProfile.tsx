import { ProfileForm } from './ProfileForm'
import { Page, PageHeader } from '@/design-system/components'

export default function InstitutionalProfile() {
  return (
    <Page>
      <PageHeader
        title="Perfil Institucional"
        subtitle="Gerencie as informações básicas da instituição"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Perfil Institucional' },
        ]}
      />

      <div className="space-y-4">
        <ProfileForm />
      </div>
    </Page>
  )
}
