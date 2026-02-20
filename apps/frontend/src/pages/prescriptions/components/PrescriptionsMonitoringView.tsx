import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/design-system/components'
import { AlertTriangle, Clock, FileText, CheckCircle2, Pill, Loader2 } from 'lucide-react'
import { MedicalReviewModal } from '@/pages/prescriptions/modals/MedicalReviewModal'
import {
  PrescriptionMonitoringFilter,
  PrescriptionMonitoringItem,
  PrescriptionMonitoringStatus,
} from '@/types/prescription-monitoring'
import { PrescriptionMonitoringCard } from './PrescriptionMonitoringCard'

interface Props {
  prescriptions: PrescriptionMonitoringItem[]
  isLoading?: boolean
  filter?: PrescriptionMonitoringFilter
  onFilterChange?: (filter: PrescriptionMonitoringFilter) => void
}

export function PrescriptionsMonitoringView({
  prescriptions,
  isLoading,
  filter = 'all',
  onFilterChange,
}: Props) {
  const navigate = useNavigate()
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionMonitoringItem | null>(null)

  const stats = useMemo(
    () => ({
      total: prescriptions.length,
      active: prescriptions.filter((p) => p.status === PrescriptionMonitoringStatus.ACTIVE).length,
      expiring: prescriptions.filter((p) => p.status === PrescriptionMonitoringStatus.EXPIRING_SOON).length,
      expired: prescriptions.filter((p) => p.status === PrescriptionMonitoringStatus.EXPIRED).length,
      needsReview: prescriptions.filter((p) => p.status === PrescriptionMonitoringStatus.NEEDS_REVIEW).length,
      controlled: prescriptions.filter((p) => p.isControlled).length,
    }),
    [prescriptions],
  )

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((prescription) => {
      switch (filter) {
        case 'active':
          return prescription.status === PrescriptionMonitoringStatus.ACTIVE
        case 'expiring':
          return prescription.status === PrescriptionMonitoringStatus.EXPIRING_SOON
        case 'expired':
          return prescription.status === PrescriptionMonitoringStatus.EXPIRED
        case 'needs_review':
          return prescription.status === PrescriptionMonitoringStatus.NEEDS_REVIEW
        case 'controlled':
          return prescription.isControlled
        case 'all':
        default:
          return true
      }
    })
  }, [filter, prescriptions])

  const statsCards = useMemo(
    () => [
      {
        key: 'total',
        title: 'Total',
        value: stats.total,
        suffix: 'prescrições',
        footer: 'Em monitoramento',
        icon: Pill,
        iconClassName: 'text-foreground',
        iconBgClassName: 'bg-muted',
        valueClassName: 'text-foreground',
        cardClassName: 'border-border',
      },
      {
        key: 'active',
        title: 'Ativas',
        value: stats.active,
        suffix: 'ativas',
        footer: stats.active > 0 ? 'Em acompanhamento' : 'Sem prescrições ativas',
        icon: CheckCircle2,
        iconClassName: 'text-success',
        iconBgClassName: 'bg-success/10',
        valueClassName: 'text-success',
        cardClassName: 'border-success/30 dark:border-success/50',
      },
      {
        key: 'expiring',
        title: 'Vencendo',
        value: stats.expiring,
        suffix: 'em 5 dias',
        footer: stats.expiring > 0 ? 'Requerem revisão' : 'Sem vencimento próximo',
        icon: Clock,
        iconClassName: 'text-severity-warning',
        iconBgClassName: 'bg-severity-warning/10',
        valueClassName: 'text-severity-warning',
        cardClassName: 'border-severity-warning/30 dark:border-severity-warning/50',
      },
      {
        key: 'expired',
        title: 'Vencidas',
        value: stats.expired,
        suffix: 'vencidas',
        footer: stats.expired > 0 ? 'Necessitam atualização' : 'Nenhuma vencida',
        icon: AlertTriangle,
        iconClassName: 'text-danger',
        iconBgClassName: 'bg-danger/10',
        valueClassName: 'text-danger',
        cardClassName: 'border-danger/30 dark:border-danger/50',
      },
      {
        key: 'needsReview',
        title: 'Revisão',
        value: stats.needsReview,
        suffix: 'pendentes',
        footer: stats.needsReview > 0 ? 'Aguardam revisão médica' : 'Sem pendências de revisão',
        icon: FileText,
        iconClassName: 'text-warning',
        iconBgClassName: 'bg-warning/10',
        valueClassName: 'text-warning',
        cardClassName: 'border-warning/30 dark:border-warning/50',
      },
      {
        key: 'controlled',
        title: 'Controladas',
        value: stats.controlled,
        suffix: 'ativas',
        footer: stats.controlled > 0 ? 'Exigem controle especial' : 'Sem controladas ativas',
        icon: Pill,
        iconClassName: 'text-medication-controlled',
        iconBgClassName: 'bg-medication-controlled/10',
        valueClassName: 'text-medication-controlled',
        cardClassName: 'border-medication-controlled/30 dark:border-medication-controlled/50',
      },
    ],
    [stats],
  )

  const filterChips = useMemo(
    () => [
      {
        key: 'all' as PrescriptionMonitoringFilter,
        label: `Todas (${stats.total})`,
        icon: null,
        activeClassName: '',
        inactiveClassName: '',
      },
      {
        key: 'active' as PrescriptionMonitoringFilter,
        label: `Ativas (${stats.active})`,
        icon: CheckCircle2,
        activeClassName: 'bg-success text-success-foreground hover:bg-success/90',
        inactiveClassName: 'bg-success/10 text-success hover:bg-success/20 border-success/30',
      },
      {
        key: 'expiring' as PrescriptionMonitoringFilter,
        label: `Vencendo (${stats.expiring})`,
        icon: Clock,
        activeClassName: 'bg-severity-warning text-white hover:bg-severity-warning/90',
        inactiveClassName:
          'bg-severity-warning/10 text-severity-warning hover:bg-severity-warning/20 border-severity-warning/30',
      },
      {
        key: 'expired' as PrescriptionMonitoringFilter,
        label: `Vencidas (${stats.expired})`,
        icon: AlertTriangle,
        activeClassName: 'bg-danger text-danger-foreground hover:bg-danger/90',
        inactiveClassName: 'bg-danger/10 text-danger hover:bg-danger/20 border-danger/30',
      },
      {
        key: 'needs_review' as PrescriptionMonitoringFilter,
        label: `Precisam Revisão (${stats.needsReview})`,
        icon: FileText,
        activeClassName: 'bg-warning text-warning-foreground hover:bg-warning/90',
        inactiveClassName: 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/30',
      },
      {
        key: 'controlled' as PrescriptionMonitoringFilter,
        label: `Controladas (${stats.controlled})`,
        icon: Pill,
        activeClassName: 'bg-medication-controlled text-white hover:bg-medication-controlled/90',
        inactiveClassName:
          'bg-medication-controlled/10 text-medication-controlled hover:bg-medication-controlled/20 border-medication-controlled/30',
      },
    ],
    [stats],
  )

  const emptyStateDescription = useMemo(() => {
    switch (filter) {
      case 'active':
        return 'Não há prescrições ativas'
      case 'expiring':
        return 'Não há prescrições vencendo em até 5 dias'
      case 'expired':
        return 'Não há prescrições vencidas'
      case 'needs_review':
        return 'Não há prescrições com revisão pendente'
      case 'controlled':
        return 'Não há prescrições controladas ativas'
      case 'all':
      default:
        return 'Não há prescrições cadastradas'
    }
  }, [filter])

  const handlePrescriptionClick = (prescription: PrescriptionMonitoringItem) => {
    if (prescription.status === PrescriptionMonitoringStatus.NEEDS_REVIEW) {
      setSelectedPrescription(prescription)
      setIsReviewModalOpen(true)
      return
    }

    navigate(`/dashboard/prescricoes/${prescription.id}`)
  }

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false)
    setSelectedPrescription(null)
  }

  if (isLoading) {
    return (
      <EmptyState
        icon={Loader2}
        title="Carregando prescrições..."
        description="Aguarde enquanto buscamos as prescrições"
        variant="default"
        className="[&_svg]:animate-spin"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((card) => (
            <Card key={card.key} className={`hover:shadow-md transition-shadow ${card.cardClassName}`}>
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.title}
                  </h3>
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${card.iconBgClassName}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.iconClassName}`} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className={`text-3xl sm:text-4xl font-bold leading-none ${card.valueClassName}`}>
                    {card.value}
                  </p>
                  <span className="text-sm font-medium ml-1 text-muted-foreground">{card.suffix}</span>
                </div>
                <div className="mt-auto pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{card.footer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <Badge
              key={chip.key}
              variant={filter === chip.key ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                filter === chip.key ? chip.activeClassName : chip.inactiveClassName
              }`}
              onClick={() => onFilterChange?.(chip.key)}
            >
              {chip.icon ? <chip.icon className="h-3 w-3 mr-1" /> : null}
              {chip.label}
            </Badge>
          ))}
        </div>
      </div>

      {filteredPrescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Nenhuma prescrição encontrada"
          description={emptyStateDescription}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrescriptions.map((prescription) => (
            <PrescriptionMonitoringCard
              key={prescription.id}
              prescription={prescription}
              onClick={() => handlePrescriptionClick(prescription)}
            />
          ))}
        </div>
      )}

      {selectedPrescription && (
        <MedicalReviewModal
          prescriptionId={selectedPrescription.id}
          residentId={selectedPrescription.residentId}
          open={isReviewModalOpen}
          onClose={handleCloseReviewModal}
        />
      )}
    </div>
  )
}
