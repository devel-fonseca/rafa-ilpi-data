import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PrescriptionCalendarItem, PrescriptionFilterType, PrescriptionStatus } from '@/types/agenda'
import { PrescriptionCard } from './PrescriptionCard'
import { MedicalReviewModal } from '@/pages/prescriptions/modals/MedicalReviewModal'
import { EmptyState } from '@/design-system/components'
import { AlertTriangle, Clock, FileText, CheckCircle2, Pill, Loader2 } from 'lucide-react'

interface Props {
  prescriptions: PrescriptionCalendarItem[]
  selectedDate: Date
  isLoading?: boolean
  filter?: PrescriptionFilterType
  onFilterChange?: (filter: PrescriptionFilterType) => void
}

export function PrescriptionsView({
  prescriptions,
  isLoading,
  filter = 'all',
  onFilterChange
}: Props) {
  // Estado do modal de revisão médica
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionCalendarItem | null>(null)

  // Estatísticas do mês
  const stats = useMemo(() => {
    return {
      total: prescriptions.length,
      active: prescriptions.filter(p => p.status === PrescriptionStatus.ACTIVE).length,
      expiring: prescriptions.filter(p => p.status === PrescriptionStatus.EXPIRING_SOON).length,
      expired: prescriptions.filter(p => p.status === PrescriptionStatus.EXPIRED).length,
      needsReview: prescriptions.filter(p => p.status === PrescriptionStatus.NEEDS_REVIEW).length,
      controlled: prescriptions.filter(p => p.isControlled).length,
    }
  }, [prescriptions])

  const handlePrescriptionClick = (prescription: PrescriptionCalendarItem) => {
    if (prescription.status === PrescriptionStatus.NEEDS_REVIEW) {
      // Se precisa revisão, abre o modal de revisão médica
      setSelectedPrescription(prescription)
      setIsReviewModalOpen(true)
    } else {
      // Caso contrário, navega para os detalhes (futura implementação)
      console.log('Navegar para detalhes da prescrição:', prescription.id)
    }
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
      {/* Header - Estatísticas e Filtros */}
      <div className="space-y-4">
        {/* Estatísticas em grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total */}
          <Card className="p-4 border border-border hover:shadow-sm transition-shadow">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground">{stats.total}</span>
              <span className="text-xs text-muted-foreground text-center">Total</span>
            </div>
          </Card>

          {/* Ativas */}
          <Card className="p-4 bg-success/5 dark:bg-success/10 border border-success/30 dark:border-success/50 hover:shadow-sm transition-shadow">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-2xl font-bold text-success">{stats.active}</span>
              </div>
              <span className="text-xs text-success text-center">Ativas</span>
            </div>
          </Card>

          {/* Vencendo */}
          <Card className="p-4 bg-severity-warning/5 dark:bg-severity-warning/10 border border-severity-warning/30 dark:border-severity-warning/50 hover:shadow-sm transition-shadow">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-severity-warning" />
                <span className="text-2xl font-bold text-severity-warning">{stats.expiring}</span>
              </div>
              <span className="text-xs text-severity-warning text-center">Vencendo</span>
            </div>
          </Card>

          {/* Vencidas */}
          <Card className="p-4 bg-danger/5 dark:bg-danger/10 border border-danger/30 dark:border-danger/50 hover:shadow-sm transition-shadow">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-2xl font-bold text-danger">{stats.expired}</span>
              </div>
              <span className="text-xs text-danger text-center">Vencidas</span>
            </div>
          </Card>

          {/* Precisam revisão */}
          <Card className="p-4 bg-warning/5 dark:bg-warning/10 border border-warning/30 dark:border-warning/50 hover:shadow-sm transition-shadow">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold text-warning">{stats.needsReview}</span>
              </div>
              <span className="text-xs text-warning text-center">Revisão</span>
            </div>
          </Card>

          {/* Controladas */}
          <Card className="p-4 bg-medication-controlled/5 dark:bg-medication-controlled/10 border border-medication-controlled/30 dark:border-medication-controlled/50 hover:shadow-sm transition-shadow">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Pill className="h-4 w-4 text-medication-controlled" />
                <span className="text-2xl font-bold text-medication-controlled">{stats.controlled}</span>
              </div>
              <span className="text-xs text-medication-controlled text-center">Controladas</span>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => onFilterChange?.('all')}
          >
            Todas ({stats.total})
          </Badge>
          <Badge
            variant={filter === 'active' ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              filter === 'active'
                ? 'bg-success text-success-foreground hover:bg-success/90'
                : 'bg-success/10 text-success hover:bg-success/20 border-success/30'
            }`}
            onClick={() => onFilterChange?.('active')}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativas ({stats.active})
          </Badge>
          <Badge
            variant={filter === 'expiring' ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              filter === 'expiring'
                ? 'bg-severity-warning text-white hover:bg-severity-warning/90'
                : 'bg-severity-warning/10 text-severity-warning hover:bg-severity-warning/20 border-severity-warning/30'
            }`}
            onClick={() => onFilterChange?.('expiring')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Vencendo ({stats.expiring})
          </Badge>
          <Badge
            variant={filter === 'expired' ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              filter === 'expired'
                ? 'bg-danger text-danger-foreground hover:bg-danger/90'
                : 'bg-danger/10 text-danger hover:bg-danger/20 border-danger/30'
            }`}
            onClick={() => onFilterChange?.('expired')}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Vencidas ({stats.expired})
          </Badge>
          <Badge
            variant={filter === 'needs_review' ? 'default' : 'outline'}
            className={`cursor-pointer transition-all ${
              filter === 'needs_review'
                ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                : 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/30'
            }`}
            onClick={() => onFilterChange?.('needs_review')}
          >
            <FileText className="h-3 w-3 mr-1" />
            Precisam Revisão ({stats.needsReview})
          </Badge>
        </div>
      </div>

      {/* Grid de prescrições */}
      {prescriptions.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Nenhuma prescrição encontrada"
          description={
            filter === 'all'
              ? 'Não há prescrições cadastradas'
              : `Não há prescrições ${
                  filter === 'active' ? 'ativas' :
                  filter === 'expiring' ? 'vencendo' :
                  filter === 'expired' ? 'vencidas' :
                  'precisando de revisão'
                }`
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prescriptions.map(prescription => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              onClick={() => handlePrescriptionClick(prescription)}
            />
          ))}
        </div>
      )}

      {/* Modal de Revisão Médica */}
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
