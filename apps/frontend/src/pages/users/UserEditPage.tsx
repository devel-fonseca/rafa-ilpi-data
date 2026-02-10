import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, User as UserIcon, Briefcase, ClipboardList, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import type { User, UserProfile } from '@/types/user'
import { getTenantUsers, getAllUserProfiles, updateUserProfile, createUserProfile } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Page, PageHeader, EmptyState, StatusBadge } from '@/design-system/components'

type UserEditSection = 'basico' | 'perfil' | 'registro' | 'flags'

export default function UserEditPage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfValidation, setCpfValidation] = useState({ valido: true, mensagem: '' })
  const [userIsActive, setUserIsActive] = useState(true)

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
  const [activeSection, setActiveSection] = useState<UserEditSection>('basico')

  const sections = useMemo(
    () => [
      {
        id: 'basico' as const,
        title: 'Dados Básicos',
        subtitle: 'Identificação e acesso',
        icon: UserIcon,
      },
      {
        id: 'perfil' as const,
        title: 'Perfil',
        subtitle: 'Cargo e dados do colaborador',
        icon: Briefcase,
      },
      {
        id: 'registro' as const,
        title: 'Registro Profissional',
        subtitle: 'Conselho e número de registro',
        icon: ClipboardList,
      },
      {
        id: 'flags' as const,
        title: 'Flags Especiais',
        subtitle: 'Funções regulatórias',
        icon: Flag,
      },
    ].filter((section) => section.id !== 'registro' || !!formData.positionCode),
    [formData.positionCode]
  )

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser?.tenantId || !userId) return

      try {
        setLoading(true)

        // Buscar todos os usuários e profiles
        const [usersData, profilesData] = await Promise.all([
          getTenantUsers(currentUser.tenantId),
          getAllUserProfiles(),
        ])

        // Encontrar o usuário específico
        const user = usersData.find((u: User) => u.id === userId)
        const profile = profilesData.find((p: UserProfile) => p.userId === userId)

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

        // Salvar status do usuário
        setUserIsActive(user.isActive ?? true)

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
      } catch (error: unknown) {
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

  useEffect(() => {
    if (activeSection === 'registro' && !formData.positionCode) {
      setActiveSection('perfil')
    }
  }, [activeSection, formData.positionCode])

  const buildProfilePayload = () => ({
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

      // Atualizar perfil (ou criar se não existir)
      await updateUserProfile(userId, buildProfilePayload())

      toast.success('Perfil atualizado com sucesso!')
      navigate('/dashboard/usuarios')
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } }; message?: string })
      const errorMessage = errorResponse.response?.data?.message || errorResponse.message || 'Erro ao atualizar perfil'

      // Se o perfil não existe, tentar criar
      if (errorMessage.includes('not found') || errorMessage.includes('não encontrado')) {
        try {
          await createUserProfile(userId, buildProfilePayload())
          toast.success('Perfil criado com sucesso!')
          navigate('/dashboard/usuarios')
          return
        } catch (createError: unknown) {
          const createErrorResponse = (createError as { response?: { data?: { message?: string } }; message?: string })
          toast.error('Erro ao criar perfil: ' + (createErrorResponse.response?.data?.message || createErrorResponse.message))
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
      <Page>
        <PageHeader
          title="Editar Usuário"
          subtitle="Carregando informações..."
          backButton={{ onClick: () => navigate('/dashboard/usuarios') }}
        />
        <EmptyState
          icon={Loader2}
          title="Carregando dados do usuário..."
          description="Aguarde enquanto buscamos as informações"
          variant="default"
        />
      </Page>
    )
  }

  const renderBasicSection = () => (
    <div className="space-y-4">
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
            Nome e email são gerenciados no cadastro de autenticação.
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
    </div>
  )

  const renderProfileSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <PositionCodeSelector
            value={formData.positionCode ?? undefined}
            onValueChange={(value) => {
              const isTechManager = value === PositionCode.TECHNICAL_MANAGER
              setFormData({
                ...formData,
                positionCode: value,
                // Marca automaticamente a flag se cargo for Responsável Técnico
                ...(isTechManager && { isTechnicalManager: true }),
              })
            }}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          Role é determinada por cargo e flags especiais.
        </p>
      </div>
    </div>
  )

  const renderRegistrationSection = () => (
    <div className="space-y-4">
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

      <div className="space-y-2 md:max-w-[220px]">
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
    </div>
  )

  const renderFlagsSection = () => (
    <div className="space-y-4">
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
            reguladores (RDC 502/2021). Automaticamente receberá role Admin.
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
            residentes. Receberá no mínimo role Manager.
          </p>
        </div>
      </div>
    </div>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'basico':
        return renderBasicSection()
      case 'perfil':
        return renderProfileSection()
      case 'registro':
        return renderRegistrationSection()
      case 'flags':
        return renderFlagsSection()
      default:
        return null
    }
  }

  return (
    <Page maxWidth="full">
      <PageHeader
        title="Editar Usuário"
        subtitle="Atualize o perfil institucional do usuário"
        backButton={{ onClick: () => navigate('/dashboard/usuarios') }}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" form="user-edit-form" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        }
      />

      <form id="user-edit-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:items-start">
          <Card className="h-fit sticky top-4">
            <CardContent className="p-0">
              {/* Header */}
              <div className="px-4 py-3 border-b bg-primary/10 rounded-t-lg">
                <h3 className="font-semibold text-sm text-primary">Navegação do cadastro</h3>
                <p className="text-xs text-muted-foreground">Edição por seções</p>
              </div>

              <ScrollArea className="h-[calc(100vh-280px)] max-h-[450px]">
                <nav className="p-2 space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon
                    const isActive = activeSection === section.id

                    return (
                      <button
                        type="button"
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block">{section.title}</span>
                          <span className={cn(
                            'text-xs block truncate',
                            isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}>
                            {section.subtitle}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-0 min-w-0">
              {/* User Header */}
              <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-primary">{formData.name}</h2>
                  <StatusBadge variant={userIsActive ? 'success' : 'warning'}>
                    {userIsActive ? 'Ativo' : 'Inativo'}
                  </StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {sections.find(s => s.id === activeSection)?.title} • {sections.find(s => s.id === activeSection)?.subtitle}
                </p>
              </div>

              {/* Section Content */}
              <div className="p-6 min-w-0">
                {renderActiveSection()}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </Page>
  )
}
