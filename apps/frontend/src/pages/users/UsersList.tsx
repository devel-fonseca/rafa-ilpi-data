import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import {
  getTenantUsers,
  getAllUserProfiles,
  getUserPermissions,
  manageCustomPermissions,
} from '@/services/api'
import { UserHistoryDrawer } from '@/components/users/UserHistoryDrawer'
import { DeleteUserModal } from '@/components/modals/DeleteUserModal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Key,
  Briefcase,
  Award,
  History,
  MoreHorizontal,
  Users,
} from 'lucide-react'
import {
  PositionCode,
  RegistrationType,
  PermissionType,
  POSITION_CODE_LABELS,
  REGISTRATION_TYPE_LABELS,
} from '@/types/permissions'
import { UserWithProfile, UserPermissions } from '@/types/user'
import { PermissionsManager } from '@/components/users/PermissionsManager'
import { getErrorMessage } from '@/utils/errorHandling'
import {
  EntityListPage,
  EmptyState,
  StatusBadge,
  LoadingSpinner,
} from '@/design-system/components'

export default function UsersList() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [profiles, setProfiles] = useState<UserWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [permissionsModal, setPermissionsModal] = useState<{
    open: boolean
    user: UserWithProfile | null
    permissions: UserPermissions | null
  }>({
    open: false,
    user: null,
    permissions: null,
  })
  const [historyDrawer, setHistoryDrawer] = useState<{
    open: boolean
    userId: string | null
    userName?: string
  }>({
    open: false,
    userId: null,
  })

  // Form states
  const [customPermissions, setCustomPermissions] = useState<PermissionType[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Estados para modal de exclusão
  const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    if (!currentUser?.tenantId) return

    try {
      setLoading(true)
      const [usersData, profilesData] = await Promise.all([
        getTenantUsers(currentUser.tenantId),
        getAllUserProfiles(),
      ])
      setUsers(usersData)
      setProfiles(profilesData)
    } catch (error: unknown) {
      toast({
        title: 'Erro ao carregar dados',
        description: getErrorMessage(error, 'Não foi possível carregar os dados'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPermissions = async (user: UserWithProfile) => {
    try {
      const permissions = await getUserPermissions(user.id)
      setCustomPermissions(permissions.custom || [])
      setPermissionsModal({
        open: true,
        user,
        permissions,
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Erro ao carregar permissões',
        description: err.response?.data?.message || 'Não foi possível carregar as permissões',
        variant: 'destructive',
      })
    }
  }

  const handleSavePermissions = async () => {
    if (!permissionsModal.user || !permissionsModal.permissions) return

    try {
      setSubmitting(true)

      const currentCustom = new Set(permissionsModal.permissions.custom || [])
      const newCustom = new Set(customPermissions)

      const toAdd = Array.from(newCustom).filter((p) => !currentCustom.has(p))
      const toRemove = Array.from(currentCustom).filter((p) => !newCustom.has(p))

      if (toAdd.length > 0 || toRemove.length > 0) {
        await manageCustomPermissions(permissionsModal.user.id, {
          add: toAdd.length > 0 ? toAdd : undefined,
          remove: toRemove.length > 0 ? toRemove : undefined,
        })
      }

      toast({
        title: 'Permissões atualizadas',
        description: `Permissões de ${permissionsModal.user.name} foram atualizadas com sucesso`,
      })

      setPermissionsModal({ open: false, user: null, permissions: null })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Erro ao atualizar permissões',
        description: err.response?.data?.message || 'Não foi possível atualizar as permissões',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSuccess = async () => {
    await loadData()
  }

  const getUserProfile = (userId: string) => {
    return profiles.find((p) => p.userId === userId)
  }

  return (
    <>
      <EntityListPage
        pageHeader={{
          title: 'Gerenciamento de Usuários',
          subtitle: 'Gerencie usuários, cargos e permissões',
          actions: (
            <Button onClick={() => navigate('/dashboard/usuarios/new')}>
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          ),
        }}
        list={{
          title: 'Lista de Usuários',
          description: `${users.length} usuário${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`,
          content: loading ? (
            <LoadingSpinner message="Carregando usuários..." />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum usuário encontrado"
              description="Comece adicionando o primeiro usuário da equipe"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/usuarios/new')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar primeiro usuário
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow className="border-b border-primary/10 hover:bg-primary/5">
                    <TableHead className="w-12 h-10 py-2"></TableHead>
                    <TableHead className="h-10 py-2">Nome</TableHead>
                    <TableHead className="text-right h-10 py-2">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const profile = getUserProfile(user.id)
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="w-12">
                          <PhotoViewer
                            photoUrl={profile?.profilePhoto}
                            altText={user.name}
                            size="sm"
                            rounded={true}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.name}</span>
                              <StatusBadge variant={user.isActive ? 'success' : 'warning'}>
                                {user.isActive ? 'Ativo' : 'Inativo'}
                              </StatusBadge>
                              {profile?.isTechnicalManager && (
                                <StatusBadge variant="info" title="Responsável Técnico">
                                  <Award className="h-3 w-3 mr-1" />
                                  RT
                                </StatusBadge>
                              )}
                              {profile?.isNursingCoordinator && (
                                <StatusBadge variant="info" title="Coordenador de Enfermagem">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  Coord.
                                </StatusBadge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                              {profile?.positionCode && (
                                <> • {POSITION_CODE_LABELS[profile.positionCode as PositionCode]}</>
                              )}
                              {profile?.registrationType && profile?.registrationNumber && (
                                <>
                                  {' '}
                                  • {REGISTRATION_TYPE_LABELS[profile.registrationType as RegistrationType]}{' '}
                                  {profile.registrationNumber}
                                  {profile.registrationState && `/${profile.registrationState}`}
                                </>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/usuarios/${user.id}/edit`)}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPermissions(user)}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Permissões
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Mais ações</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setHistoryDrawer({
                                      open: true,
                                      userId: user.id,
                                      userName: user.name,
                                    })
                                  }
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  Ver Histórico
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-danger"
                                  onClick={() => {
                                    setUserToDelete(user)
                                    setDeleteModalOpen(true)
                                  }}
                                  disabled={user.id === currentUser?.id}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ),
        }}
      />

      {/* Modal Gerenciar Permissões */}
      <Dialog
        open={permissionsModal.open}
        onOpenChange={(open) => setPermissionsModal({ ...permissionsModal, open })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Gerenciar Permissões: {permissionsModal.user?.name}
            </DialogTitle>
            <DialogDescription>
              Configure permissões customizadas adicionais às herdadas do cargo ILPI
            </DialogDescription>
          </DialogHeader>

          {permissionsModal.permissions && (
            <PermissionsManager
              inheritedPermissions={permissionsModal.permissions.inherited || []}
              customPermissions={customPermissions}
              onCustomPermissionsChange={setCustomPermissions}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPermissionsModal({
                  open: false,
                  user: null,
                  permissions: null,
                })
              }
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão com Reautenticação */}
      <DeleteUserModal
        user={userToDelete}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />

      {/* Drawer de Histórico */}
      <UserHistoryDrawer
        userId={historyDrawer.userId || undefined}
        userName={historyDrawer.userName}
        open={historyDrawer.open}
        onOpenChange={(open) => setHistoryDrawer({ open, userId: null, userName: undefined })}
      />
    </>
  )
}
