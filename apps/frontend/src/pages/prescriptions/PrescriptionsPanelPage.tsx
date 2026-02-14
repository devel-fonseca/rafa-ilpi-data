import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { PrescriptionsView } from '@/components/agenda/PrescriptionsView'
import { usePrescriptionsForCalendar } from '@/hooks/usePrescriptions'
import { PrescriptionFilterType } from '@/types/agenda'
import { usePermissions } from '@/hooks/usePermissions'
import { Page, PageHeader, AccessDenied } from '@/design-system/components'

export default function PrescriptionsPanelPage() {
  const [prescriptionFilter, setPrescriptionFilter] = useState<PrescriptionFilterType>('all')

  // Verificar permissão
  const { canViewPrescriptionCalendar } = usePermissions()
  const canSeePrescriptions = canViewPrescriptionCalendar()

  // Usar mês atual fixo
  const today = useMemo(() => new Date(), [])
  const monthStart = useMemo(() => format(startOfMonth(today), 'yyyy-MM-dd'), [today])
  const monthEnd = useMemo(() => format(endOfMonth(today), 'yyyy-MM-dd'), [today])

  // Buscar prescrições do mês atual
  const {
    data: prescriptions = [],
    isLoading,
  } = usePrescriptionsForCalendar(
    monthStart,
    monthEnd,
    undefined, // Sem filtro de residente (visão geral)
    prescriptionFilter,
    canSeePrescriptions
  )

  // Verificação de permissão
  if (!canSeePrescriptions) {
    return (
      <Page>
        <PageHeader
          title="Painel de Prescrições"
          subtitle="Visualize prescrições por validade e status de revisão"
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
        title="Painel de Prescrições"
        subtitle="Visualize prescrições por validade e status de revisão"
      />

      {/* Conteúdo */}
      <PrescriptionsView
        prescriptions={prescriptions}
        selectedDate={today}
        isLoading={isLoading}
        filter={prescriptionFilter}
        onFilterChange={setPrescriptionFilter}
      />
    </Page>
  )
}
