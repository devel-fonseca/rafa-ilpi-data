import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PrescriptionCalendarItem, PrescriptionFilterType, PrescriptionStatus } from '@/types/agenda'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PrescriptionCard } from './PrescriptionCard'
import { MedicalReviewModal } from '@/pages/prescriptions/modals/MedicalReviewModal'
import { AlertTriangle, Clock, FileText, CheckCircle2, Pill } from 'lucide-react'

interface Props {
  prescriptions: PrescriptionCalendarItem[]
  selectedDate: Date
  isLoading?: boolean
  filter?: PrescriptionFilterType
  onFilterChange?: (filter: PrescriptionFilterType) => void
}

export function PrescriptionsView({
  prescriptions,
  selectedDate,
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando prescrições...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header do mês */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Título e total */}
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" />
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Prescrições com validade ou revisão neste período
            </p>
          </div>

          {/* Estatísticas em grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <span className="text-2xl font-bold text-foreground">{stats.total}</span>
              <span className="text-xs text-muted-foreground text-center">Total</span>
            </div>

            {/* Ativas */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-success/5 dark:bg-success/95 border border-success/30 dark:border-success/80">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-2xl font-bold text-success/80 dark:text-success/30">{stats.active}</span>
              </div>
              <span className="text-xs text-success/80 dark:text-success/30 text-center">Ativas</span>
            </div>

            {/* Vencendo */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-severity-warning/5 dark:bg-severity-warning/95 border border-severity-warning/30 dark:border-severity-warning/80">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-severity-warning" />
                <span className="text-2xl font-bold text-severity-warning/80 dark:text-severity-warning/30">{stats.expiring}</span>
              </div>
              <span className="text-xs text-severity-warning/80 dark:text-severity-warning/30 text-center">Vencendo</span>
            </div>

            {/* Vencidas */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-danger/5 dark:bg-danger/95 border border-danger/30 dark:border-danger/80">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-2xl font-bold text-danger/80 dark:text-danger/30">{stats.expired}</span>
              </div>
              <span className="text-xs text-danger/80 dark:text-danger/30 text-center">Vencidas</span>
            </div>

            {/* Precisam revisão */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-warning/5 dark:bg-warning/95 border border-warning/30 dark:border-warning/80">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold text-warning/80 dark:text-warning/30">{stats.needsReview}</span>
              </div>
              <span className="text-xs text-warning/80 dark:text-warning/30 text-center">Revisão</span>
            </div>

            {/* Controladas */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-medication-controlled/5 dark:bg-medication-controlled/95 border border-medication-controlled/30 dark:border-medication-controlled/90">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-medication-controlled" />
                <span className="text-2xl font-bold text-medication-controlled/80 dark:text-medication-controlled/30">{stats.controlled}</span>
              </div>
              <span className="text-xs text-medication-controlled/80 dark:text-medication-controlled/30 text-center">Controladas</span>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer transition-all"
              onClick={() => onFilterChange?.('all')}
            >
              Todas ({stats.total})
            </Badge>
            <Badge
              variant={filter === 'active' ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                filter === 'active'
                  ? 'bg-success/60 hover:bg-success/70'
                  : 'bg-success/10 text-success/90 hover:bg-success/20 border-success/30'
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
                  ? 'bg-severity-warning/60 hover:bg-severity-warning/70'
                  : 'bg-severity-warning/10 text-severity-warning/90 hover:bg-orange-200 border-severity-warning/30'
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
                  ? 'bg-danger/60 hover:bg-danger/70'
                  : 'bg-danger/10 text-danger/90 hover:bg-danger/20 border-danger/30'
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
                  ? 'bg-warning/60 hover:bg-warning/70'
                  : 'bg-warning/10 text-warning/90 hover:bg-warning/20 border-warning/30'
              }`}
              onClick={() => onFilterChange?.('needs_review')}
            >
              <FileText className="h-3 w-3 mr-1" />
              Precisam Revisão ({stats.needsReview})
            </Badge>
          </div>
        </div>
      </Card>

      {/* Grid de prescrições */}
      {prescriptions.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Pill className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma prescrição encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'all'
                  ? 'Não há prescrições com validade ou revisão neste período'
                  : `Não há prescrições ${
                      filter === 'active' ? 'ativas' :
                      filter === 'expiring' ? 'vencendo' :
                      filter === 'expired' ? 'vencidas' :
                      'precisando de revisão'
                    } neste período`
                }
              </p>
            </div>
          </div>
        </Card>
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
