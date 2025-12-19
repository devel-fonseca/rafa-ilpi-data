import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useEffect } from 'react'

// ✅ Criar instância do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 segundos - dados ficam frescos por menos tempo
      gcTime: 1000 * 60 * 5, // 5 minutos - tempo no cache
      retry: 1,
      refetchOnWindowFocus: true, // Revalidar ao focar janela
      refetchOnReconnect: true, // Revalidar ao reconectar
    },
    mutations: {
      retry: 0, // Não repetir mutações automaticamente
    },
  },
})

// ✅ Declarar tipo global para TypeScript
declare global {
  interface Window {
    queryClient: QueryClient
  }
}

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // ✅ Expor queryClient globalmente para que auth.store possa limpar cache no logout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.queryClient = queryClient
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
