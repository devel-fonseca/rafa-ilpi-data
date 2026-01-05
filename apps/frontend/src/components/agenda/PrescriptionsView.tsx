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
            <div className="flex flex-col items-center p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.active}</span>
              </div>
              <span className="text-xs text-green-700 dark:text-green-300 text-center">Ativas</span>
            </div>

            {/* Vencendo */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.expiring}</span>
              </div>
              <span className="text-xs text-orange-700 dark:text-orange-300 text-center">Vencendo</span>
            </div>

            {/* Vencidas */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.expired}</span>
              </div>
              <span className="text-xs text-red-700 dark:text-red-300 text-center">Vencidas</span>
            </div>

            {/* Precisam revisão */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.needsReview}</span>
              </div>
              <span className="text-xs text-yellow-700 dark:text-yellow-300 text-center">Revisão</span>
            </div>

            {/* Controladas */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-purple-600" />
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.controlled}</span>
              </div>
              <span className="text-xs text-purple-700 dark:text-purple-300 text-center">Controladas</span>
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
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
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
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300'
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
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
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
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
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
