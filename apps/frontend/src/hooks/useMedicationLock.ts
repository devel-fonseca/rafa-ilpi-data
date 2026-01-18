import { useState, useEffect, useCallback } from 'react'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'

/**
 * Hook para gerenciar locks de medicamentos em tempo real
 *
 * FEATURES:
 * - Escuta eventos WebSocket de lock/unlock
 * - Mantém mapa de locks ativos por medicamento+data+horário
 * - Previne administração duplicada
 * - Exibe alertas quando medicamento está bloqueado
 *
 * USO:
 * const { isLocked, lockedBy, lockMedication, unlockMedication } = useMedicationLock()
 *
 * // Verificar se medicamento está bloqueado
 * if (isLocked(medicationId, '2026-01-17', '14:00')) {
 *   const userName = lockedBy(medicationId, '2026-01-17', '14:00')
 *   alert(`Medicamento bloqueado por ${userName}`)
 * }
 */

interface MedicationLock {
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  lockedBy: string
  lockedByUserId: string
  timestamp: string
}

export function useMedicationLock() {
  const { socket, isConnected } = useWebSocketContext()
  const { user } = useAuthStore()

  // Mapa de locks ativos: "medicationId:scheduledDate:scheduledTime" -> MedicationLock
  const [locks, setLocks] = useState<Map<string, MedicationLock>>(new Map())

  /**
   * Gera chave única para identificar um lock
   */
  const getLockKey = useCallback(
    (medicationId: string, scheduledDate: string, scheduledTime: string) => {
      return `${medicationId}:${scheduledDate}:${scheduledTime}`
    },
    []
  )

  /**
   * Handler para evento de medicamento bloqueado
   */
  const handleMedicationLocked = useCallback(
    (data: MedicationLock) => {
      const key = getLockKey(data.medicationId, data.scheduledDate, data.scheduledTime)

      setLocks((prev) => {
        const newLocks = new Map(prev)
        newLocks.set(key, data)
        return newLocks
      })

      // Notificar usuário apenas se o lock não for dele
      if (data.lockedByUserId !== user?.id) {
        toast.warning(`Medicamento bloqueado por ${data.lockedBy}`, {
          description: `Horário: ${data.scheduledTime} - ${data.scheduledDate}`,
          duration: 3000,
        })
      }

      console.log('[MedicationLock] Medication locked:', data)
    },
    [getLockKey, user?.id]
  )

  /**
   * Handler para evento de medicamento desbloqueado
   */
  const handleMedicationUnlocked = useCallback(
    (data: {
      medicationId: string
      scheduledDate: string
      scheduledTime: string
      unlockedBy?: string
      timestamp: string
    }) => {
      const key = getLockKey(data.medicationId, data.scheduledDate, data.scheduledTime)

      setLocks((prev) => {
        const newLocks = new Map(prev)
        newLocks.delete(key)
        return newLocks
      })

      console.log('[MedicationLock] Medication unlocked:', data)
    },
    [getLockKey]
  )

  /**
   * Registrar listeners WebSocket
   */
  useEffect(() => {
    if (!socket || !isConnected) return

    socket.on('medication:locked', handleMedicationLocked)
    socket.on('medication:unlocked', handleMedicationUnlocked)

    return () => {
      socket.off('medication:locked', handleMedicationLocked)
      socket.off('medication:unlocked', handleMedicationUnlocked)
    }
  }, [socket, isConnected, handleMedicationLocked, handleMedicationUnlocked])

  /**
   * Verifica se um medicamento está bloqueado
   */
  const isLocked = useCallback(
    (medicationId: string, scheduledDate: string, scheduledTime: string): boolean => {
      const key = getLockKey(medicationId, scheduledDate, scheduledTime)
      return locks.has(key)
    },
    [locks, getLockKey]
  )

  /**
   * Retorna nome do usuário que bloqueou o medicamento
   */
  const lockedBy = useCallback(
    (medicationId: string, scheduledDate: string, scheduledTime: string): string | null => {
      const key = getLockKey(medicationId, scheduledDate, scheduledTime)
      const lock = locks.get(key)
      return lock?.lockedBy || null
    },
    [locks, getLockKey]
  )

  /**
   * Verifica se o lock pertence ao usuário atual
   */
  const isLockedByCurrentUser = useCallback(
    (medicationId: string, scheduledDate: string, scheduledTime: string): boolean => {
      const key = getLockKey(medicationId, scheduledDate, scheduledTime)
      const lock = locks.get(key)
      return lock?.lockedByUserId === user?.id
    },
    [locks, getLockKey, user?.id]
  )

  /**
   * Função para bloquear medicamento (chamada ao abrir modal)
   * Nota: O lock real é criado via API no backend
   * Este método apenas prepara o estado local otimisticamente
   */
  const lockMedication = useCallback(
    (medicationId: string, scheduledDate: string, scheduledTime: string) => {
      // Lock otimista: adicionar imediatamente ao mapa
      // O backend fará a validação real e enviará evento WebSocket
      const key = getLockKey(medicationId, scheduledDate, scheduledTime)

      const optimisticLock: MedicationLock = {
        medicationId,
        scheduledDate,
        scheduledTime,
        lockedBy: user?.name || 'Você',
        lockedByUserId: user?.id || '',
        timestamp: new Date().toISOString(),
      }

      setLocks((prev) => {
        const newLocks = new Map(prev)
        newLocks.set(key, optimisticLock)
        return newLocks
      })
    },
    [getLockKey, user?.name, user?.id]
  )

  /**
   * Função para desbloquear medicamento (chamada ao fechar modal ou administrar)
   * Nota: O unlock real é feito via API no backend
   * Este método apenas remove do estado local otimisticamente
   */
  const unlockMedication = useCallback(
    (medicationId: string, scheduledDate: string, scheduledTime: string) => {
      const key = getLockKey(medicationId, scheduledDate, scheduledTime)

      setLocks((prev) => {
        const newLocks = new Map(prev)
        newLocks.delete(key)
        return newLocks
      })
    },
    [getLockKey]
  )

  return {
    isLocked,
    lockedBy,
    isLockedByCurrentUser,
    lockMedication,
    unlockMedication,
    activeLocks: locks,
  }
}
