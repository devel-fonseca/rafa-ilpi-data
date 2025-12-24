import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PositionCodeSelector } from '@/components/users/PositionCodeSelector'
import { RoleSelectorWithSuggestion } from '@/components/users/RoleSelectorWithSuggestion'
import { MaskedInput } from '@/components/form/MaskedInput'
import { PositionCode, RegistrationType } from '@/types/permissions'
import { getRoleRecommendation, type UserRole } from '@/utils/roleRecommendation'
import { getMensagemValidacaoCPF } from '@/utils/validators'
import { getTenantUsers, getAllUserProfiles, updateUserProfile, createUserProfile } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'

export default function UserEditPage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfValidation, setCpfValidation] = useState({ valido: true, mensagem: '' })

  // Form state
  const [formData, setFormData] = useState({
    // Dados Básicos (não editáveis via profile)
    name: '',
    email: '',
    cpf: '',
    role: 'staff' as UserRole,

    // Perfil ILPI (editáveis)
    positionCode: null as PositionCode | null,
    department: '',
    registrationType: '' as RegistrationType | '',
    registrationNumber: '',
    registrationState: '',
    phone: '',
    birthDate: '',

    // Flags Especiais
    isTechnicalManager: false,
    isNursingCoordinator: false,
  })

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.tenantId || !userId) return

      try {
        setLoading(true)

        // Buscar todos os usuários e profiles
        const [usersData, profilesData] = await Promise.all([
          getTenantUsers(currentUser.tenantId),
          getAllUserProfiles(currentUser.tenantId),
        ])

        // Encontrar o usuário específico
        const user = usersData.find((u: any) => u.id === userId)
        const profile = profilesData.find((p: any) => p.userId === userId)

        if (!user) {
          toast.error('Usuário não encontrado')
          navigate('/dashboard/usuarios')
          return
        }

        // Mapear role do backend para frontend
        const roleMapping: Record<string, UserRole> = {
          ADMIN: 'admin',
          MANAGER: 'manager',
          USER: 'staff',
          VIEWER: 'viewer',
        }

        // Preencher formulário
        setFormData({
          name: user.name || '',
          email: user.email || '',
          cpf: user.cpf || profile?.cpf || '',
          role: roleMapping[user.role] || 'staff',
          positionCode: profile?.positionCode || null,
          department: profile?.department || '',
          registrationType: profile?.registrationType || '',
          registrationNumber: profile?.registrationNumber || '',
          registrationState: profile?.registrationState || '',
          phone: profile?.phone || '',
          birthDate: profile?.birthDate ? profile.birthDate.split('T')[0] : '',
          isTechnicalManager: profile?.isTechnicalManager || false,
          isNursingCoordinator: profile?.isNursingCoordinator || false,
        })
      } catch (error: any) {
        console.error('Erro ao carregar dados do usuário:', error)
        toast.error('Erro ao carregar dados do usuário')
        navigate('/dashboard/usuarios')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [userId, currentUser, navigate])

  // Validação de CPF em tempo real
  useEffect(() => {
    if (formData.cpf) {
      setCpfValidation(getMensagemValidacaoCPF(formData.cpf))
    } else {
      setCpfValidation({ valido: true, mensagem: '' })
    }
  }, [formData.cpf])

  // Atualizar role automaticamente quando cargo ou flags mudam
  useEffect(() => {
    if (formData.positionCode || formData.isTechnicalManager || formData.isNursingCoordinator) {
      const recommendation = getRoleRecommendation(
        formData.positionCode,
        formData.isTechnicalManager,
        formData.isNursingCoordinator
      )

      setFormData((prev) => ({
        ...prev,
        role: recommendation.suggestedRole,
      }))
    }
  }, [formData.positionCode, formData.isTechnicalManager, formData.isNursingCoordinator])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast.error('ID do usuário não encontrado')
      return
    }

    // Validar CPF se foi preenchido
    if (formData.cpf && !cpfValidation.valido) {
      toast.error('CPF inválido. Por favor, corrija antes de continuar.')
      return
    }

    try {
      setIsSubmitting(true)

      // Preparar dados do perfil
      const profileData: any = {
        positionCode: formData.positionCode || undefined,
        department: formData.department?.trim() || undefined,
        registrationType: formData.registrationType || undefined,
        registrationNumber: formData.registrationNumber?.trim() || undefined,
        registrationState: formData.registrationState?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        cpf: formData.cpf?.trim() || undefined,
        birthDate: formData.birthDate?.trim() || undefined,
        isTechnicalManager: formData.isTechnicalManager,
        isNursingCoordinator: formData.isNursingCoordinator,
      }

      // Atualizar perfil (ou criar se não existir)
      await updateUserProfile(userId, profileData)

      toast.success('Perfil atualizado com sucesso!')
      navigate('/dashboard/usuarios')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao atualizar perfil'

      // Se o perfil não existe, tentar criar
      if (errorMessage.includes('not found') || errorMessage.includes('não encontrado')) {
        try {
          await createUserProfile(userId, {
            positionCode: formData.positionCode || undefined,
            department: formData.department?.trim() || undefined,
            registrationType: formData.registrationType || undefined,
            registrationNumber: formData.registrationNumber?.trim() || undefined,
            registrationState: formData.registrationState?.trim() || undefined,
            phone: formData.phone?.trim() || undefined,
            cpf: formData.cpf?.trim() || undefined,
            birthDate: formData.birthDate?.trim() || undefined,
            isTechnicalManager: formData.isTechnicalManager,
            isNursingCoordinator: formData.isNursingCoordinator,
          })
          toast.success('Perfil criado com sucesso!')
          navigate('/dashboard/usuarios')
          return
        } catch (createError: any) {
          toast.error('Erro ao criar perfil: ' + (createError.response?.data?.message || createError.message))
        }
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/dashboard/usuarios')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/usuarios')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Lista de Usuários
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Save className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Editar Usuário</h1>
            <p className="text-muted-foreground">
              Atualize as informações do perfil do usuário
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Dados Básicos (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
            <CardDescription>
              Informações de identificação do usuário (somente leitura)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Nome e email não podem ser alterados aqui
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <MaskedInput
                  id="cpf"
                  mask="999.999.999-99"
                  value={formData.cpf}
                  onChange={(e) =>
                    setFormData({ ...formData, cpf: e.target.value })
                  }
                  validation={cpfValidation}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <RoleSelectorWithSuggestion
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  positionCode={formData.positionCode}
                  isTechnicalManager={formData.isTechnicalManager}
                  isNursingCoordinator={formData.isNursingCoordinator}
                  disabled={true}
                />
                <p className="text-xs text-muted-foreground">
                  Role é determinada pelo cargo e flags especiais
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Perfil ILPI */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil ILPI</CardTitle>
            <CardDescription>
              Cargo e departamento do colaborador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="positionCode">Cargo *</Label>
                <PositionCodeSelector
                  value={formData.positionCode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, positionCode: value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="Ex: Enfermagem, Administrativo..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Registro Profissional (Condicional) */}
        {formData.positionCode && (
          <Card>
            <CardHeader>
              <CardTitle>Registro Profissional</CardTitle>
              <CardDescription>
                Informações de registro no conselho profissional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationType">Tipo de Registro</Label>
                  <Select
                    value={formData.registrationType}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        registrationType: value as RegistrationType,
                      })
                    }
                  >
                    <SelectTrigger id="registrationType">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COREN">COREN (Enfermagem)</SelectItem>
                      <SelectItem value="CRM">CRM (Médico)</SelectItem>
                      <SelectItem value="CRF">CRF (Farmácia)</SelectItem>
                      <SelectItem value="CRN">CRN (Nutrição)</SelectItem>
                      <SelectItem value="CREFITO">CREFITO (Fisioterapia)</SelectItem>
                      <SelectItem value="CRP">CRP (Psicologia)</SelectItem>
                      <SelectItem value="CRESS">CRESS (Serviço Social)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Número do Registro</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationNumber: e.target.value,
                      })
                    }
                    placeholder="Ex: 123456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationState">Estado do Registro (UF)</Label>
                <Input
                  id="registrationState"
                  value={formData.registrationState}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registrationState: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ex: SP"
                  maxLength={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seção 4: Flags Especiais */}
        <Card>
          <CardHeader>
            <CardTitle>Flags Especiais</CardTitle>
            <CardDescription>
              Funções e responsabilidades especiais do usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <input
                type="checkbox"
                id="isTechnicalManager"
                checked={formData.isTechnicalManager}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isTechnicalManager: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="isTechnicalManager" className="font-semibold cursor-pointer">
                  Responsável Técnico (RT)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Profissional de nível superior responsável pela ILPI perante órgãos
                  reguladores (RDC 502/2021). Automaticamente receberá role "Admin".
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <input
                type="checkbox"
                id="isNursingCoordinator"
                checked={formData.isNursingCoordinator}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isNursingCoordinator: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="isNursingCoordinator" className="font-semibold cursor-pointer">
                  Coordenador de Enfermagem
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enfermeiro responsável pela equipe de enfermagem e assistência aos
                  residentes. Receberá no mínimo role "Manager".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  )
}
