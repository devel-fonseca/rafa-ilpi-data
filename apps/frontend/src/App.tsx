import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { router } from '@/routes'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

function App() {
  return (
    <QueryProvider>
      <PreferencesProvider>
        <RouterProvider router={router} />
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </PreferencesProvider>
    </QueryProvider>
  )
}

export default App
