import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import {
  getTenantUsers,
  getAllUserProfiles,
  getUserPermissions,
  manageCustomPermissions,
} from "@/services/api";
import { UserHistoryDrawer } from "@/components/users/UserHistoryDrawer";
import { DeleteUserModal } from "@/components/modals/DeleteUserModal";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { PhotoViewer } from "@/components/form/PhotoViewer";
import {
  Loader2,
  Plus,
  Trash2,
  Mail,
  Shield,
  Edit2,
  Key,
  Briefcase,
  Award,
  History,
} from "lucide-react";
import {
  PositionCode,
  RegistrationType,
  PermissionType,
  POSITION_CODE_LABELS,
  REGISTRATION_TYPE_LABELS,
} from "@/types/permissions";
import { UserWithProfile, UserPermissions } from "@/types/user";
import { PermissionsManager } from "@/components/users/PermissionsManager";
import { getErrorMessage } from '@/utils/errorHandling'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

export default function UsersList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [profiles, setProfiles] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [permissionsModal, setPermissionsModal] = useState<{
    open: boolean;
    user: UserWithProfile | null;
    permissions: UserPermissions | null;
  }>({
    open: false,
    user: null,
    permissions: null,
  });
  const [historyDrawer, setHistoryDrawer] = useState<{
    open: boolean;
    userId: string | null;
    userName?: string;
  }>({
    open: false,
    userId: null,
  });

  // Form states
  const [customPermissions, setCustomPermissions] = useState<PermissionType[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);

  // Estados para modal de exclusão
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    if (!currentUser?.tenantId) return;

    try {
      setLoading(true);
      const [usersData, profilesData] = await Promise.all([
        getTenantUsers(currentUser.tenantId),
        getAllUserProfiles(),
      ]);
      setUsers(usersData);
      setProfiles(profilesData);
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar dados",
        description:
          getErrorMessage(error, 'Não foi possível carregar os dados'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissions = async (user: UserWithProfile) => {
    try {
      const permissions = await getUserPermissions(user.id);
      setCustomPermissions(permissions.custom || []);
      setPermissionsModal({
        open: true,
        user,
        permissions,
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar permissões",
        description:
          error.response?.data?.message ||
          "Não foi possível carregar as permissões",
        variant: "destructive",
      });
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionsModal.user || !permissionsModal.permissions) return;

    try {
      setSubmitting(true);

      const currentCustom = new Set(permissionsModal.permissions.custom || []);
      const newCustom = new Set(customPermissions);

      const toAdd = Array.from(newCustom).filter((p) => !currentCustom.has(p));
      const toRemove = Array.from(currentCustom).filter(
        (p) => !newCustom.has(p)
      );

      if (toAdd.length > 0 || toRemove.length > 0) {
        await manageCustomPermissions(permissionsModal.user.id, {
          add: toAdd.length > 0 ? toAdd : undefined,
          remove: toRemove.length > 0 ? toRemove : undefined,
        });
      }

      toast({
        title: "Permissões atualizadas",
        description: `Permissões de ${permissionsModal.user.name} foram atualizadas com sucesso`,
      });

      setPermissionsModal({ open: false, user: null, permissions: null });
    } catch (error: unknown) {
      toast({
        title: "Erro ao atualizar permissões",
        description:
          error.response?.data?.message ||
          "Não foi possível atualizar as permissões",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSuccess = async () => {
    await loadData();
  };

  const getUserProfile = (userId: string) => {
    return profiles.find((p) => p.userId === userId);
  };

  if (loading) {
    return (
      <Page>
        <PageHeader
          title="Gerenciamento de Usuários e Permissões"
          subtitle="Carregando informações..."
        />
        <EmptyState
          icon={Loader2}
          title="Carregando usuários..."
          description="Aguarde enquanto buscamos os dados"
          variant="loading"
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Gerenciamento de Usuários e Permissões"
        subtitle="Gerencie usuários, cargos e permissões customizadas"
        actions={
          <Button onClick={() => navigate('/dashboard/usuarios/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        }
      />

      <Section title={`Usuários (${users.length})`}>
        <Card>
          <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const profile = getUserProfile(user.id);
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
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{user.name}</span>
                        {profile?.isTechnicalManager && (
                          <Badge variant="outline" className="w-fit text-xs">
                            <Award className="h-3 w-3 mr-1" />
                            RT
                          </Badge>
                        )}
                        {profile?.isNursingCoordinator && (
                          <Badge variant="outline" className="w-fit text-xs">
                            <Briefcase className="h-3 w-3 mr-1" />
                            Coord. Enfermagem
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile?.positionCode ? (
                        <Badge variant="default">
                          {
                            POSITION_CODE_LABELS[
                              profile.positionCode as PositionCode
                            ]
                          }
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Não definido
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile?.registrationType &&
                      profile?.registrationNumber ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {
                              REGISTRATION_TYPE_LABELS[
                                profile.registrationType as RegistrationType
                              ]
                            }
                          </div>
                          <div className="text-muted-foreground">
                            {profile.registrationNumber}
                            {profile.registrationState &&
                              ` - ${profile.registrationState}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setHistoryDrawer({
                              open: true,
                              userId: user.id,
                              userName: user.name,
                            })
                          }
                          title="Ver histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/dashboard/usuarios/${user.id}/edit`)}
                          title="Editar perfil"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPermissions(user)}
                          title="Gerenciar permissões"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteModalOpen(true);
                          }}
                          disabled={user.id === currentUser?.id}
                          title="Remover usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </CardContent>
        </Card>

        {users.length === 0 && (
          <EmptyState
            icon={Shield}
            title="Nenhum usuário encontrado"
            description="Não há usuários cadastrados no sistema ainda"
            action={
              <Button onClick={() => navigate('/dashboard/usuarios/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Usuário
              </Button>
            }
          />
        )}
      </Section>

      {/* Modal Gerenciar Permissões */}
      <Dialog
        open={permissionsModal.open}
        onOpenChange={(open) =>
          setPermissionsModal({ ...permissionsModal, open })
        }
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Gerenciar Permissões: {permissionsModal.user?.name}
            </DialogTitle>
            <DialogDescription>
              Configure permissões customizadas adicionais às herdadas do cargo
              ILPI
            </DialogDescription>
          </DialogHeader>

          {permissionsModal.permissions && (
            <PermissionsManager
              inheritedPermissions={
                permissionsModal.permissions.inherited || []
              }
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
        onOpenChange={(open) =>
          setHistoryDrawer({ open, userId: null, userName: undefined })
        }
      />
    </Page>
  );
}
