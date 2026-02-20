import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrescriptionsMonitoringView } from './components/PrescriptionsMonitoringView'
import { usePrescriptionsForMonitoring } from '@/hooks/usePrescriptions'
import { PrescriptionMonitoringFilter } from '@/types/prescription-monitoring'
import { usePermissions } from '@/hooks/usePermissions'
import { Page, PageHeader, AccessDenied } from '@/design-system/components'

export default function PrescriptionsPanelPage() {
  const navigate = useNavigate()
  const [prescriptionFilter, setPrescriptionFilter] = useState<PrescriptionMonitoringFilter>('all')

  // Verificar permissão
  const { canViewPrescriptionCalendar } = usePermissions()
  const canSeePrescriptions = canViewPrescriptionCalendar()

  // Buscar prescrições de monitoramento (sem dependência de agenda/calendário)
  const {
    data: prescriptions = [],
    isLoading,
  } = usePrescriptionsForMonitoring(undefined, canSeePrescriptions)

  // Verificação de permissão
  if (!canSeePrescriptions) {
    return (
      <Page>
        <PageHeader
          title="Monitoramento de Prescrições"
          subtitle="Acompanhe prescrições por status de validade e revisão"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Prescrições', href: '/dashboard/prescricoes' },
            { label: 'Monitoramento' },
          ]}
          backButton={{ onClick: () => navigate('/dashboard/prescricoes') }}
        />
        <AccessDenied
          message="Esta funcionalidade é restrita a Responsáveis Técnicos e Enfermeiros"
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Monitoramento de Prescrições"
        subtitle="Acompanhe prescrições por status de validade e revisão"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Prescrições', href: '/dashboard/prescricoes' },
          { label: 'Monitoramento' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard/prescricoes') }}
      />

      {/* Conteúdo */}
      <PrescriptionsMonitoringView
        prescriptions={prescriptions}
        isLoading={isLoading}
        filter={prescriptionFilter}
        onFilterChange={setPrescriptionFilter}
      />
    </Page>
  )
}
