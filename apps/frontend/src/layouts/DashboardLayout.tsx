import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Building2, LogOut, Pill, Home, Users, ClipboardList, Bed, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {user?.tenant?.name || 'Rafa ILPI'}
                </h1>
                <p className="text-xs text-gray-500">Sistema de Gestão</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'ADMIN' ? 'Administrador' :
                   user?.role === 'MANAGER' ? 'Gerente' : 'Usuário'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r">
          <nav className="p-4 space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/dashboard/residentes"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="h-4 w-4" />
              Residentes
            </Link>
            <Link
              to="/dashboard/registros-diarios"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Registros Diários
            </Link>
            <Link
              to="/dashboard/prescricoes"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pill className="h-4 w-4" />
              Medicações
            </Link>
            <Link
              to="/dashboard/beds/structure"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bed className="h-4 w-4" />
              Gestão de Leitos
            </Link>
            <Link
              to="/dashboard/beds/map"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Mapa de Leitos
            </Link>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 md:hidden">
            <nav className="p-4 space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/dashboard/residentes"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Users className="h-4 w-4" />
                Residentes
              </Link>
              <Link
                to="/dashboard/registros-diarios"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ClipboardList className="h-4 w-4" />
                Registros Diários
              </Link>
              <Link
                to="/dashboard/prescricoes"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pill className="h-4 w-4" />
                Medicações
              </Link>
              <Link
                to="/dashboard/beds/structure"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bed className="h-4 w-4" />
                Gestão de Leitos
              </Link>
              <Link
                to="/dashboard/beds/map"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Mapa de Leitos
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
