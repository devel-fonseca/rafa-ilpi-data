import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Crown,
  LayoutDashboard,
  Building2,
  Bell,
  Receipt,
  BarChart3,
  Package,
  FileText,
  LogOut,
  AlertTriangle,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '@/hooks/useAlerts'
import { useOverdueMetrics } from '@/hooks/useOverdueMetrics'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

/**
 * SuperAdminLayout
 *
 * Layout exclusivo para o portal do Super Administrador.
 * Theme: Rafa Labs Brand Kit (Azul Marinho + Verde + Ciano)
 *
 * Estrutura:
 * - Header com ícone de coroa (indicador visual de SuperAdmin)
 * - Sidebar com navegação completa (Dashboard, Tenants, Planos, Faturas, Analytics, Alertas)
 * - Content area para renderizar páginas filhas via <Outlet />
 */
export function SuperAdminLayout() {
  const { data: unreadCount } = useUnreadCount()
  const { data: overdueMetrics } = useOverdueMetrics()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    {
      to: '/superadmin',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/superadmin/tenants',
      label: 'Tenants',
      icon: Building2,
    },
    {
      to: '/superadmin/invoices',
      label: 'Faturas',
      icon: Receipt,
    },
    {
      to: '/superadmin/overdue',
      label: 'Inadimplência',
      icon: AlertTriangle,
      badge: overdueMetrics?.totalOverdueInvoices,
    },
    {
      to: '/superadmin/analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      to: '/superadmin/plans',
      label: 'Planos',
      icon: Package,
    },
    {
      to: '/superadmin/contracts',
      label: 'Contratos',
      icon: FileText,
    },
    {
      to: '/superadmin/email-templates',
      label: 'Templates de Email',
      icon: Mail,
    },
    {
      to: '/superadmin/alerts',
      label: 'Alertas',
      icon: Bell,
      badge: unreadCount,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header - Azul Marinho (#0f172a) */}
      <header className="bg-[#0f172a] border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-[#059669]" />
            <h1 className="text-xl font-bold text-white">Portal Super Admin</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex">
        {/* Sidebar - Azul Marinho com leve transparência */}
        <aside className="w-64 bg-[#1e293b] min-h-screen p-6">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/superadmin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    'text-slate-300 hover:text-white hover:bg-slate-700',
                    isActive && 'bg-[#059669] text-white font-medium'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <Badge className="bg-red-500 text-white border-0 h-5 min-w-5 flex items-center justify-center px-1.5">
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
