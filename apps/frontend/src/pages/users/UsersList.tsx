import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { MaskedInput } from "@/components/form/MaskedInput";
import { getMensagemValidacaoCPF } from "@/utils/validators";
import {
  getTenantUsers,
  getAllUserProfiles,
  addUserToTenant,
  createUserProfile,
  updateUserProfile,
  getUserPermissions,
  manageCustomPermissions,
  getPositionPermissions,
} from "@/services/api";
import { useDeleteUser } from "@/hooks/useUserVersioning";
import { UserHistoryDrawer } from "@/components/users/UserHistoryDrawer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PhotoViewer } from "@/components/form/PhotoViewer";
import {
  Loader2,
  Plus,
  Trash2,
  Mail,
  Shield,
  UserPlus,
  Edit2,
  Key,
  Briefcase,
  Award,
  History,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PositionCode,
  RegistrationType,
  PermissionType,
  POSITION_CODE_LABELS,
  REGISTRATION_TYPE_LABELS,
} from "@/types/permissions";
import { UserWithProfile, UserPermissions } from "@/types/user";
import { PositionCodeSelector } from "@/components/users/PositionCodeSelector";
import { PermissionsManager } from "@/components/users/PermissionsManager";
import { getErrorMessage } from '@/utils/errorHandling'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

export default function UsersList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const deleteUser = useDeleteUser();

  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [permissionsModal, setPermissionsModal] = useState<{
    open: boolean;
    user: any | null;
    permissions: UserPermissions | null;
  }>({
    open: false,
    user: null,
    permissions: null,
  });
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    user: any | null;
  }>({
    open: false,
    user: null,
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

  // Estados para versionamento
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonError, setDeleteReasonError] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [changeReasonError, setChangeReasonError] = useState("");

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

  const handleOpenPermissions = async (user: any) => {
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

  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;

    // Validação do motivo da exclusão
    const trimmedReason = deleteReason.trim();
    if (!trimmedReason || trimmedReason.length < 10) {
      setDeleteReasonError(
        "Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)"
      );
      return;
    }

    try {
      await deleteUser.mutateAsync({
        id: deleteModal.user.id,
        deleteReason: trimmedReason,
      });

      // Sucesso é tratado automaticamente pelo hook (toast + invalidateQueries)
      setDeleteModal({ open: false, user: null });
      setDeleteReason("");
      setDeleteReasonError("");
      await loadData();
    } catch (error) {
      // Erro é tratado automaticamente pelo hook (toast)
      // Mantém o modal aberto para o usuário tentar novamente
    }
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
                          onClick={() => setDeleteModal({ open: true, user })}
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

      {/* Modal Confirmar Exclusão */}
      <AlertDialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          setDeleteModal({ ...deleteModal, open });
          if (!open) {
            setDeleteReason("");
            setDeleteReasonError("");
          }
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{deleteModal.user?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Card Destacado - RDC 502/2021 */}
          <div className="bg-warning/5 dark:bg-warning/90/20 border border-warning/30 dark:border-warning/80 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 text-warning dark:text-warning/40 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning/90 dark:text-warning/20">
                  Rastreabilidade Obrigatória (RDC 502/2021 Art. 39)
                </p>
                <p className="text-xs text-warning/80 dark:text-warning/30 mt-1">
                  Toda exclusão de registro deve ter justificativa documentada para fins de auditoria e conformidade regulatória.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteReason" className="text-sm font-semibold text-warning/95 dark:text-warning/10">
                Motivo da Exclusão <span className="text-danger">*</span>
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Ex: Desligamento do funcionário em 13/12/2025 - Pedido de demissão..."
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value);
                  setDeleteReasonError("");
                }}
                className={`min-h-[100px] ${deleteReasonError ? "border-danger focus:border-danger" : ""}`}
              />
              {deleteReasonError && (
                <p className="text-sm text-danger mt-2">{deleteReasonError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres. Este motivo ficará registrado permanentemente no histórico de alterações.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteReason("");
                setDeleteReasonError("");
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
