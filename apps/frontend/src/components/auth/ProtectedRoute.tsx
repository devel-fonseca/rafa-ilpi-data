import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, user, refreshAuth, accessToken } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('ProtectedRoute check:', {
        hasToken: !!accessToken,
        isAuthenticated,
        hasUser: !!user
      })

      // Se tem accessToken mas não está autenticado, tentar refresh
      if (accessToken && !isAuthenticated) {
        try {
          await refreshAuth()
        } catch (error) {
          console.error('Erro ao renovar autenticação:', error)
        }
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [accessToken, isAuthenticated, refreshAuth, user])

  // Aguardando verificação inicial
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Não autenticado
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Não autenticado, redirecionando para login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Verificar role se necessário
  if (requiredRole) {
    const roleHierarchy = {
      VIEWER: 1,
      USER: 2,
      MANAGER: 3,
      ADMIN: 4,
      SUPERADMIN: 5
    }

    const userRoleLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">
              Você não tem permissão para acessar esta página.
            </p>
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Voltar ao Dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}