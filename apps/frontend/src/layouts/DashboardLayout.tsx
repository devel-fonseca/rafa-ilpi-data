import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

export function DashboardLayout() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900">Rafa ILPI</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {user?.nome || 'Usuário'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              <Link
                to="/dashboard"
                className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard/residentes"
                className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Residentes
              </Link>
              <Link
                to="/dashboard/registros-diarios"
                className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Registros Diários
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
