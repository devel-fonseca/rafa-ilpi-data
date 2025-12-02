import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { getTenantUsers, addUserToTenant, removeUserFromTenant } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Mail, Shield, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

export default function UsersList() {
  const { user: currentUser } = useAuthStore()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addUserModal, setAddUserModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER',
    sendInviteEmail: true,
    temporaryPassword: '',
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    if (!currentUser?.tenantId) return

    try {
      setLoading(true)
      const data = await getTenantUsers(currentUser.tenantId)
      setUsers(data)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.response?.data?.message || 'Não foi possível carregar a lista de usuários',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.tenantId) return

    try {
      setSubmitting(true)

      await addUserToTenant(currentUser.tenantId, {
        name: formData.name,
        email: formData.email,
        role: formData.role as any,
        sendInviteEmail: formData.sendInviteEmail,
        temporaryPassword: formData.temporaryPassword || undefined,
      })

      toast({
        title: 'Usuário adicionado',
        description: `${formData.name} foi adicionado com sucesso`,
      })

      // Resetar formulário
      setFormData({
        name: '',
        email: '',
        role: 'USER',
        sendInviteEmail: true,
        temporaryPassword: '',
      })

      setAddUserModal(false)
      await loadUsers()
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar usuário',
        description: error.response?.data?.message || 'Não foi possível adicionar o usuário',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteModal.user || !currentUser?.tenantId) return

    try {
      await removeUserFromTenant(currentUser.tenantId, deleteModal.user.id)

      toast({
        title: 'Usuário removido',
        description: `${deleteModal.user.name} foi removido com sucesso`,
      })

      setDeleteModal({ open: false, user: null })
      await loadUsers()
    } catch (error: any) {
      toast({
        title: 'Erro ao remover usuário',
        description: error.response?.data?.message || 'Não foi possível remover o usuário',
        variant: 'destructive',
      })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'destructive'
      case 'MANAGER':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'Administrador'
      case 'MANAGER':
        return 'Gerente'
      case 'USER':
        return 'Usuário'
      case 'VIEWER':
        return 'Visualizador'
      default:
        return role
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e permissões da instituição
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
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })
                      : 'Nunca acessou'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteModal({ open: true, user })}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário. Ele receberá um email com instruções de acesso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="role">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="MANAGER">Gerente</SelectItem>
                  <SelectItem value="USER">Usuário</SelectItem>
                  <SelectItem value="VIEWER">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tempPassword">Senha Temporária (opcional)</Label>
              <Input
                id="tempPassword"
                type="password"
                placeholder="Deixe em branco para gerar automaticamente"
                value={formData.temporaryPassword}
                onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Se não informada, será gerada automaticamente
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddUserModal(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteModal.user?.user.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
