import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'

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
  const { user, accessToken, hasBootstrapped } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!hasBootstrapped || !user || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    if (socketRef.current?.connected) {
      return
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const WS_URL = BACKEND_URL.replace('/api', '')

    const newSocket = io(`${WS_URL}/events`, {
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false)

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

    return () => {
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, hasBootstrapped, user])

  const value: WebSocketContextValue = {
    socket,
    isConnected,
    error,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}
