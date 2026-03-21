import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuthStore } from '@/stores/auth.store'
import { router } from '@/routes'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth)
  const hasBootstrapped = useAuthStore((state) => state.hasBootstrapped)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)

  useEffect(() => {
    bootstrapAuth().catch(() => undefined)
  }, [bootstrapAuth])

  if (!hasBootstrapped || isBootstrapping) {
    return <LoadingScreen />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryProvider>
      <AuthBootstrap>
        <PreferencesProvider>
          <WebSocketProvider>
            <RouterProvider router={router} />
            <Toaster />
            <SonnerToaster position="top-right" richColors />
          </WebSocketProvider>
        </PreferencesProvider>
      </AuthBootstrap>
    </QueryProvider>
  )
}

export default App
