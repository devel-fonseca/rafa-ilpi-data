import { Outlet, NavLink } from 'react-router-dom'
import {
  Crown,
  LayoutDashboard,
  Building2,
  CreditCard,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * SuperAdminLayout
 *
 * Layout exclusivo para o portal do Super Administrador.
 * Theme diferenciado (roxo/purple) para distinguir visualmente do dashboard normal.
 *
 * Estrutura:
 * - Header com ícone de coroa (indicador visual de SuperAdmin)
 * - Sidebar com navegação completa (Dashboard, Tenants, Assinaturas, Alertas)
 * - Content area para renderizar páginas filhas via <Outlet />
 */
export function SuperAdminLayout() {
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
      to: '/superadmin/subscriptions',
      label: 'Assinaturas',
      icon: CreditCard,
    },
    {
      to: '/superadmin/alerts',
      label: 'Alertas',
      icon: Bell,
    },
  ]

  return (
    <div className="min-h-screen bg-purple-950 text-purple-50">
      {/* Header com theme diferenciado */}
      <header className="bg-purple-900 border-b border-purple-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-yellow-400" />
          <h1 className="text-xl font-bold">Portal Super Admin</h1>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-purple-900 min-h-screen p-6">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/superadmin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    'text-purple-300 hover:text-purple-50 hover:bg-purple-800',
                    isActive && 'bg-purple-800 text-purple-50 font-medium'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
