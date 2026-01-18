import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { toast } from 'sonner'

/**
 * Sprint 3 - Timeline em Tempo Real
 *
 * Hook para sincronizar registros diários via WebSocket
 * Atualiza automaticamente a timeline quando outro usuário cria um registro
 *
 * @param residentId - ID do residente (para filtrar eventos)
 * @param date - Data dos registros (formato YYYY-MM-DD)
 *
 * @example
 * // Em ResidentRecordsPage.tsx
 * const { residentId } = useParams();
 * const today = getCurrentDate();
 * useDailyRecordsRealtime(residentId, today);
 */
export function useDailyRecordsRealtime(residentId: string | undefined, date: string) {
  const queryClient = useQueryClient()
  const { socket } = useWebSocketContext()

  useEffect(() => {
    if (!socket || !residentId) return

    const handleRecordCreated = (data: {
      recordType: string
      residentId: string
      residentName: string
      createdBy: string
      createdByUserId: string
      date: string
      data: any
      timestamp: string
    }) => {
      // Só atualizar se for do residente correto e data correta
      if (data.residentId === residentId && data.date === date) {
        // Invalidar queries usando predicate para pegar todas as variações
        // (incluindo as com tenantKey que têm prefixo ['t', tenantId, ...])
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey as string[]
            // Verificar se é uma query de daily-records que inclui o residentId e date corretos
            const isDailyRecordsQuery = queryKey.some(k =>
              typeof k === 'string' && k.includes('daily-records')
            )

            const hasResidentId = queryKey.some(k =>
              typeof k === 'string' && k === residentId ||
              (typeof k === 'object' && k !== null && 'residentId' in k)
            )

            const hasDate = queryKey.some(k =>
              typeof k === 'string' && k === date ||
              (typeof k === 'object' && k !== null && 'date' in k)
            )

            return isDailyRecordsQuery && (hasResidentId || hasDate)
          }
        })

        // Também invalidar daily-tasks (tarefas do dia)
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey as string[]
            return queryKey.some(k => typeof k === 'string' && k.includes('daily-tasks'))
          }
        })

        // Toast discreto informando sobre novo registro
        const recordTypeLabel = getRecordTypeLabel(data.recordType)
        toast.info(`${recordTypeLabel} registrado por ${data.createdBy}`, {
          duration: 3000,
        })
      }
    }

    socket.on('daily-record:created', handleRecordCreated)

    return () => {
      socket.off('daily-record:created', handleRecordCreated)
    }
  }, [socket, residentId, date, queryClient])
}

/**
 * Mapeia tipo de registro para label legível
 */
function getRecordTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ALIMENTACAO: 'Alimentação',
    HIDRATACAO: 'Hidratação',
    PESO_ALTURA: 'Peso/Altura',
    HIGIENE: 'Higiene',
    SONO: 'Sono',
    HUMOR: 'Humor',
    COMPORTAMENTO: 'Comportamento',
    ELIMINACAO: 'Eliminação',
    ATIVIDADES: 'Atividades',
    INTERCORRENCIA: 'Intercorrência',
    VISITA: 'Visita',
    MONITORAMENTO: 'Monitoramento',
    OUTROS: 'Outros',
  }

  return labels[type] || type
}
