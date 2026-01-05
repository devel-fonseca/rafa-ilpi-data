import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Building2, LogOut, Pill, Home, Users, ClipboardList, Bed, Menu, FileText, User2, Shield, Moon, Sun, ChevronLeft, ChevronRight, Mail, Calendar } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { getMyProfile } from '@/services/api'
import { getSignedFileUrl } from '@/services/upload'
import { usePreferences } from '@/contexts/PreferencesContext'
import { toast } from 'sonner'
import { CookieConsent } from '@/components/common/CookieConsent'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { PositionCode, POSITION_CODE_LABELS } from '@/types/permissions'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'
import { MessagesDropdown } from '@/components/messages/MessagesDropdown'
import { WelcomeToActivePlanDialog } from '@/components/billing/WelcomeToActivePlanDialog'

export function DashboardLayout() {
  useScrollToTop()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<PositionCode | null>(null)
  const { user, logout } = useAuthStore()
  const { preferences, updatePreference } = usePreferences()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  // Verificar permissões
  const canViewInstitutionalProfile = hasPermission(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  const canManageInfrastructure = hasPermission(PermissionType.MANAGE_INFRASTRUCTURE)
  const canManageResidents = hasPermission(PermissionType.CREATE_RESIDENTS) ||
                             hasPermission(PermissionType.UPDATE_RESIDENTS) ||
                             hasPermission(PermissionType.DELETE_RESIDENTS)
  const canViewPops = hasPermission(PermissionType.VIEW_POPS)
  const canViewMessages = hasPermission(PermissionType.VIEW_MESSAGES)

  // Carregar foto do perfil e cargo do usuário
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await getMyProfile()

        // Carregar foto de perfil
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

        // Carregar cargo
        if (profile.positionCode) {
          setUserPosition(profile.positionCode as PositionCode)
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      }
    }

    loadUserProfile()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Você saiu com sucesso. Até logo!')
      navigate('/login')
    } catch (error) {
      // Não mostrar erro se o store foi limpo com sucesso
      // (o interceptor pode ter feito refresh automático)
      const { isAuthenticated } = useAuthStore.getState()
      if (isAuthenticated) {
        toast.error('Erro ao fazer logout. Tente novamente.')
      } else {
        // Logout foi bem-sucedido pelo interceptor, apenas navegar
        toast.success('Você saiu com sucesso. Até logo!')
        navigate('/login')
      }
    }
  }

  const toggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark'
    updatePreference('theme', newTheme)
  }

  const toggleSidebar = () => {
    updatePreference('sidebarCollapsed', !preferences.sidebarCollapsed)
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

  const getPositionLabel = () => {
    if (!userPosition) return 'Usuário'
    return POSITION_CODE_LABELS[userPosition] || 'Usuário'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
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
              <Building2 className="h-8 w-8 text-primary" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-foreground">
                  {user?.tenant?.profile?.tradeName || user?.tenant?.name || 'Rafa ILPI'}
                </h1>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                  {user?.tenant?.profile?.tradeName || user?.tenant?.name || 'Rafa ILPI'}
                </h1>
              </div>
            </div>

            {/* Desktop: Notifications + Messages + Theme + User Avatar + Dropdown */}
            <div className="hidden md:flex items-center gap-2">
              {/* Dropdown de Notificações */}
              <NotificationsDropdown />

              {/* Dropdown de Mensagens */}
              <MessagesDropdown />

              {/* Botão de Toggle Tema */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                    >
                      {preferences.theme === 'dark' ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{preferences.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User Avatar + Nome + Cargo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium leading-none">{user?.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">{getPositionLabel()}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
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
                    className="text-danger focus:text-danger"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: Notifications + Messages + Theme + Avatar + Dropdown */}
            <div className="md:hidden flex items-center gap-1">
              {/* Dropdown de Notificações Mobile */}
              <NotificationsDropdown />

              {/* Dropdown de Mensagens Mobile */}
              <MessagesDropdown />

              {/* Botão de Toggle Tema Mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={toggleTheme}
              >
                {preferences.theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {/* Avatar + Dropdown Mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
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
                        {getPositionLabel()}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
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
                    className="text-danger focus:text-danger"
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
        <aside className={`hidden md:block bg-card border-r transition-all duration-300 ${
          preferences.sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <nav className="p-2 space-y-1">
            {/* Toggle Button */}
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
                title={preferences.sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              >
                {preferences.sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>

            <TooltipProvider>
              {/* Menu Items */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Home className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Dashboard'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Dashboard</TooltipContent>
                )}
              </Tooltip>

              {canManageResidents && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/residentes"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Users className="h-4 w-4 flex-shrink-0" />
                      {!preferences.sidebarCollapsed && 'Residentes'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Residentes</TooltipContent>
                  )}
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/registros-diarios"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <ClipboardList className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Registros Diários'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Registros Diários</TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/prescricoes"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Pill className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Medicações'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Medicações</TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/agenda"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Agenda'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Agenda</TooltipContent>
                )}
              </Tooltip>

              {canViewPops && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/pops"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      {!preferences.sidebarCollapsed && 'POPs'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">POPs</TooltipContent>
                  )}
                </Tooltip>
              )}

              {canViewMessages && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/mensagens"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      {!preferences.sidebarCollapsed && 'Mensagens'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Mensagens</TooltipContent>
                  )}
                </Tooltip>
              )}

              {canManageInfrastructure && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/beds/structure"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Bed className="h-4 w-4 flex-shrink-0" />
                      {!preferences.sidebarCollapsed && 'Gestão de Leitos'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Gestão de Leitos</TooltipContent>
                  )}
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/beds/map"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Mapa de Leitos'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Mapa de Leitos</TooltipContent>
                )}
              </Tooltip>

              {canViewInstitutionalProfile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/perfil-institucional"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      {!preferences.sidebarCollapsed && 'Perfil Institucional'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Perfil Institucional</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Separator */}
              <div className="border-t my-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/meu-perfil"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <User2 className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Meu Perfil'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Meu Perfil</TooltipContent>
                )}
              </Tooltip>

              {user?.role?.toUpperCase() === 'ADMIN' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/usuarios"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      {!preferences.sidebarCollapsed && 'Gerenciar Usuários'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Gerenciar Usuários</TooltipContent>
                  )}
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger hover:bg-accent rounded-lg transition-colors w-full ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    {!preferences.sidebarCollapsed && 'Sair'}
                  </button>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Sair</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 md:hidden">
            <nav className="p-4 space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              {canManageResidents && (
                <Link
                  to="/dashboard/residentes"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Residentes
                </Link>
              )}
              <Link
                to="/dashboard/registros-diarios"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <ClipboardList className="h-4 w-4" />
                Registros Diários
              </Link>
              <Link
                to="/dashboard/prescricoes"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Pill className="h-4 w-4" />
                Medicações
              </Link>
              <Link
                to="/dashboard/agenda"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Agenda
              </Link>
              {canViewPops && (
                <Link
                  to="/dashboard/pops"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  POPs
                </Link>
              )}
              {canViewMessages && (
                <Link
                  to="/dashboard/mensagens"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Mensagens
                </Link>
              )}
              {canManageInfrastructure && (
                <Link
                  to="/dashboard/beds/structure"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Bed className="h-4 w-4" />
                  Gestão de Leitos
                </Link>
              )}
              <Link
                to="/dashboard/beds/map"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Mapa de Leitos
              </Link>
              {canViewInstitutionalProfile && (
                <Link
                  to="/dashboard/perfil-institucional"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Perfil Institucional
                </Link>
              )}

              {/* Separator */}
              <div className="border-t my-2" />

              <Link
                to="/dashboard/meu-perfil"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <User2 className="h-4 w-4" />
                Meu Perfil
              </Link>

              {user?.role?.toUpperCase() === 'ADMIN' && (
                <Link
                  to="/dashboard/usuarios"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              )}

              <button
                onClick={() => {
                  setIsSidebarOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger hover:bg-accent rounded-lg transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
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

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Welcome to Active Plan Dialog (post-trial) */}
      <WelcomeToActivePlanDialog />
    </div>
  )
}
