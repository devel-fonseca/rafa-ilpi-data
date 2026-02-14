import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, User, Briefcase, ClipboardList, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cleanCPF } from '@/utils/formatters'
import { addUserToTenant, updateUserProfile } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PlanLimitWarningDialog } from '@/components/admin/PlanLimitWarningDialog'
import { useMySubscription } from '@/hooks/useTenant'
import { Page, PageHeader } from '@/design-system/components'

type UserCreateSection = 'basico' | 'perfil' | 'registro' | 'flags'

export default function UserCreatePage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()

  // Form state
  const [formData, setFormData] = useState({
    // Dados Básicos
    name: '',
    email: '',
    cpf: '',
    role: 'staff' as UserRole,
    sendInviteEmail: true,
    temporaryPassword: '',

    // Perfil ILPI
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

  const [activeSection, setActiveSection] = useState<UserCreateSection>('basico')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfValidation, setCpfValidation] = useState({ valido: true, mensagem: '' })
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [hasSeenWarning, setHasSeenWarning] = useState(false)

  const sections = useMemo(
    () => [
      {
        id: 'basico' as const,
        title: 'Dados Básicos',
        subtitle: 'Informações de acesso ao sistema',
        icon: User,
      },
      {
        id: 'perfil' as const,
        title: 'Perfil',
        subtitle: 'Cargo, contato e permissões',
        icon: Briefcase,
      },
      {
        id: 'registro' as const,
        title: 'Registro Profissional',
        subtitle: 'Conselho e número do registro',
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

  // Buscar dados de subscription para verificar limites
  const { data: subscriptionData } = useMySubscription()

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

  // Verificar limite ao entrar na página (apenas uma vez e se não viu ainda)
  useEffect(() => {
    if (!subscriptionData || hasSeenWarning) return

    const { usage, plan } = subscriptionData
    const percentage = plan.maxUsers > 0 ? (usage.activeUsers / plan.maxUsers) * 100 : 0

    // Mostrar dialog se >= 80% do limite
    if (percentage >= 80) {
      setShowLimitDialog(true)
      setHasSeenWarning(true)
    }
  }, [subscriptionData, hasSeenWarning])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.tenantId) {
      toast.error('Erro ao identificar tenant')
      return
    }

    // Validações básicas
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Email é obrigatório')
      return
    }

    // Validar CPF (obrigatório)
    if (!formData.cpf || !formData.cpf.trim()) {
      toast.error('CPF é obrigatório')
      return
    }

    if (!cpfValidation.valido) {
      toast.error('CPF inválido. Por favor, corrija antes de continuar.')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Criar usuário
      // Mapear 'staff' para 'USER' (nomenclatura do backend)
      const roleMapping: Record<UserRole, 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'> = {
        admin: 'ADMIN',
        manager: 'MANAGER',
        staff: 'USER',
        viewer: 'VIEWER',
      }

      const newUser = await addUserToTenant(currentUser.tenantId, {
        name: formData.name,
        email: formData.email,
        cpf: cleanCPF(formData.cpf) || '',
        role: roleMapping[formData.role],
        phone: formData.phone?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        positionCode: formData.positionCode || undefined,
        sendInviteEmail: formData.sendInviteEmail,
        temporaryPassword: formData.temporaryPassword || undefined,
      })

      // Verificar se o usuário foi criado corretamente
      if (!newUser || !newUser.id) {
        throw new Error('Usuário criado mas ID não foi retornado')
      }

      // 2. Atualizar perfil institucional do colaborador
      const profileData = {
        cpf: cleanCPF(formData.cpf),
        phone: formData.phone?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        positionCode: formData.positionCode || undefined,
        registrationType: formData.registrationType || undefined,
        registrationNumber: formData.registrationNumber?.trim() || undefined,
        registrationState: formData.registrationState?.trim() || undefined,
        birthDate: formData.birthDate?.trim() || undefined,
        isTechnicalManager: formData.isTechnicalManager,
        isNursingCoordinator: formData.isNursingCoordinator,
      }

      await updateUserProfile(newUser.id, profileData)

      toast.success('Usuário criado com sucesso!')
      navigate('/dashboard/usuarios')
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } }
      }
      const backendMessage = err.response?.data?.message
      const errorMessage = Array.isArray(backendMessage)
        ? backendMessage.join(' • ')
        : backendMessage || 'Erro ao criar usuário'

      if (errorMessage.includes('Limite de usuários') || errorMessage.includes('plano')) {
        toast.error(errorMessage, {
          duration: 10000,
          description: 'Considere fazer upgrade do plano para adicionar mais usuários à sua equipe.',
          action: {
            label: 'Ver Planos',
            onClick: () => {
              window.open('https://wa.me/5511999999999?text=Gostaria%20de%20fazer%20upgrade%20do%20plano', '_blank')
            },
          },
        })
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

  const handleProceedWithWarning = () => {
    // Dialog fecha automaticamente via onProceed
  }

  const renderBasicSection = () => (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
          <h2 className="text-lg font-semibold text-primary">Dados Básicos</h2>
          <p className="text-sm text-muted-foreground">Informações essenciais para criação do usuário</p>
        </div>
        <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: João Silva Santos"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="usuario@exemplo.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF*</Label>
            <MaskedInput
              id="cpf"
              mask="999.999.999-99"
              value={formData.cpf}
              onChange={(e) =>
                setFormData({ ...formData, cpf: e.target.value })
              }
              validation={cpfValidation}
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="temporaryPassword">Senha Temporária</Label>
            <Input
              id="temporaryPassword"
              type="password"
              value={formData.temporaryPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  temporaryPassword: e.target.value,
                })
              }
              placeholder="Deixe vazio para gerar automaticamente"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="sendInviteEmail"
            checked={formData.sendInviteEmail}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                sendInviteEmail: checked as boolean,
              })
            }
          />
          <label
            htmlFor="sendInviteEmail"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enviar email de convite com instruções de acesso
          </label>
        </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderProfileSection = () => (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
          <h2 className="text-lg font-semibold text-primary">Perfil</h2>
          <p className="text-sm text-muted-foreground">Cargo, departamento e permissões do colaborador</p>
        </div>
        <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <PositionCodeSelector
              value={formData.positionCode ?? undefined}
              onValueChange={(value) => {
                const isTechManager = value === PositionCode.TECHNICAL_MANAGER
                setFormData({
                  ...formData,
                  positionCode: value as PositionCode,
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
              placeholder="Ex: Enfermagem"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
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
            onValueChange={(value) =>
              setFormData({ ...formData, role: value })
            }
            positionCode={formData.positionCode}
            isTechnicalManager={formData.isTechnicalManager}
            isNursingCoordinator={formData.isNursingCoordinator}
          />
          <p className="text-xs text-muted-foreground">
            Role é determinada por cargo e flags especiais.
          </p>
        </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderRegistrationSection = () => (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
          <h2 className="text-lg font-semibold text-primary">Registro Profissional</h2>
          <p className="text-sm text-muted-foreground">Informações do conselho de classe</p>
        </div>
        <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COREN">COREN - Enfermagem</SelectItem>
                <SelectItem value="CRM">CRM - Medicina</SelectItem>
                <SelectItem value="CRP">CRP - Psicologia</SelectItem>
                <SelectItem value="CRESS">CRESS - Serviço Social</SelectItem>
                <SelectItem value="CREFITO">CREFITO - Fisioterapia</SelectItem>
                <SelectItem value="CRN">CRN - Nutrição</SelectItem>
                <SelectItem value="CREFONO">CREFONO - Fonoaudiologia</SelectItem>
                <SelectItem value="NONE">Sem Registro</SelectItem>
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

          <div className="space-y-2">
            <Label htmlFor="registrationState">UF do Registro</Label>
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
        </div>
      </CardContent>
    </Card>
  )

  const renderFlagsSection = () => (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
          <h2 className="text-lg font-semibold text-primary">Flags Especiais</h2>
          <p className="text-sm text-muted-foreground">Responsabilidades especiais atribuídas ao usuário</p>
        </div>
        <div className="p-6 space-y-4">
        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <Checkbox
            id="isTechnicalManager"
            checked={formData.isTechnicalManager}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                isTechnicalManager: checked as boolean,
              })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="isTechnicalManager" className="font-semibold cursor-pointer">
              Responsável Técnico (RT)
            </Label>
            <p className="text-sm text-muted-foreground">
              Profissional responsável pela ILPI perante órgãos reguladores.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <Checkbox
            id="isNursingCoordinator"
            checked={formData.isNursingCoordinator}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                isNursingCoordinator: checked as boolean,
              })
            }
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="isNursingCoordinator" className="font-semibold cursor-pointer">
              Coordenador de Enfermagem
            </Label>
            <p className="text-sm text-muted-foreground">
              Enfermeiro responsável pela equipe de enfermagem e assistência aos residentes.
            </p>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
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
      {subscriptionData && (
        <PlanLimitWarningDialog
          type="users"
          open={showLimitDialog}
          onOpenChange={setShowLimitDialog}
          onProceed={handleProceedWithWarning}
          usage={{
            current: subscriptionData.usage.activeUsers,
            max: subscriptionData.plan.maxUsers,
          }}
        />
      )}

      <PageHeader
        title="Novo Usuário"
        subtitle="Adicione um novo colaborador ao sistema"
        backButton={{ onClick: handleCancel }}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" form="user-create-form" disabled={isSubmitting}>
              {isSubmitting ? (
                'Criando...'
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Usuário
                </>
              )}
            </Button>
          </div>
        }
      />

      <form id="user-create-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:items-start">
          <Card className="h-fit sticky top-4">
            <CardContent className="p-0">
              {/* Header */}
              <div className="px-4 py-3 border-b bg-primary/10 rounded-t-lg">
                <h3 className="font-semibold text-sm text-primary">Navegação do cadastro</h3>
                <p className="text-xs text-muted-foreground">Preenchimento por seções</p>
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

          <div className="space-y-6">
            {renderActiveSection()}
          </div>
        </div>
      </form>
    </Page>
  )
}
