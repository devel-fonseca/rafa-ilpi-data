// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - DailyRecordsView (Registros Diários)
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
import { Calendar, ChevronLeft, ChevronRight, Edit, History, PenLine, Trash2 } from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { getRecordTypeLabel } from '@/utils/recordTypeLabels'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { formatDateLongSafe, formatDateTimeSafe, getCurrentDate } from '@/utils/dateHelpers'
import { DailyRecordsTimeline } from '@/components/daily-records/DailyRecordsTimeline'
import { DailyRecordsCalendarModal } from '../DailyRecordsCalendarModal'
import type { DailyRecordsViewProps } from '../types'
import type { DailyRecord } from '@/api/dailyRecords.api'

// ========== HELPERS ==========

/**
 * Verifica se um registro foi editado comparando createdAt com updatedAt
 */
function isRecordEdited(record: DailyRecord): boolean {
  if (!record.createdAt || !record.updatedAt) return false
  // Compara os timestamps - se updatedAt for posterior a createdAt, foi editado
  return new Date(record.updatedAt).getTime() > new Date(record.createdAt).getTime()
}

// ========== COMPONENT ==========

export function DailyRecordsView({
  residentId,
  residentName,
  viewDate,
  onDateChange,
  onViewRecord,
  onEditRecord,
  onHistoryRecord,
  onDeleteRecord,
}: DailyRecordsViewProps) {
  const { hasPermission } = usePermissions()
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const isViewingToday = viewDate === today

  // Permissões para ações nos registros
  const canEditRecords = hasPermission(PermissionType.UPDATE_DAILY_RECORDS)
  const canDeleteRecords = hasPermission(PermissionType.DELETE_DAILY_RECORDS)
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

  // Buscar registros diários da data selecionada
  const {
    data: viewDateRecordsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: tenantKey('daily-records', 'resident-profile', residentId, viewDate),
    queryFn: async () => {
      const response = await api.get(`/daily-records/resident/${residentId}/date/${viewDate}`)
      return response.data
    },
    enabled: !!residentId && residentId !== 'new',
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const dailyRecords: DailyRecord[] = Array.isArray(viewDateRecordsData) ? viewDateRecordsData : []
  const isLoadingRecords = isLoading || (isFetching && !viewDateRecordsData)

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
      <DailyRecordsCalendarModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        residentId={residentId}
        residentName={residentName}
        initialDate={parseISO(viewDate + 'T12:00:00')}
        onDateSelect={onDateChange}
      />

      {/* Conteúdo */}
      {isLoadingRecords ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : dailyRecords.length > 0 ? (
        <div className="space-y-4">
          {/* Timeline de Registros */}
          <DailyRecordsTimeline
            records={dailyRecords}
            onRecordClick={onViewRecord}
          />

          {/* Lista de Registros */}
          <TooltipProvider delayDuration={300}>
          <div className="space-y-2">
            {dailyRecords.map((record: DailyRecord) => (
              <div
                key={record.id}
                className={`border-l-4 pl-4 py-2 rounded-r-md ${getRecordTypeLabel(record.type).bgColor}`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Conteúdo principal - clicável para visualizar */}
                  <div
                    className="flex flex-col gap-1 flex-1 cursor-pointer"
                    onClick={() => onViewRecord(record)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-base min-w-[50px]">{record.time}</span>
                      <Badge
                        variant="outline"
                        className={`${getRecordTypeLabel(record.type).color} text-xs`}
                      >
                        {getRecordTypeLabel(record.type).label}
                      </Badge>
                      {isRecordEdited(record) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                              <PenLine className="h-3 w-3" />
                              <span className="hidden sm:inline">Editado</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Última edição: {formatDateTimeSafe(record.updatedAt)}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Por {record.recordedBy}</span>
                      <span>•</span>
                      <span>{formatDateTimeSafe(record.createdAt)}</span>
                    </div>
                  </div>

                  {/* Botões de ação - visíveis conforme permissão */}
                  {(canEditRecords || canViewHistory || canDeleteRecords) && (
                    <div className="flex gap-1 shrink-0">
                      {canEditRecords && onEditRecord && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditRecord(record)
                          }}
                          className="h-7 w-7 p-0"
                          title="Editar registro"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canViewHistory && onHistoryRecord && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onHistoryRecord(record.id)
                          }}
                          className="h-7 w-7 p-0"
                          title="Ver histórico de alterações"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDeleteRecords && onDeleteRecord && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteRecord(record)
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Excluir registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </TooltipProvider>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div className="text-muted-foreground font-medium">Nenhum registro nesta data</div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Use o calendário para navegar entre os dias com registros
          </p>
        </div>
      )}
    </div>
  )
}
