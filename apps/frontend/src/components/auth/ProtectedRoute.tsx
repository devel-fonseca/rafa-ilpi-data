import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccessDenied } from '@/design-system/components'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
  requiredPermissions?: PermissionType[]
  requireAllPermissions?: boolean // Se true, requer TODAS as permissões; se false, requer QUALQUER UMA
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermissions,
  requireAllPermissions = false
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, user, refreshAuth, accessToken } = useAuthStore()
  const { hasPermission } = usePermissions()
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
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
          <AccessDenied />
        </div>
      )
    }
  }

  // Verificar permissões se necessário
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission))

    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <AccessDenied />
        </div>
      )
    }
  }

  return <>{children}</>
}