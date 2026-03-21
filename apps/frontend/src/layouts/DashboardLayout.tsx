import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Building2, LogOut, Pill, LayoutDashboard, Users, Bed, Menu, FileText, User2, Shield, Moon, Sun, ChevronLeft, ChevronRight, Mail, CalendarDays, Bell, ShieldCheck, FileSignature, CalendarClock, CreditCard, Printer, Map, NotebookPen, Landmark, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
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
import { getSignedFileUrl } from '@/services/upload'
import { useMyProfile } from '@/hooks/queries/useUserProfile'
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
import { LoadingScreen } from '@/components/LoadingScreen'
import { useInactivityLogout } from '@/hooks/useInactivityLogout'
import { useProfile as useInstitutionalProfile } from '@/hooks/useInstitutionalProfile'
import { cn } from '@/lib/utils'

type SidebarLinkItem = {
  kind: 'link'
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  visible?: boolean
}

type SidebarActionItem = {
  kind: 'action'
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
  visible?: boolean
}

type SidebarItem = SidebarLinkItem | SidebarActionItem
type SidebarGroup = SidebarItem[]

function isVisibleSidebarItem(item: SidebarItem): boolean {
  return item.visible !== false
}

export function DashboardLayout() {
  useScrollToTop()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const inactivityLogoutTriggeredRef = useRef(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<PositionCode | null>(null)
  const [hideInstitutionalLogo, setHideInstitutionalLogo] = useState(false)
  const { data: myProfile } = useMyProfile()
  const { data: institutionalProfile } = useInstitutionalProfile()
  const { user, logout } = useAuthStore()
  const { preferences, updatePreference } = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const { hasFeature } = useFeatures()

  // Verificar permissões
  const canUpdateInstitutionalProfile = hasPermission(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
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
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN'

  // Cuidadores não veem sidebar (usam toolbar no dashboard)
  const isCaregiver = user?.profile?.positionCode === 'CAREGIVER'

  // Carregar/atualizar foto do perfil e cargo do usuário
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profilePhoto = myProfile?.profilePhoto || user?.profile?.profilePhoto || null
        const positionCode = myProfile?.positionCode || user?.profile?.positionCode || null

        // Carregar foto de perfil
        if (profilePhoto) {
          // Se é URL completa, usa direto
          if (profilePhoto.startsWith('http')) {
            setAvatarUrl(profilePhoto)
          } else {
            // Se é caminho do MinIO, assina a URL
            const signedUrl = await getSignedFileUrl(profilePhoto)
            setAvatarUrl(signedUrl)
          }
        } else {
          setAvatarUrl(null)
        }

        // Carregar cargo
        if (positionCode) {
          setUserPosition(positionCode as PositionCode)
        } else {
          setUserPosition(null)
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      }
    }

    loadUserProfile()
  }, [myProfile, user?.profile?.profilePhoto, user?.profile?.positionCode])

  const institutionalLogoUrl = institutionalProfile?.profile?.logoUrl || null
  const institutionalName = user?.tenant?.profile?.tradeName || user?.tenant?.name || 'Rafa ILPI'

  useEffect(() => {
    setHideInstitutionalLogo(false)
  }, [institutionalLogoUrl])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

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
        setIsLoggingOut(false)
      } else {
        // Logout foi bem-sucedido pelo interceptor, apenas navegar
        toast.success('Você saiu com sucesso. Até logo!')
        navigate('/login')
      }
    }
  }

  const handleInactivityTimeout = useCallback(async () => {
    if (inactivityLogoutTriggeredRef.current) return
    inactivityLogoutTriggeredRef.current = true
    setIsLoggingOut(true)

    try {
      await logout('INACTIVITY_TIMEOUT')
    } finally {
      navigate('/session-expired')
    }
  }, [logout, navigate])

  useEffect(() => {
    inactivityLogoutTriggeredRef.current = false
  }, [user?.id])

  useInactivityLogout({
    enabled: !!user?.id && !isLoggingOut,
    onTimeout: handleInactivityTimeout,
  })

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
    ? 'h-7 w-7 flex-shrink-0'
    : 'h-5 w-5 flex-shrink-0'
  const mobileSidebarIconClass = 'h-5 w-5 flex-shrink-0'
  const desktopSidebarItemBaseClass = cn(
    'relative flex w-full cursor-pointer items-center rounded-lg text-sm font-medium transition-colors duration-150',
    preferences.sidebarCollapsed
      ? 'h-12 justify-center px-0 py-0'
      : 'gap-2 px-3 py-2'
  )
  const getDesktopSidebarItemClass = (item: SidebarItem, isActive: boolean) =>
    cn(
      desktopSidebarItemBaseClass,
      item.kind === 'action' && item.danger
        ? 'text-danger hover:bg-sidebar-hover hover:text-danger'
        : isActive
          ? cn(
              'bg-sidebar-hover text-primary shadow-sm ring-1 ring-sidebar-border',
              !preferences.sidebarCollapsed &&
                'before:absolute before:left-1 before:bottom-2 before:top-2 before:w-0.5 before:rounded-full before:bg-primary'
            )
          : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground hover:shadow-sm hover:ring-1 hover:ring-sidebar-border'
    )
  const mobileSidebarItemClass =
    'flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground'
  const mobileSidebarDangerItemClass =
    'flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-sidebar-hover hover:text-danger'
  const sidebarSeparatorClass = 'border-t border-sidebar-border my-2'
  const desktopTrayButtonClass =
    'h-[34px] w-[34px] rounded-md text-muted-foreground hover:bg-accent/70 hover:text-foreground'
  const desktopTrayIconClass = 'h-5 w-5'
  const sidebarBrandFallbackClass =
    'flex items-center justify-center rounded-xl text-sidebar-foreground'
  const institutionalProfileHref = '/dashboard/perfil-institucional'
  const brandingWrapperClass = cn(
    'transition-colors',
    canUpdateInstitutionalProfile
      ? 'cursor-pointer hover:bg-sidebar-hover'
      : 'cursor-default'
  )

  const userMenuLabel = (
    <DropdownMenuLabel className="font-normal">
      <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium leading-none text-foreground">
          {user?.name}
        </p>
        <p className="text-xs leading-none text-muted-foreground">
          {getPositionLabel()}
        </p>
        <p className="text-xs leading-none text-muted-foreground">
          {user?.email}
        </p>
      </div>
    </DropdownMenuLabel>
  )

  const renderUserMenuItems = () => (
    <>
      <DropdownMenuItem onClick={toggleTheme}>
        {preferences.theme === 'dark' ? (
          <Sun className="mr-2 h-4 w-4" />
        ) : (
          <Moon className="mr-2 h-4 w-4" />
        )}
        <span>{preferences.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate('/dashboard/meu-perfil')}>
        <User2 className="mr-2 h-4 w-4" />
        <span>Meu Perfil</span>
      </DropdownMenuItem>
      {canViewCareShifts && (
        <DropdownMenuItem onClick={() => navigate('/dashboard/meus-plantoes')}>
          <CalendarClock className="mr-2 h-4 w-4" />
          <span>Meus Plantões</span>
        </DropdownMenuItem>
      )}
      {isAdmin && (
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
    </>
  )

  const rawSidebarGroups = [
    [
      {
        kind: 'link',
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        end: true,
      },
    ],
    [
      { kind: 'link', label: 'Agenda', to: '/dashboard/agenda', icon: CalendarDays },
      {
        kind: 'link',
        label: 'Residentes',
        to: '/dashboard/residentes',
        icon: Users,
        visible: canManageResidents,
      },
      {
        kind: 'link',
        label: 'Mapa de Ocupação',
        to: '/dashboard/beds/map',
        icon: Map,
        visible: hasFeature('mapa_leitos'),
      },
      { kind: 'link', label: 'Prescrições', to: '/dashboard/prescricoes', icon: Pill },
      {
        kind: 'link',
        label: 'Registros Diários',
        to: '/dashboard/registros-diarios',
        icon: NotebookPen,
      },
    ],
    [
      {
        kind: 'link',
        label: 'Contratos',
        to: '/dashboard/contratos',
        icon: FileSignature,
        visible: canViewContracts,
      },
      {
        kind: 'link',
        label: 'Financeiro',
        to: '/dashboard/financeiro',
        icon: Landmark,
        visible: canViewFinancialOperations,
      },
      {
        kind: 'link',
        label: 'Relatórios',
        to: '/dashboard/relatorios',
        icon: Printer,
        visible: canViewReports,
      },
      {
        kind: 'link',
        label: 'Leitos',
        to: '/dashboard/beds/management',
        icon: Bed,
        visible: hasFeature('gestao_leitos') && canManageInfrastructure,
      },
      {
        kind: 'link',
        label: 'Hub de Conformidade',
        to: '/dashboard/conformidade',
        icon: ShieldCheck,
        visible: canViewCompliance,
      },
      {
        kind: 'link',
        label: 'POPs',
        to: '/dashboard/pops',
        icon: FileText,
        visible: canViewPops,
      },
      {
        kind: 'link',
        label: 'Escalas e Plantões',
        to: '/dashboard/escala-cuidados',
        icon: CalendarClock,
        visible: canViewCareShifts,
      },
      {
        kind: 'link',
        label: 'Usuários',
        to: '/dashboard/usuarios',
        icon: Shield,
        visible: isAdmin,
      },
    ],
    [
      {
        kind: 'link',
        label: 'Mensagens',
        to: '/dashboard/mensagens',
        icon: Mail,
        visible: canViewMessages,
      },
      {
        kind: 'link',
        label: 'Notificações',
        to: '/dashboard/notificacoes',
        icon: Bell,
      },
    ],
    [
      {
        kind: 'link',
        label: 'Meu Perfil',
        to: '/dashboard/meu-perfil',
        icon: User2,
      },
      {
        kind: 'action',
        label: 'Sair',
        icon: LogOut,
        onClick: handleLogout,
        danger: true,
      },
    ],
  ] satisfies SidebarGroup[]

  const sidebarGroups: SidebarGroup[] = rawSidebarGroups
    .map((group) => group.filter(isVisibleSidebarItem))
    .filter((group) => group.length > 0)

  const isSidebarItemActive = (item: SidebarItem) => {
    if (item.kind !== 'link') return false

    if (item.end) {
      return location.pathname === item.to
    }

    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    )
  }

  const renderSidebarItemContent = (
    item: SidebarItem,
    iconClassName: string,
    showLabel = !preferences.sidebarCollapsed
  ) => {
    const Icon = item.icon

    return (
      <>
        <Icon className={iconClassName} />
        {showLabel && <span>{item.label}</span>}
      </>
    )
  }

  const renderDesktopSidebarItem = (item: SidebarItem) => {
    const isActive = isSidebarItemActive(item)
    const itemClassName = getDesktopSidebarItemClass(item, isActive)

    const itemNode =
      item.kind === 'link' ? (
        <Link to={item.to} className={itemClassName}>
          {renderSidebarItemContent(item, desktopSidebarIconClass)}
        </Link>
      ) : (
        <button onClick={item.onClick} className={itemClassName}>
          {renderSidebarItemContent(item, desktopSidebarIconClass)}
        </button>
      )

    if (!preferences.sidebarCollapsed) {
      return itemNode
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{itemNode}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  const renderMobileSidebarItem = (item: SidebarItem) => {
    const isActive = isSidebarItemActive(item)
    const itemClassName = cn(
      item.kind === 'action' && item.danger
        ? mobileSidebarDangerItemClass
        : mobileSidebarItemClass,
      isActive && item.kind === 'link' && 'bg-sidebar-hover text-primary'
    )

    if (item.kind === 'link') {
      return (
        <Link
          to={item.to}
          onClick={() => setIsSidebarOpen(false)}
          className={itemClassName}
        >
          {renderSidebarItemContent(item, mobileSidebarIconClass, true)}
        </Link>
      )
    }

    return (
      <button
        onClick={() => {
          setIsSidebarOpen(false)
          item.onClick()
        }}
        className={itemClassName}
      >
        {renderSidebarItemContent(item, mobileSidebarIconClass, true)}
      </button>
    )
  }

  const renderDesktopBranding = () => {
    const brandingContent = preferences.sidebarCollapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', brandingWrapperClass)}>
            {institutionalLogoUrl && !hideInstitutionalLogo ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border/80 bg-white/95 p-1.5 shadow-sm dark:bg-slate-50/95">
                <img
                  src={institutionalLogoUrl}
                  alt="Logo institucional"
                  className="h-full w-full object-contain"
                  onError={() => setHideInstitutionalLogo(true)}
                />
              </div>
            ) : (
              <div className={cn(sidebarBrandFallbackClass, 'h-10 w-10')}>
                <Building2 className={`${desktopSidebarIconClass} text-current`} />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {canUpdateInstitutionalProfile ? institutionalName : `${institutionalName} • sem permissão de edição`}
        </TooltipContent>
      </Tooltip>
    ) : (
      <div
        className={cn(
          'flex flex-col items-center gap-3 text-center rounded-xl px-2 py-2',
          brandingWrapperClass
        )}
      >
        {institutionalLogoUrl && !hideInstitutionalLogo ? (
          <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sidebar-border/80 bg-white/95 px-2 py-1.5 shadow-sm dark:bg-slate-50/95">
            <img
              src={institutionalLogoUrl}
              alt="Logo institucional"
              className="h-full w-full object-contain"
              onError={() => setHideInstitutionalLogo(true)}
            />
          </div>
        ) : (
          <div className={cn(sidebarBrandFallbackClass, 'h-14 w-14 shrink-0')}>
            <Building2 className="h-8 w-8 shrink-0 text-current" />
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-sidebar-foreground">
            {institutionalName}
          </h1>
          <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
        </div>
      </div>
    )

    if (!canUpdateInstitutionalProfile) {
      return brandingContent
    }

    return (
      <Link to={institutionalProfileHref} className="block rounded-xl">
        {brandingContent}
      </Link>
    )
  }

  const renderMobileBranding = () => {
    const content = (
      <>
        {institutionalLogoUrl && !hideInstitutionalLogo ? (
          <div className="flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-white/95 px-1.5 py-1 shadow-sm dark:bg-slate-50/95 sm:h-9 sm:w-12">
            <img
              src={institutionalLogoUrl}
              alt="Logo institucional"
              className="h-full w-full object-contain"
              onError={() => setHideInstitutionalLogo(true)}
            />
          </div>
        ) : (
          <div className={cn(sidebarBrandFallbackClass, 'h-8 w-8 shrink-0')}>
            <Building2 className="h-7 w-7 text-current" />
          </div>
        )}
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-foreground">
            {institutionalName}
          </h1>
          <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
        </div>
        <div className="sm:hidden">
          <h1 className="max-w-[110px] truncate text-sm font-semibold text-foreground">
            {institutionalName}
          </h1>
        </div>
      </>
    )

    if (!canUpdateInstitutionalProfile) {
      return <div className="flex items-center gap-3 md:hidden">{content}</div>
    }

    return (
      <Link
        to={institutionalProfileHref}
        className="flex items-center gap-3 rounded-lg transition-colors hover:bg-accent/60 md:hidden"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[2.5rem_minmax(0,1fr)]">
      {/* Header */}
      <header className="border-b border-header-border bg-header text-header-foreground shadow-sm md:sticky md:top-0 md:col-start-2 md:row-start-1 md:z-20">
        <div className="flex h-10 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile: Menu + Logo + Name */}
            <div className="flex min-w-0 items-center gap-2.5 md:flex-1">
              {!isCaregiver && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  className="h-8 w-8 md:hidden"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              {renderMobileBranding()}
            </div>

            {/* Desktop: System Tray */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1">
                <ConnectionStatus
                  containerClassName="h-[34px] w-[34px]"
                  iconClassName={desktopTrayIconClass}
                />
              </div>

              <div className="h-3.5 w-px bg-border/40" />

              <div className="flex items-center gap-1">
                <NotificationsDropdown
                  triggerClassName={desktopTrayButtonClass}
                  iconClassName={desktopTrayIconClass}
                  badgeClassName="h-[18px] min-w-[18px] -top-0.5 -right-0.5 px-1 text-[10px]"
                />

                <MessagesDropdown
                  triggerClassName={desktopTrayButtonClass}
                  iconClassName={desktopTrayIconClass}
                  badgeClassName="h-[18px] min-w-[18px] -top-0.5 -right-0.5 px-1 text-[10px]"
                />
              </div>

              <div className="h-3.5 w-px bg-border/40" />

              {/* User Avatar + Nome */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex h-[34px] items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent/70">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="max-w-[132px] truncate text-sm font-medium leading-none">{user?.name}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  {userMenuLabel}
                  <DropdownMenuSeparator />
                  {renderUserMenuItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: Notifications + Messages + Theme + Avatar + Dropdown */}
            <div className="flex items-center gap-0.5 md:hidden">
              {/* Dropdown de Notificações Mobile */}
              <NotificationsDropdown />

              {/* Dropdown de Mensagens Mobile */}
              <MessagesDropdown />

              {/* Avatar + Dropdown Mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  {userMenuLabel}
                  <DropdownMenuSeparator />
                  {renderUserMenuItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex min-h-[calc(100vh-2.5rem)] md:contents">
        {/* Desktop Sidebar */}
        <aside className={`relative hidden ${isCaregiver ? '' : 'md:block'} bg-sidebar border-r border-sidebar-border transition-all duration-300 md:col-start-1 md:row-span-2 md:row-start-1 md:h-screen md:sticky md:top-0 ${
          preferences.sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSidebar}
                  className="absolute -right-2.5 top-16 z-20 hidden h-8 w-5 rounded-full border border-sidebar-border border-l-0 bg-sidebar text-muted-foreground shadow-sm transition-colors hover:bg-sidebar-hover hover:text-foreground md:flex"
                  aria-label={preferences.sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                >
                  {preferences.sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {preferences.sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <nav className="h-full overflow-y-auto p-2">
              <div className={cn('space-y-1', preferences.sidebarCollapsed ? 'pt-3' : 'pt-2')}>
              <div className={cn('px-2', preferences.sidebarCollapsed ? 'mb-5' : 'mb-4')}>
                <div className={cn(preferences.sidebarCollapsed ? 'flex justify-center' : 'flex justify-center')}>
                  {renderDesktopBranding()}
                </div>
              </div>

                {sidebarGroups.map((group, groupIndex) => (
                  <div key={`desktop-group-${groupIndex}`} className="space-y-1">
                    {groupIndex > 0 && (
                      <div
                        className={cn(
                          sidebarSeparatorClass,
                          preferences.sidebarCollapsed ? 'mx-2 my-3' : 'my-2'
                        )}
                      />
                    )}

                    {group.map((item) => (
                      <div key={`desktop-item-${item.label}`}>
                        {renderDesktopSidebarItem(item)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </nav>
          </TooltipProvider>
        </aside>

        {/* Mobile Sidebar */}
        {!isCaregiver && (
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetContent
              side="left"
              className="flex h-full w-64 flex-col overflow-hidden border-sidebar-border bg-sidebar p-0 md:hidden"
            >
              <SheetTitle className="sr-only">Menu principal</SheetTitle>
              <SheetDescription className="sr-only">
                Navegação principal do sistema.
              </SheetDescription>
              <nav className="h-full overflow-y-auto overscroll-contain p-4 pr-3 touch-pan-y">
                <div className="space-y-1">
                  {sidebarGroups.map((group, groupIndex) => (
                    <div key={`mobile-group-${groupIndex}`} className="space-y-1">
                      {groupIndex > 0 && <div className={sidebarSeparatorClass} />}

                      {group.map((item) => (
                        <div key={`mobile-item-${item.label}`}>
                          {renderMobileSidebarItem(item)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto md:col-start-2 md:row-start-2 md:min-h-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Welcome to Active Plan Dialog (post-trial) */}
      <WelcomeToActivePlanDialog />

      {/* Overlay durante logout para feedback visual de encerramento da sessão */}
      {isLoggingOut && <LoadingScreen />}
    </div>
  )
}
