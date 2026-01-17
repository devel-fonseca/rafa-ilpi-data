import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cleanCPF } from '@/utils/formatters'
import { addUserToTenant, createUserProfile } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { PlanLimitWarningDialog } from '@/components/admin/PlanLimitWarningDialog'
import { useMySubscription } from '@/hooks/useTenant'
import { Page, PageHeader } from '@/design-system/components'

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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfValidation, setCpfValidation] = useState({ valido: true, mensagem: '' })
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [hasSeenWarning, setHasSeenWarning] = useState(false)

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
        cpf: cleanCPF(formData.cpf), // Remove formatação (pontos e traços)
        phone: formData.phone?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        positionCode: formData.positionCode || undefined,
        role: roleMapping[formData.role],
        sendInviteEmail: formData.sendInviteEmail,
        temporaryPassword: formData.temporaryPassword || undefined,
      })

      // Verificar se o usuário foi criado corretamente
      if (!newUser || !newUser.id) {
        throw new Error('Usuário criado mas ID não foi retornado')
      }

      // 2. Atualizar perfil com dados adicionais (se houver)
      // CPF, phone, department e positionCode já foram criados na transação atômica do backend
      if (formData.registrationType || formData.registrationNumber || formData.birthDate) {
        const additionalProfileData = {
          registrationType: formData.registrationType || undefined,
          registrationNumber: formData.registrationNumber?.trim() || undefined,
          registrationState: formData.registrationState?.trim() || undefined,
          birthDate: formData.birthDate?.trim() || undefined,
          isTechnicalManager: formData.isTechnicalManager,
          isNursingCoordinator: formData.isNursingCoordinator,
        }

        await createUserProfile(newUser.id, additionalProfileData)
      }

      toast.success('Usuário criado com sucesso!')
      navigate('/dashboard/usuarios')
    } catch (error: unknown) {
      // Extrair mensagem de erro da resposta da API
      const errorMessage = 'Erro ao criar usuário'

      // Detectar erro de limite do plano
      if (errorMessage.includes('Limite de usuários') || errorMessage.includes('plano')) {
        toast.error(errorMessage, {
          duration: 10000,
          description: 'Considere fazer upgrade do plano para adicionar mais usuários à sua equipe.',
          action: {
            label: 'Ver Planos',
            onClick: () => {
              // Futuramente: navigate para página de planos/upgrade
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
    // Usuário decidiu prosseguir mesmo com o aviso
    // Dialog fecha automaticamente via onProceed
  }

  return (
    <Page>
      {/* Plan Limit Warning Dialog */}
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
        onBack={handleCancel}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
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

      <form onSubmit={handleSubmit} className="space-y-6 pb-16">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Dados Básicos</CardTitle>
            <CardDescription>
              Informações essenciais para acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex items-center space-x-2">
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
          </CardContent>
        </Card>

        {/* Permissões e Cargo */}
        <Card>
          <CardHeader>
            <CardTitle>🔐 Permissões e Cargo</CardTitle>
            <CardDescription>
              Defina o nível de acesso e função profissional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cargo ILPI */}
            <div className="space-y-2">
              <Label htmlFor="positionCode">Cargo ILPI</Label>
              <PositionCodeSelector
                value={formData.positionCode || ''}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    positionCode: value as PositionCode,
                  })
                }
                label=""
              />
              <p className="text-xs text-muted-foreground">
                O cargo determina as permissões técnicas e clínicas do usuário
              </p>
            </div>

            <Separator />

            {/* Flags Especiais */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Responsabilidades Especiais</p>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isTechnicalManager"
                  checked={formData.isTechnicalManager}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isTechnicalManager: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="isTechnicalManager"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Responsável Técnico da ILPI (RT)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isNursingCoordinator"
                  checked={formData.isNursingCoordinator}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isNursingCoordinator: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="isNursingCoordinator"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Coordenador de Enfermagem
                </label>
              </div>
            </div>

            <Separator />

            {/* Role do Sistema */}
            <RoleSelectorWithSuggestion
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
              positionCode={formData.positionCode}
              isTechnicalManager={formData.isTechnicalManager}
              isNursingCoordinator={formData.isNursingCoordinator}
            />
          </CardContent>
        </Card>

        {/* Registro Profissional */}
        {formData.positionCode && (
          <Card>
            <CardHeader>
              <CardTitle>📄 Registro Profissional</CardTitle>
              <CardDescription>
                Informações do conselho de classe (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      <SelectItem value="CRESS">
                        CRESS - Serviço Social
                      </SelectItem>
                      <SelectItem value="CREFITO">
                        CREFITO - Fisioterapia
                      </SelectItem>
                      <SelectItem value="CRN">CRN - Nutrição</SelectItem>
                      <SelectItem value="CREFONO">
                        CREFONO - Fonoaudiologia
                      </SelectItem>
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
            </CardContent>
          </Card>
        )}

        {/* Dados Administrativos */}
        <Card>
          <CardHeader>
            <CardTitle>🏢 Dados Administrativos</CardTitle>
            <CardDescription>
              Informações complementares (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </CardContent>
        </Card>

        {/* Botões finais fixos no rodapé */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end gap-2 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              'Criando...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Criar Usuário
              </>
            )}
          </Button>
        </div>
      </form>
    </Page>
  )
}
