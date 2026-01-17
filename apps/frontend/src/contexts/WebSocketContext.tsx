import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'

/**
 * WebSocket Context para comunicação em tempo real
 *
 * FEATURES:
 * - Conexão única compartilhada por toda aplicação
 * - Auto-reconexão via Socket.IO
 * - Autenticação automática via JWT do AuthContext
 * - Isolamento multi-tenant via rooms
 *
 * EVENTOS DISPONÍVEIS:
 * - alert:new - Novos alertas de sinais vitais/medicamentos
 * - medication:locked - Medicamento bloqueado por outro usuário
 * - medication:unlocked - Medicamento desbloqueado
 * - vitalsign:alert - Alerta de anomalia em sinal vital
 *
 * USO:
 * const { socket, isConnected } = useWebSocket()
 *
 * useEffect(() => {
 *   if (!socket) return
 *
 *   socket.on('alert:new', (data) => {
 *     console.log('New alert:', data)
 *   })
 *
 *   return () => {
 *     socket.off('alert:new')
 *   }
 * }, [socket])
 */

interface WebSocketContextValue {
  socket: Socket | null
  isConnected: boolean
  error: string | null
}

const WebSocketContext = createContext<WebSocketContextValue>({
  socket: null,
  isConnected: false,
  error: null,
})

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Não conectar se usuário não estiver autenticado
    if (!user) {
      // Desconectar se havia socket ativo
      if (socketRef.current) {
        console.log('[WS] User logged out, disconnecting...')
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // Se já existe conexão ativa, não criar nova
    if (socketRef.current?.connected) {
      return
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const WS_URL = BACKEND_URL.replace('/api', '') // Remove /api suffix

    console.log('[WS] Connecting to:', `${WS_URL}/events`)

    // Criar socket com JWT no handshake
    const newSocket = io(`${WS_URL}/events`, {
      auth: {
        token: localStorage.getItem('token'),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], // Fallback para polling se WebSocket falhar
    })

    // Event handlers
    newSocket.on('connect', () => {
      console.log('[WS] Connected successfully')
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('connection:success', (data) => {
      console.log('[WS] Connection confirmed:', data)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)
      setIsConnected(false)

      // Se desconexão foi do servidor, tentar reconectar
      if (reason === 'io server disconnect') {
        newSocket.connect()
      }
    })

    newSocket.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message)
      setError(err.message)
      setIsConnected(false)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    // Cleanup: desconectar ao desmontar
    return () => {
      console.log('[WS] Cleaning up connection...')
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [user]) // Reconectar quando user mudar (login/logout)

  const value: WebSocketContextValue = {
    socket,
    isConnected,
    error,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}
