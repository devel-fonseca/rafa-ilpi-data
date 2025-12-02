import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Building2, LogOut, Pill, Home, Users, ClipboardList, Bed, Menu, FileText, User2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { getMyProfile } from '@/services/api'
import { getSignedFileUrl } from '@/services/upload'

export function DashboardLayout() {
  useScrollToTop()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Carregar foto do perfil do usuário
  useEffect(() => {
    const loadUserAvatar = async () => {
      try {
        const profile = await getMyProfile()
        if (profile.profilePhoto) {
          // Se é URL completa, usa direto
          if (profile.profilePhoto.startsWith('http')) {
            setAvatarUrl(profile.profilePhoto)
          } else {
            // Se é caminho do MinIO, assina a URL
            const signedUrl = await getSignedFileUrl(profile.profilePhoto)
            setAvatarUrl(signedUrl)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar avatar:', error)
      }
    }

    loadUserAvatar()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Obter iniciais do nome do usuário
  const getUserInitials = () => {
    if (!user?.name) return 'U'
    const names = user.name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return names[0][0].toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile: Menu + Logo + Name */}
            <div className="flex items-center gap-3 md:flex-1">
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
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-gray-900">
                  {user?.tenant?.name || 'Rafa ILPI'}
                </h1>
                <p className="text-xs text-gray-500">Sistema de Gestão</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                  {user?.tenant?.name || 'Rafa ILPI'}
                </h1>
              </div>
            </div>

            {/* Desktop: User Avatar + Dropdown */}
            <div className="hidden md:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/meu-perfil')}>
                    <User2 className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  {user?.role?.toUpperCase() === 'ADMIN' && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard/usuarios')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Gerenciar Usuários</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: Avatar + Dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/meu-perfil')}>
                    <User2 className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  {user?.role?.toUpperCase() === 'ADMIN' && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard/usuarios')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Gerenciar Usuários</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            <Link
              to="/dashboard/perfil-institucional"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="h-4 w-4" />
              Perfil Institucional
            </Link>

            {/* Separator */}
            <div className="border-t my-2" />

            <Link
              to="/dashboard/meu-perfil"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User2 className="h-4 w-4" />
              Meu Perfil
            </Link>

            {user?.role?.toUpperCase() === 'ADMIN' && (
              <Link
                to="/dashboard/usuarios"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Shield className="h-4 w-4" />
                Gerenciar Usuários
              </Link>
            )}
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
              <Link
                to="/dashboard/perfil-institucional"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4" />
                Perfil Institucional
              </Link>

              {/* Separator */}
              <div className="border-t my-2" />

              <Link
                to="/dashboard/meu-perfil"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User2 className="h-4 w-4" />
                Meu Perfil
              </Link>

              {user?.role?.toUpperCase() === 'ADMIN' && (
                <Link
                  to="/dashboard/usuarios"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              )}
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
