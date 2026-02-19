import { useEffect, useState } from 'react'
import { AlertCard } from './AlertCard'
import { ResidentAlertModal } from './ResidentAlertModal'
import type { ResidentAlert } from '@/hooks/useResidentAlerts'

interface AlertGridProps {
  alerts: ResidentAlert[]
  initialOpenFilter?: string | null
  onAutoOpenHandled?: () => void
}

export function AlertGrid({ alerts, initialOpenFilter, onAutoOpenHandled }: AlertGridProps) {
  const [selectedAlert, setSelectedAlert] = useState<ResidentAlert | null>(null)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  const handleAlertClick = (alert: ResidentAlert) => {
    setSelectedAlert(alert)
  }

  const handleCloseModal = () => {
    setSelectedAlert(null)
  }

  useEffect(() => {
    if (!initialOpenFilter || hasAutoOpened || !alerts.length || selectedAlert) return

    const alertToOpen = alerts.find((alert) => alert.action.filter === initialOpenFilter)
    if (!alertToOpen) {
      setHasAutoOpened(true)
      onAutoOpenHandled?.()
      return
    }

    setSelectedAlert(alertToOpen)
    setHasAutoOpened(true)
    onAutoOpenHandled?.()
  }, [
    alerts,
    hasAutoOpened,
    initialOpenFilter,
    onAutoOpenHandled,
    selectedAlert,
  ])

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">✅ Nenhum alerta no momento. Tudo está em ordem!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert, index) => (
          <AlertCard
            key={index}
            type={alert.type}
            title={alert.title}
            count={alert.count}
            description={alert.description}
            onClick={() => handleAlertClick(alert)}
          />
        ))}
      </div>

      {selectedAlert && (
        <ResidentAlertModal
          isOpen={true}
          onClose={handleCloseModal}
          title={selectedAlert.title}
          description={selectedAlert.description}
          type={selectedAlert.type}
          residents={selectedAlert.residents}
          alertFilter={selectedAlert.action.filter}
          actionType={
            selectedAlert.action.filter === 'without-bed' ? 'assign-bed'
            : selectedAlert.action.filter === 'without-guardian' ? 'assign-guardian'
            : selectedAlert.action.filter === 'without-emergency-contact' ? 'assign-emergency-contact'
            : selectedAlert.action.filter === 'without-recent-anthropometry' ? 'register-anthropometry'
            : selectedAlert.action.filter === 'without-photo' ? 'upload-photo'
            : undefined
          }
        />
      )}
    </>
  )
}
