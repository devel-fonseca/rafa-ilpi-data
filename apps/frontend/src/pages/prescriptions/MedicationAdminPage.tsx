import { useState } from 'react'
import { Pill } from 'lucide-react'
import { Page, PageHeader } from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import type { SOSMedication } from '@/api/prescriptions.api'
import { TodayActions } from './components/TodayActions'
import { SelectSOSResidentModal } from './components/SelectSOSResidentModal'
import { AdministerSOSModal } from './components/AdministerSOSModal'

export default function MedicationAdminPage() {
  const [isSelectSOSModalOpen, setIsSelectSOSModalOpen] = useState(false)
  const [isAdministerSOSModalOpen, setIsAdministerSOSModalOpen] = useState(false)
  const [selectedSOSMedication, setSelectedSOSMedication] = useState<SOSMedication | null>(null)

  const { hasPermission } = usePermissions()
  const canAdministerMedications = hasPermission(PermissionType.ADMINISTER_MEDICATIONS)

  const handleOpenSOSFlow = () => {
    if (!canAdministerMedications) {
      toast.error('Sem permissão', {
        description: 'Você não possui autorização para administrar medicações. O Responsável Técnico pode conceder essa permissão.',
        duration: 4000,
      })
      return
    }

    setIsSelectSOSModalOpen(true)
  }

  const handleSelectSOSMedication = (sosMedication: SOSMedication) => {
    setSelectedSOSMedication(sosMedication)
    setIsSelectSOSModalOpen(false)
    setIsAdministerSOSModalOpen(true)
  }

  const handleCloseAdministerSOSModal = () => {
    setIsAdministerSOSModalOpen(false)
    setSelectedSOSMedication(null)
  }

  return (
    <Page>
      <PageHeader
        title="Administração de Medicamentos"
        subtitle="Medicações programadas para hoje"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Administração de Medicamentos' },
        ]}
        actions={
          <Button onClick={handleOpenSOSFlow}>
            <Pill className="h-4 w-4" />
            Administrar SOS
          </Button>
        }
      />
      <TodayActions />

      <SelectSOSResidentModal
        open={isSelectSOSModalOpen}
        onOpenChange={setIsSelectSOSModalOpen}
        onSelectSOSMedication={handleSelectSOSMedication}
      />

      <AdministerSOSModal
        open={isAdministerSOSModalOpen}
        onClose={handleCloseAdministerSOSModal}
        sosMedication={selectedSOSMedication}
      />
    </Page>
  )
}
