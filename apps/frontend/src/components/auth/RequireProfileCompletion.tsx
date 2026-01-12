import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { Loader2 } from 'lucide-react'

interface RequireProfileCompletionProps {
  children: React.ReactNode
}

/**
 * Guard que verifica se o tenant completou o perfil institucional (onboarding)
 *
 * Se o perfil NÃO estiver completo (legalNature não preenchida),
 * redireciona para /onboarding
 *
 * Uso:
 * <RequireProfileCompletion>
 *   <DashboardLayout />
 * </RequireProfileCompletion>
 */
export function RequireProfileCompletion({ children }: RequireProfileCompletionProps) {
  const location = useLocation()
  const { user } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [isProfileComplete, setIsProfileComplete] = useState(false)

  useEffect(() => {
    const checkProfileCompletion = async () => {
      // SUPERADMIN (tenantId = null) não precisa de perfil
      if (!user?.tenantId) {
        setIsProfileComplete(true)
        setIsChecking(false)
        return
      }

      // Se já está na rota de onboarding, não precisa verificar
      if (location.pathname === '/onboarding') {
        setIsProfileComplete(true)
        setIsChecking(false)
        return
      }

      try {
        // Verificar completude do perfil via backend
        const response = await api.get('/tenant-profile/completion-status')
        const { isComplete } = response.data

        setIsProfileComplete(isComplete)
      } catch (error) {
        console.error('Erro ao verificar perfil:', error)
        // Em caso de erro, assumir que perfil não está completo
        setIsProfileComplete(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkProfileCompletion()
  }, [user?.tenantId, location.pathname])

  // Aguardando verificação
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando perfil institucional...</p>
        </div>
      </div>
    )
  }

  // Perfil incompleto → redireciona para onboarding
  if (!isProfileComplete) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />
  }

  // Perfil completo → renderiza children
  return <>{children}</>
}
