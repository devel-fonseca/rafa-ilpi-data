import { useState, useEffect } from "react";
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

export default function UsersList() {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const deleteUser = useDeleteUser();

  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addUserModal, setAddUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<{
    open: boolean;
    user: any | null;
  }>({
    open: false,
    user: null,
  });
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
  const [addFormData, setAddFormData] = useState({
    name: "",
    email: "",
    role: "user",
    sendInviteEmail: true,
    temporaryPassword: "",
    // Profile fields
    positionCode: "" as PositionCode | "",
    registrationType: "" as RegistrationType | "",
    registrationNumber: "",
    registrationState: "",
    isTechnicalManager: false,
    isNursingCoordinator: false,
    phone: "",
    department: "",
    cpf: "",
  });

  const [editFormData, setEditFormData] = useState<any>({});
  const [customPermissions, setCustomPermissions] = useState<PermissionType[]>(
    []
  );

  // Validação de CPF em tempo real
  const [cpfValidationAdd, setCpfValidationAdd] = useState({ valido: true, mensagem: '' });
  const [cpfValidationEdit, setCpfValidationEdit] = useState({ valido: true, mensagem: '' });
  const [submitting, setSubmitting] = useState(false);

  // Estados para versionamento
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonError, setDeleteReasonError] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [changeReasonError, setChangeReasonError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Validação de CPF em tempo real - Modal Adicionar
  useEffect(() => {
    if (addFormData.cpf) {
      setCpfValidationAdd(getMensagemValidacaoCPF(addFormData.cpf));
    } else {
      setCpfValidationAdd({ valido: true, mensagem: '' });
    }
  }, [addFormData.cpf]);

  // Validação de CPF em tempo real - Modal Editar
  useEffect(() => {
    if (editFormData.cpf) {
      setCpfValidationEdit(getMensagemValidacaoCPF(editFormData.cpf));
    } else {
      setCpfValidationEdit({ valido: true, mensagem: '' });
    }
  }, [editFormData.cpf]);

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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.tenantId) return;

    try {
      setSubmitting(true);

      // 1. Criar usuário
      const newUser = await addUserToTenant(currentUser.tenantId, {
        name: addFormData.name,
        email: addFormData.email,
        role: addFormData.role as any,
        sendInviteEmail: addFormData.sendInviteEmail,
        temporaryPassword: addFormData.temporaryPassword || undefined,
      });

      // 2. Criar perfil com dados ILPI
      if (addFormData.positionCode) {
        await createUserProfile(newUser.id, {
          positionCode: addFormData.positionCode,
          registrationType: addFormData.registrationType || undefined,
          registrationNumber: addFormData.registrationNumber || undefined,
          registrationState: addFormData.registrationState || undefined,
          isTechnicalManager: addFormData.isTechnicalManager,
          isNursingCoordinator: addFormData.isNursingCoordinator,
          phone: addFormData.phone || undefined,
          department: addFormData.department || undefined,
          cpf: addFormData.cpf || undefined,
        });
      }

      toast({
        title: "Usuário adicionado",
        description: `${addFormData.name} foi adicionado com sucesso`,
      });

      resetAddForm();
      setAddUserModal(false);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro ao adicionar usuário",
        description:
          error.response?.data?.message ||
          "Não foi possível adicionar o usuário",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUserModal.user) return;

    try {
      setSubmitting(true);

      await updateUserProfile(editUserModal.user.id, {
        name: editFormData.name || undefined,
        positionCode: editFormData.positionCode || undefined,
        registrationType: editFormData.registrationType || undefined,
        registrationNumber: editFormData.registrationNumber || undefined,
        registrationState: editFormData.registrationState || undefined,
        isTechnicalManager: editFormData.isTechnicalManager,
        isNursingCoordinator: editFormData.isNursingCoordinator,
        phone: editFormData.phone || undefined,
        department: editFormData.department || undefined,
        cpf: editFormData.cpf || undefined,
      });

      toast({
        title: "Perfil atualizado",
        description: `Perfil de ${editUserModal.user.name} foi atualizado com sucesso`,
      });

      setEditUserModal({ open: false, user: null });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: "Erro ao atualizar perfil",
        description:
          error.response?.data?.message ||
          "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  const resetAddForm = () => {
    setAddFormData({
      name: "",
      email: "",
      role: "user",
      sendInviteEmail: true,
      temporaryPassword: "",
      positionCode: "",
      registrationType: "",
      registrationNumber: "",
      registrationState: "",
      isTechnicalManager: false,
      isNursingCoordinator: false,
      phone: "",
      department: "",
    });
  };

  const getUserProfile = (userId: string) => {
    return profiles.find((p) => p.userId === userId);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "destructive";
      case "MANAGER":
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "Administrador";
      case "MANAGER":
        return "Gerente";
      case "USER":
        return "Usuário";
      case "VIEWER":
        return "Visualizador";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gerenciamento de Usuários e Permissões
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários, cargos e permissões customizadas
          </p>
        </div>
        <Button onClick={() => setAddUserModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários ({users.length})</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados com seus cargos e permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                          onClick={() => {
                            setEditFormData({
                              name: user?.name || "",
                              positionCode: profile?.positionCode || "",
                              registrationType: profile?.registrationType || "",
                              registrationNumber:
                                profile?.registrationNumber || "",
                              registrationState:
                                profile?.registrationState || "",
                              isTechnicalManager:
                                profile?.isTechnicalManager || false,
                              isNursingCoordinator:
                                profile?.isNursingCoordinator || false,
                              phone: profile?.phone || "",
                              department: profile?.department || "",
                            });
                            setEditUserModal({ open: true, user });
                          }}
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

          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar Usuário */}
      <Dialog open={addUserModal} onOpenChange={setAddUserModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário e defina seu cargo e permissões
              ILPI
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="ilpi">Perfil ILPI</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    required
                    value={addFormData.name}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <MaskedInput
                      id="cpf"
                      mask="999.999.999-99"
                      value={addFormData.cpf}
                      onChange={(e) =>
                        setAddFormData({
                          ...addFormData,
                          cpf: e.target.value,
                        })
                      }
                      validation={cpfValidationAdd}
                      placeholder="000.000.000-00"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={addFormData.email}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="role">Role Sistema *</Label>
                  <Select
                    value={addFormData.role}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tempPassword">
                    Senha Temporária (opcional)
                  </Label>
                  <Input
                    id="tempPassword"
                    type="password"
                    placeholder="Deixe em branco para gerar automaticamente"
                    value={addFormData.temporaryPassword}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        temporaryPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="ilpi" className="space-y-4">
                <PositionCodeSelector
                  value={addFormData.positionCode}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, positionCode: value })
                  }
                />

                {/* Departamento */}
                <div>
                  <Label htmlFor="add-department">Departamento</Label>
                  <Input
                    id="add-department"
                    placeholder="Ex: Enfermagem, Administrativo, etc."
                    value={addFormData.department}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        department: e.target.value,
                      })
                    }
                  />
                </div>

                {addFormData.positionCode && (
                  <>
                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="registrationType">
                          Tipo de Registro
                        </Label>
                        <Select
                          value={addFormData.registrationType}
                          onValueChange={(value) =>
                            setAddFormData({
                              ...addFormData,
                              registrationType: value as RegistrationType,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(REGISTRATION_TYPE_LABELS).map(
                              ([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="registrationNumber">
                          Número do Registro
                        </Label>
                        <Input
                          id="registrationNumber"
                          value={addFormData.registrationNumber}
                          onChange={(e) =>
                            setAddFormData({
                              ...addFormData,
                              registrationNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="registrationState">
                          UF do Registro
                        </Label>
                        <Input
                          id="registrationState"
                          maxLength={2}
                          value={addFormData.registrationState}
                          onChange={(e) =>
                            setAddFormData({
                              ...addFormData,
                              registrationState: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={addFormData.phone}
                          onChange={(e) =>
                            setAddFormData({
                              ...addFormData,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cpf">CPF</Label>
                      <MaskedInput
                        id="cpf"
                        mask="999.999.999-99"
                        value={addFormData.cpf}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            cpf: e.target.value,
                          })
                        }
                        validation={cpfValidationAdd}
                        placeholder="000.000.000-00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Será sincronizado automaticamente entre User e UserProfile
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="department">Departamento</Label>
                      <Input
                        id="department"
                        value={addFormData.department}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            department: e.target.value,
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Funções Especiais</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isTechnicalManager"
                          checked={addFormData.isTechnicalManager}
                          onCheckedChange={(checked) =>
                            setAddFormData({
                              ...addFormData,
                              isTechnicalManager: checked as boolean,
                            })
                          }
                        />
                        <Label
                          htmlFor="isTechnicalManager"
                          className="cursor-pointer"
                        >
                          Responsável Técnico (RT) da ILPI
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isNursingCoordinator"
                          checked={addFormData.isNursingCoordinator}
                          onCheckedChange={(checked) =>
                            setAddFormData({
                              ...addFormData,
                              isNursingCoordinator: checked as boolean,
                            })
                          }
                        />
                        <Label
                          htmlFor="isNursingCoordinator"
                          className="cursor-pointer"
                        >
                          Coordenador de Enfermagem
                        </Label>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddUserModal(false);
                  resetAddForm();
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Adicionar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuário */}
      <Dialog
        open={editUserModal.open}
        onOpenChange={(open) => setEditUserModal({ ...editUserModal, open })}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Editar Perfil: {editUserModal.user?.name}
            </DialogTitle>
            <DialogDescription>
              Atualize as informações profissionais e ILPI do usuário
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                type="text"
                value={editFormData.name || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder="Nome completo do usuário"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-cpf">CPF</Label>
              <MaskedInput
                id="edit-cpf"
                mask="999.999.999-99"
                value={editFormData.cpf || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    cpf: e.target.value,
                  })
                }
                validation={cpfValidationEdit}
                placeholder="000.000.000-00"
                className="mt-2"
              />
            </div>

            <PositionCodeSelector
              value={editFormData.positionCode}
              onValueChange={(value) =>
                setEditFormData({ ...editFormData, positionCode: value })
              }
            />

            {editFormData.positionCode && (
              <>
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-registrationType">
                      Tipo de Registro
                    </Label>
                    <Select
                      value={editFormData.registrationType}
                      onValueChange={(value) =>
                        setEditFormData({
                          ...editFormData,
                          registrationType: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REGISTRATION_TYPE_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-registrationNumber">
                      Número do Registro
                    </Label>
                    <Input
                      id="edit-registrationNumber"
                      value={editFormData.registrationNumber}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          registrationNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-registrationState">
                    UF do Registro
                  </Label>
                  <Input
                    id="edit-registrationState"
                    maxLength={2}
                    value={editFormData.registrationState}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        registrationState: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="edit-department">Departamento</Label>
                  <Input
                    id="edit-department"
                    value={editFormData.department}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        department: e.target.value,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Funções Especiais</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isTechnicalManager"
                      checked={editFormData.isTechnicalManager}
                      onCheckedChange={(checked) =>
                        setEditFormData({
                          ...editFormData,
                          isTechnicalManager: checked,
                        })
                      }
                    />
                    <Label
                      htmlFor="edit-isTechnicalManager"
                      className="cursor-pointer"
                    >
                      Responsável Técnico (RT) da ILPI
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-isNursingCoordinator"
                      checked={editFormData.isNursingCoordinator}
                      onCheckedChange={(checked) =>
                        setEditFormData({
                          ...editFormData,
                          isNursingCoordinator: checked,
                        })
                      }
                    />
                    <Label
                      htmlFor="edit-isNursingCoordinator"
                      className="cursor-pointer"
                    >
                      Coordenador de Enfermagem
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditUserModal({ open: false, user: null })}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditUser} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  Rastreabilidade Obrigatória (RDC 502/2021 Art. 39)
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Toda exclusão de registro deve ter justificativa documentada para fins de auditoria e conformidade regulatória.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteReason" className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Motivo da Exclusão <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Ex: Desligamento do funcionário em 13/12/2025 - Pedido de demissão..."
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value);
                  setDeleteReasonError("");
                }}
                className={`min-h-[100px] ${deleteReasonError ? "border-red-500 focus:border-red-500" : ""}`}
              />
              {deleteReasonError && (
                <p className="text-sm text-red-600 mt-2">{deleteReasonError}</p>
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
    </div>
  );
}
