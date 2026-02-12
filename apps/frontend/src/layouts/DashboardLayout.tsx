import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Building2, LogOut, Pill, LayoutDashboard, Users, Bed, Menu, FileText, User2, Shield, Moon, Sun, ChevronLeft, ChevronRight, Mail, CalendarDays, Bell, ShieldCheck, FileSignature, CalendarClock, CreditCard, BarChart3, Map, NotebookPen, Landmark } from 'lucide-react'
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
import { useFeatures } from '@/hooks/useFeatures'
import { ConnectionStatus } from '@/components/common/ConnectionStatus'

export function DashboardLayout() {
  useScrollToTop()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<PositionCode | null>(null)
  const { user, logout } = useAuthStore()
  const { preferences, updatePreference } = usePreferences()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const { hasFeature } = useFeatures()

  // Verificar permissões
  const canViewInstitutionalProfile = hasPermission(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  const canManageInfrastructure = hasPermission(PermissionType.MANAGE_INFRASTRUCTURE)
  const canManageResidents = hasPermission(PermissionType.CREATE_RESIDENTS) ||
                             hasPermission(PermissionType.UPDATE_RESIDENTS) ||
                             hasPermission(PermissionType.DELETE_RESIDENTS)
  const canViewPops = hasPermission(PermissionType.VIEW_POPS)
  const canViewContracts = hasPermission(PermissionType.VIEW_CONTRACTS)

  // Verificar permissões (features são validadas nas rotas)
  const canViewMessages = hasPermission(PermissionType.VIEW_MESSAGES)
  const canViewCompliance = hasPermission(PermissionType.VIEW_COMPLIANCE_DASHBOARD) ||
                            hasPermission(PermissionType.VIEW_SENTINEL_EVENTS)
  const canViewCareShifts = hasPermission(PermissionType.VIEW_CARE_SHIFTS)
  const canViewReports = hasPermission(PermissionType.VIEW_REPORTS)
  const canViewFinancialOperations = hasPermission(PermissionType.VIEW_FINANCIAL_OPERATIONS)

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

  const desktopSidebarIconClass = preferences.sidebarCollapsed
    ? 'h-5 w-5 flex-shrink-0'
    : 'h-4 w-4 flex-shrink-0'

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

            {/* Desktop: Connection Status + Notifications + Messages + Theme + User Avatar + Dropdown */}
            <div className="hidden md:flex items-center gap-2">
              {/* Indicador de Status de Conexão WebSocket */}
              <ConnectionStatus />

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
                    <>
                      <DropdownMenuItem onClick={() => navigate('/dashboard/usuarios')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Gerenciar Usuários</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dashboard/settings/billing')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Gerenciar Plano</span>
                      </DropdownMenuItem>
                    </>
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
                    <>
                      <DropdownMenuItem onClick={() => navigate('/dashboard/usuarios')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Gerenciar Usuários</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dashboard/settings/billing')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Gerenciar Plano</span>
                      </DropdownMenuItem>
                    </>
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
      <div className="flex min-h-[calc(100vh-4rem)]">
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
              {/* Dashboard */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <LayoutDashboard className={desktopSidebarIconClass} />
                    {!preferences.sidebarCollapsed && 'Dashboard'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Dashboard</TooltipContent>
                )}
              </Tooltip>

              {/* Separator 1 */}
              {!preferences.sidebarCollapsed && <div className="border-t my-2" />}

              {/* Agenda */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/agenda"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <CalendarDays className={desktopSidebarIconClass} />
                    {!preferences.sidebarCollapsed && 'Agenda'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Agenda</TooltipContent>
                )}
              </Tooltip>

              {/* Residentes */}
              {canManageResidents && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/residentes"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Users className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Residentes'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Residentes</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Mapa de Ocupação */}
              {hasFeature('mapa_leitos') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/beds/map"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Map className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Mapa de Ocupação'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Mapa de Ocupação</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Prescrições */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/prescricoes"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Pill className={desktopSidebarIconClass} />
                    {!preferences.sidebarCollapsed && 'Prescrições'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Prescrições</TooltipContent>
                )}
              </Tooltip>

              {/* Registros Diários */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/registros-diarios"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <NotebookPen className={desktopSidebarIconClass} />
                    {!preferences.sidebarCollapsed && 'Registros Diários'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Registros Diários</TooltipContent>
                )}
              </Tooltip>

              {/* Separator 2 */}
              {!preferences.sidebarCollapsed && <div className="border-t my-2" />}

              {/* Contratos */}
              {canViewContracts && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/contratos"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <FileSignature className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Contratos'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Contratos</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Financeiro Operacional */}
              {canViewFinancialOperations && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/financeiro"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Landmark className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Financeiro'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Financeiro</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Relatórios */}
              {canViewReports && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/relatorios"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <BarChart3 className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Relatórios'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Relatórios</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Leitos (antiga Gestão de Leitos, agora usando ícone Building2) */}
              {hasFeature('gestao_leitos') && canManageInfrastructure && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/beds/management"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Bed className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Leitos'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Leitos</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Hub de Conformidade */}
              {canViewCompliance && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/conformidade"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <ShieldCheck className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Hub de Conformidade'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Hub de Conformidade</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Perfil Institucional */}
              {canViewInstitutionalProfile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/perfil-institucional"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Building2 className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Perfil Institucional'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Perfil Institucional</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* POPs */}
              {canViewPops && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/pops"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <FileText className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'POPs'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">POPs</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Escalas e Plantões */}
              {canViewCareShifts && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/escala-cuidados"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <CalendarClock className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Escalas e Plantões'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Escalas e Plantões</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Usuários (antiga Gerenciar Usuários) */}
              {user?.role?.toUpperCase() === 'ADMIN' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/usuarios"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Shield className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Usuários'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Usuários</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Separator 3 */}
              {!preferences.sidebarCollapsed && <div className="border-t my-2" />}

              {/* Mensagens */}
              {canViewMessages && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard/mensagens"
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                        preferences.sidebarCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Mail className={desktopSidebarIconClass} />
                      {!preferences.sidebarCollapsed && 'Mensagens'}
                    </Link>
                  </TooltipTrigger>
                  {preferences.sidebarCollapsed && (
                    <TooltipContent side="right">Mensagens</TooltipContent>
                  )}
                </Tooltip>
              )}

              {/* Notificações */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/notificacoes"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Bell className={desktopSidebarIconClass} />
                    {!preferences.sidebarCollapsed && 'Notificações'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Notificações</TooltipContent>
                )}
              </Tooltip>

              {/* Separator 4 */}
              {!preferences.sidebarCollapsed && <div className="border-t my-2" />}

              {/* Meu Perfil */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/meu-perfil"
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <User2 className={desktopSidebarIconClass} />
                    {!preferences.sidebarCollapsed && 'Meu Perfil'}
                  </Link>
                </TooltipTrigger>
                {preferences.sidebarCollapsed && (
                  <TooltipContent side="right">Meu Perfil</TooltipContent>
                )}
              </Tooltip>

              {/* Sair */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger hover:bg-accent rounded-lg transition-colors w-full ${
                      preferences.sidebarCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <LogOut className={desktopSidebarIconClass} />
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
              {/* Dashboard */}
              <Link
                to="/dashboard"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              {/* Separator 1 */}
              <div className="border-t my-2" />

              {/* Agenda */}
              <Link
                to="/dashboard/agenda"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
                Agenda
              </Link>

              {/* Residentes */}
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

              {/* Mapa de Ocupação */}
              {hasFeature('mapa_leitos') && (
                <Link
                  to="/dashboard/beds/map"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Map className="h-4 w-4" />
                  Mapa de Ocupação
                </Link>
              )}

              {/* Prescrições */}
              <Link
                to="/dashboard/prescricoes"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Pill className="h-4 w-4" />
                Prescrições
              </Link>

              {/* Registros Diários */}
              <Link
                to="/dashboard/registros-diarios"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <NotebookPen className="h-4 w-4" />
                Registros Diários
              </Link>

              {/* Separator 2 */}
              <div className="border-t my-2" />

              {/* Contratos */}
              {canViewContracts && (
                <Link
                  to="/dashboard/contratos"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <FileSignature className="h-4 w-4" />
                  Contratos
                </Link>
              )}

              {/* Financeiro Operacional */}
              {canViewFinancialOperations && (
                <Link
                  to="/dashboard/financeiro"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Landmark className="h-4 w-4" />
                  Financeiro
                </Link>
              )}

              {/* Relatórios */}
              {canViewReports && (
                <Link
                  to="/dashboard/relatorios"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  Relatórios
                </Link>
              )}

              {/* Leitos */}
              {hasFeature('gestao_leitos') && canManageInfrastructure && (
                <Link
                  to="/dashboard/beds/management"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Bed className="h-4 w-4" />
                  Leitos
                </Link>
              )}

              {/* Hub de Conformidade */}
              {canViewCompliance && (
                <Link
                  to="/dashboard/conformidade"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Hub de Conformidade
                </Link>
              )}

              {/* Perfil Institucional */}
              {canViewInstitutionalProfile && (
                <Link
                  to="/dashboard/perfil-institucional"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Perfil Institucional
                </Link>
              )}

              {/* POPs */}
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

              {/* Escalas e Plantões */}
              {canViewCareShifts && (
                <Link
                  to="/dashboard/escala-cuidados"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <CalendarClock className="h-4 w-4" />
                  Escalas e Plantões
                </Link>
              )}

              {/* Usuários */}
              {user?.role?.toUpperCase() === 'ADMIN' && (
                <Link
                  to="/dashboard/usuarios"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Usuários
                </Link>
              )}

              {/* Separator 3 */}
              <div className="border-t my-2" />

              {/* Mensagens */}
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

              {/* Notificações */}
              <Link
                to="/dashboard/notificacoes"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Bell className="h-4 w-4" />
                Notificações
              </Link>

              {/* Separator 4 */}
              <div className="border-t my-2" />

              {/* Meu Perfil */}
              <Link
                to="/dashboard/meu-perfil"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <User2 className="h-4 w-4" />
                Meu Perfil
              </Link>

              {/* Sair */}
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
