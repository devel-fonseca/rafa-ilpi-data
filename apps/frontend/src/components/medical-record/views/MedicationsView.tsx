// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - MedicationsView (Administrações de Medicamentos)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Calendar, ChevronLeft, ChevronRight, Edit, Eye, History, PenLine, Pill, Trash2 } from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { formatDateLongSafe, formatDateTimeSafe, getCurrentDate } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'
import { MedicationsCalendarModal } from '../MedicationsCalendarModal'
import type { MedicationsViewProps, MedicationAdministration } from '../types'

// ========== HELPERS ==========

function getIndicationLabel(indication: string): string {
  const labels: Record<string, string> = {
    DOR: 'Dor',
    FEBRE: 'Febre',
    ANSIEDADE: 'Ansiedade',
    AGITACAO: 'Agitação',
    NAUSEA: 'Náusea/Vômito',
    INSONIA: 'Insônia',
    OUTRO: 'Outro',
  }
  return labels[indication] || indication
}

function formatMedicationTitle(name?: string, concentration?: string): string {
  if (!name) return 'Medicamento não especificado'
  if (!concentration) return name

  const normalizedName = name.toLowerCase()
  const normalizedConcentration = concentration.toLowerCase()

  // Evita duplicação quando backend já envia nome com concentração (ex.: "Metformina 850mg")
  if (normalizedName.includes(normalizedConcentration)) return name

  return `${name} ${concentration}`
}

function isAdministrationEdited(administration: MedicationAdministration): boolean {
  if (!administration.createdAt || !administration.updatedAt) return false
  return new Date(administration.updatedAt).getTime() > new Date(administration.createdAt).getTime()
}

// ========== COMPONENT ==========

