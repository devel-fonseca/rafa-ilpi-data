import { useEffect, useCallback } from 'react'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

/**
 * Hook genérico para consumir eventos WebSocket
 *
 * FUNCIONALIDADES:
 * - Auto-registro/desregistro de event listeners
 * - Type-safe com TypeScript
 * - Cleanup automático no unmount
 * - Suporte a múltiplos eventos no mesmo componente
 *
 * EVENTOS DISPONÍVEIS:
 * - alert:new - Novo alerta (sinais vitais, medicamentos)
 * - medication:locked - Medicamento bloqueado por outro usuário
 * - medication:unlocked - Medicamento desbloqueado
 * - vitalsign:alert - Alerta de anomalia em sinal vital
 * - connection:success - Confirmação de conexão estabelecida
 *
 * USO:
 * ```tsx
 * function MyComponent() {
 *   const { socket, isConnected } = useWebSocket()
 *
 *   // Escutar evento de alerta
 *   useWebSocket('alert:new', (data) => {
 *     console.log('New alert:', data)
 *     toast.error(`Alerta: ${data.message}`)
 *   })
 *
 *   // Emitir evento (se necessário)
 *   const lockMedication = (medicationId: string) => {
 *     socket?.emit('medication:lock', { medicationId })
 *   }
 *
 *   return <div>...</div>
 * }
 * ```
 *
 * @param event - Nome do evento para escutar
 * @param handler - Callback executado quando evento é recebido
 */
export function useWebSocket<T = unknown>(
  event?: string,
  handler?: (data: T) => void
) {
  const { socket, isConnected, error } = useWebSocketContext()

  // Registrar event listener
  useEffect(() => {
    if (!socket || !event || !handler) return

    // Log de debug (remover em produção)
    console.log(`[WS Hook] Registering listener for: ${event}`)

    // Registrar handler
    socket.on(event, handler)

    // Cleanup: desregistrar ao desmontar
    return () => {
      console.log(`[WS Hook] Unregistering listener for: ${event}`)
      socket.off(event, handler)
    }
  }, [socket, event, handler])

  // Helper para emitir eventos
  const emit = useCallback(
    <D = unknown>(eventName: string, data?: D) => {
      if (!socket) {
        console.warn('[WS Hook] Cannot emit: socket not connected')
        return
      }
      socket.emit(eventName, data)
    },
    [socket]
  )

  return {
    socket,
    isConnected,
    error,
    emit,
  }
}
