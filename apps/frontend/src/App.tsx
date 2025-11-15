import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { router } from '@/routes'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </QueryProvider>
  )
}

export default App