export function MedicationsView({
  residentId,
  residentName,
  viewDate,
  onDateChange,
  onViewAdministration,
  onEditAdministration,
  onHistoryAdministration,
  onDeleteAdministration,
}: MedicationsViewProps) {
  const { hasPermission } = usePermissions()
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const isViewingToday = viewDate === today

  // Permissões para ações nas administrações
  const canEditAdministrations = hasPermission(PermissionType.UPDATE_MEDICATION_ADMINISTRATIONS)
  const canDeleteAdministrations = hasPermission(PermissionType.DELETE_MEDICATION_ADMINISTRATIONS)
  const canViewHistory = hasPermission(PermissionType.VIEW_AUDIT_LOGS)

  // Funções de navegação entre datas
  const goToPreviousDay = () => {
    const currentDate = parseISO(viewDate + 'T12:00:00')
    const previousDay = subDays(currentDate, 1)
    onDateChange(format(previousDay, 'yyyy-MM-dd'))
  }

  const goToNextDay = () => {
    const currentDate = parseISO(viewDate + 'T12:00:00')
    const nextDay = addDays(currentDate, 1)
    onDateChange(format(nextDay, 'yyyy-MM-dd'))
  }

  const goToToday = () => {
    onDateChange(getCurrentDate())
  }

  // Buscar administrações de medicamentos da data selecionada
  const {
    data: administrationsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: tenantKey('medication-administrations', 'resident-profile', residentId, viewDate),
    queryFn: async () => {
      const response = await api.get(
        `/prescriptions/medication-administrations/resident/${residentId}/date/${viewDate}`
      )
      return response.data
    },
    enabled: !!residentId && residentId !== 'new',
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const administrations: MedicationAdministration[] = Array.isArray(administrationsData)
    ? administrationsData
    : []
  const isLoadingAdministrations = isLoading || (isFetching && !administrationsData)

  return (
    <div className="space-y-4">
      {/* Header com data e navegação */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousDay}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dia anterior</TooltipContent>
            </Tooltip>

            <span className="font-medium text-sm min-w-[180px] text-center">
              {formatDateLongSafe(viewDate + 'T12:00:00')}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDay}
                  disabled={isViewingToday}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Próximo dia</TooltipContent>
            </Tooltip>

            {!isViewingToday && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                  >
                    Hoje
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ir para hoje</TooltipContent>
              </Tooltip>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCalendarModalOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver Calendário
          </Button>
        </div>
      </TooltipProvider>

      {/* Modal do Calendário */}
      <MedicationsCalendarModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        residentId={residentId}
        residentName={residentName}
        initialDate={parseISO(viewDate + 'T12:00:00')}
        onDateSelect={onDateChange}
      />

      {/* Conteúdo */}
      {isLoadingAdministrations ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : administrations.length > 0 ? (
        <TooltipProvider delayDuration={300}>
          <div className="space-y-2">
            {administrations.map((admin) => (
              <div
                key={admin.id}
                className={`border-l-4 pl-4 py-3 rounded-r-md ${
                  admin.type === 'SOS'
                    ? 'bg-severity-warning/5 border-severity-warning'
                    : admin.wasAdministered
                    ? 'bg-success/5 border-success'
                    : 'bg-danger/5 border-danger'
                }`}
              >
                {/* Linha 1: Horário, Status e Botões de Ação */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  {/* Conteúdo principal - clicável para visualizar */}
                  <div
                    className={`flex flex-col gap-1 flex-1 ${onViewAdministration ? 'cursor-pointer' : ''}`}
                    onClick={() => onViewAdministration?.(admin)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-base min-w-[50px]">
                        {admin.scheduledTime || admin.actualTime || 'SOS'}
                      </span>
                      {admin.type === 'SOS' ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-severity-warning/5 text-severity-warning/80 border-severity-warning/30"
                        >
                          SOS
                        </Badge>
                      ) : (
                        <Badge
                          variant={admin.wasAdministered ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {admin.wasAdministered ? 'Administrado' : 'Não Administrado'}
                        </Badge>
                      )}
                      {isAdministrationEdited(admin) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                              <PenLine className="h-3 w-3" />
                              <span className="hidden sm:inline">Editado</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Última edição: {formatDateTimeSafe(admin.updatedAt)}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {onViewAdministration && (
                        <Eye className="h-4 w-4 text-muted-foreground ml-auto" />
                      )}
                    </div>
                  </div>

                  {/* Botões de ação - visíveis conforme permissão */}
                  {(canEditAdministrations || canViewHistory || canDeleteAdministrations) && (
                    <div className="flex gap-1 shrink-0">
                      {canEditAdministrations && onEditAdministration && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditAdministration(admin)
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar administração</TooltipContent>
                        </Tooltip>
                      )}
                      {canViewHistory && onHistoryAdministration && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onHistoryAdministration(admin.id)
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver histórico de alterações</TooltipContent>
                        </Tooltip>
                      )}
                      {canDeleteAdministrations && onDeleteAdministration && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteAdministration(admin)
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir administração</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>

                {/* Linha 2: Nome do Medicamento */}
                <div className="flex items-center gap-2 mb-0.5">
                  <Pill className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {formatMedicationTitle(admin.medication?.name, admin.medication?.concentration)}
                  </span>
                </div>

                {/* Linha 3: Dose e Via */}
                {admin.medication && (
                  <div className="text-xs text-muted-foreground">
                    <span>{admin.medication.dose}</span>
                    {' • '}
                    <span>{admin.medication.route}</span>
                    {admin.medication.presentation && (
                      <>
                        {' • '}
                        <span>{formatMedicationPresentation(admin.medication.presentation)}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Linha 4: Informações compactas */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {admin.actualTime && admin.actualTime !== admin.scheduledTime && admin.type !== 'SOS' && (
                    <>
                      <span>Real {admin.actualTime}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>Por {admin.administeredBy}</span>
                  <span>•</span>
                  <span>{formatDateTimeSafe(admin.createdAt)}</span>
                  {admin.checkedBy && (
                    <>
                      <span>•</span>
                      <span>Checado por {admin.checkedBy}</span>
                    </>
                  )}
                </div>

                {/* Indicação (apenas SOS) */}
                {admin.type === 'SOS' && admin.indication && (
                  <div className="mt-2 p-2 bg-severity-warning/10 border border-severity-warning/30 rounded text-xs">
                    <span className="font-medium text-severity-warning/90">Indicação:</span>
                    <p className="text-severity-warning/90 mt-1">
                      {getIndicationLabel(admin.indication)}
                    </p>
                  </div>
                )}

                {/* Motivo (se não foi administrado) */}
                {!admin.wasAdministered && admin.reason && (
                  <div className="mt-2 p-2 bg-danger/10 border border-danger/30 rounded text-xs">
                    <span className="font-medium text-danger/90">Motivo:</span>
                    <p className="text-danger/90 mt-1">{admin.reason}</p>
                  </div>
                )}

                {/* Observações */}
                {admin.notes && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <span className="font-medium">Observações:</span>
                    <p className="text-foreground/80 mt-1">{admin.notes}</p>
                  </div>
                )}

              </div>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Pill className="h-12 w-12 text-muted-foreground" />
          <div className="text-muted-foreground font-medium">Nenhuma administração nesta data</div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Use o calendário para navegar entre os dias com administrações
          </p>
        </div>
      )}
    </div>
  )
}
