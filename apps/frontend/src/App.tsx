import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { router } from '@/routes'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

function App() {
  return (
    <QueryProvider>
      <PreferencesProvider>
        <WebSocketProvider>
          <RouterProvider router={router} />
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </WebSocketProvider>
      </PreferencesProvider>
    </QueryProvider>
  )
}

export default App
