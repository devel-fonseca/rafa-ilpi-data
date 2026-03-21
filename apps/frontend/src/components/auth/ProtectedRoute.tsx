import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { Loader2 } from 'lucide-react'
import { AccessDenied } from '@/design-system/components'
import { devLogger } from '@/utils/devLogger'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
  requiredPermissions?: PermissionType[]
  requireAllPermissions?: boolean
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermissions,
  requireAllPermissions = false,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, user, hasBootstrapped, isBootstrapping } = useAuthStore()
  const { hasPermission } = usePermissions()

  if (!hasBootstrapped || isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    )
  }

  if (!isAuthenticated) {
    devLogger.log('ProtectedRoute: Não autenticado, redirecionando para login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole) {
    const roleHierarchy = {
      VIEWER: 1,
      USER: 2,
      MANAGER: 3,
      ADMIN: 4,
      SUPERADMIN: 5,
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

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? requiredPermissions.every((permission) => hasPermission(permission))
      : requiredPermissions.some((permission) => hasPermission(permission))

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
