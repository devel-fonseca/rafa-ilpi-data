/* eslint-disable no-restricted-syntax */
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useMyProfile, useUpdateProfile, useUploadAvatar, useRemoveAvatar } from '@/hooks/queries/useUserProfile'
import { useActiveSessions, useRevokeSession, useRevokeAllOtherSessions } from '@/hooks/queries/useActiveSessions'
import { useAccessLogs } from '@/hooks/queries/useAccessLogs'
import { changePassword } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, User, Phone, Briefcase, Building2, Calendar, FileText, Shield, Award, KeyRound, Eye, EyeOff, Wifi, Monitor, Smartphone, Tablet, X, History, AlertCircle, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { getErrorMessage } from '@/utils/errorHandling'
import { extractDateOnly } from '@/utils/dateHelpers'
import {
  PositionCode,
  RegistrationType,
  POSITION_CODE_LABELS,
  REGISTRATION_TYPE_LABELS
} from '@/types/permissions'
import { Page, PageHeader, EmptyState } from '@/design-system/components'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { useRef } from 'react'

export default function MyProfile() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const profileBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Meu Perfil' },
  ]

  // React Query hooks
  const { data: profile, isLoading, isError, error, refetch } = useMyProfile()
  const updateProfileMutation = useUpdateProfile()
  const uploadAvatarMutation = useUploadAvatar()
  const removeAvatarMutation = useRemoveAvatar()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<{
    profilePhoto: string | undefined
    phone: string
    birthDate: string
    notes: string
  }>({
    profilePhoto: undefined,
    phone: '',
    birthDate: '',
    notes: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [changingPassword, setChangingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Preencher formulário quando dados do perfil carregarem ou mudarem
  useEffect(() => {
    if (profile) {
      console.log('📝 MyProfile - Atualizando formulário com dados do perfil:', {
        userId: profile.user.id,
        userName: profile.user.name,
        userEmail: profile.user.email
      })
      setFormData({
        profilePhoto: profile.profilePhoto || undefined,
        phone: profile.phone || '',
        birthDate: profile.birthDate ? extractDateOnly(profile.birthDate) : '',
        notes: profile.notes || '',
      })
    }
  }, [profile])

  // Recarregar perfil quando usuário mudar
  useEffect(() => {
    console.log('🔄 MyProfile - useEffect disparado. User:', {
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email
    })
    if (user) {
      console.log('🔄 MyProfile - Disparando refetch do perfil...')
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refetch])

  // Handler para mudança de arquivo (upload imediato com processamento)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Selecione um arquivo de imagem válido',
        variant: 'destructive',
      })
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      })
      return
    }

    try {
      // Processar imagem com detecção facial, resize e conversão para WebP
      const { processImageWithFaceDetection } = await import('@/services/faceDetection')
      const result = await processImageWithFaceDetection(file)

      // Criar File a partir do blob processado
      const webpFile = new File([result.blob], 'avatar.webp', {
        type: 'image/webp',
      })

      // Upload do arquivo processado
      await uploadAvatarMutation.mutateAsync(webpFile)

      toast({
        title: 'Foto atualizada',
        description: result.hasFace
          ? 'Rosto detectado e foto atualizada com sucesso'
          : 'Foto atualizada com sucesso',
      })
    } catch (error: unknown) {
      toast({
        title: 'Erro ao atualizar foto',
        description: getErrorMessage(error, 'Não foi possível atualizar a foto'),
        variant: 'destructive',
      })
    } finally {
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handler para remoção imediata de avatar
  const handleAvatarRemove = async () => {
    try {
      await removeAvatarMutation.mutateAsync()
      toast({
        title: 'Foto removida',
        description: 'Sua foto de perfil foi removida com sucesso',
      })
    } catch (error: unknown) {
      toast({
        title: 'Erro ao remover foto',
        description: getErrorMessage(error, 'Não foi possível remover a foto'),
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      await updateProfileMutation.mutateAsync({
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        notes: formData.notes || undefined,
      })

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso',
      })
    } catch (error: unknown) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: getErrorMessage(error, 'Não foi possível salvar as alterações'),
        variant: 'destructive',
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        profilePhoto: profile.profilePhoto || undefined,
        phone: profile.phone || '',
        birthDate: profile.birthDate ? extractDateOnly(profile.birthDate) : '',
        notes: profile.notes || '',
      })
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Validações
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos de senha',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter no mínimo 8 caracteres',
        variant: 'destructive',
      })
      return
    }

    // Validar complexidade da senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!passwordRegex.test(passwordData.newPassword)) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
        variant: 'destructive',
      })
      return
    }

    try {
      setChangingPassword(true)

      await changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso',
      })

      // Limpar campos
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: unknown) {
      toast({
        title: 'Erro ao alterar senha',
        description: getErrorMessage(error, 'Não foi possível alterar a senha'),
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Meu Perfil"
          subtitle="Carregando informações..."
          breadcrumbs={profileBreadcrumbs}
        />
        <EmptyState
          icon={Loader2}
          title="Carregando seu perfil..."
          description="Aguarde enquanto buscamos suas informações"
          variant="info"
        />
      </Page>
    )
  }

  if (isError) {
    return (
      <Page>
        <PageHeader
          title="Meu Perfil"
          subtitle="Erro ao carregar dados"
          breadcrumbs={profileBreadcrumbs}
        />
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar perfil"
          description={error?.message || 'Não foi possível carregar suas informações. Tente novamente.'}
          variant="error"
          action={
            <Button onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          }
        />
      </Page>
    )
  }

  if (!profile) {
    return (
      <Page>
        <PageHeader
          title="Meu Perfil"
          subtitle="Perfil não encontrado"
          breadcrumbs={profileBreadcrumbs}
        />
        <EmptyState
          icon={User}
          title="Perfil não encontrado"
          description="Não foi possível carregar seu perfil"
        />
      </Page>
    )
  }

  const isSaving = updateProfileMutation.isPending

  return (
    <Page maxWidth="wide">
      <PageHeader
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais e dados de contato"
        breadcrumbs={profileBreadcrumbs}
      />

      {/* Abas: Conta, Dados Pessoais, Alterar Senha, Autorização ILPI, Sessões Ativas e Logs de Acesso */}
      <Tabs defaultValue="account" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-6 min-w-max">
            <TabsTrigger value="account" className="whitespace-nowrap">
              <User className="h-4 w-4 mr-2" />
              Conta
            </TabsTrigger>
            <TabsTrigger value="personal" className="whitespace-nowrap">
              <FileText className="h-4 w-4 mr-2" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="password" className="whitespace-nowrap">
              <KeyRound className="h-4 w-4 mr-2" />
              Alterar Senha
            </TabsTrigger>
            <TabsTrigger value="authorization" disabled={!(profile.positionCode || profile.department || profile.isTechnicalManager || profile.isNursingCoordinator)} className="whitespace-nowrap">
              <Shield className="h-4 w-4 mr-2" />
              Autorização ILPI
            </TabsTrigger>
            <TabsTrigger value="sessions" className="whitespace-nowrap">
              <Wifi className="h-4 w-4 mr-2" />
              Sessões Ativas
            </TabsTrigger>
            <TabsTrigger value="access-logs" className="whitespace-nowrap">
              <History className="h-4 w-4 mr-2" />
              Histórico de Acesso
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Aba: Conta (Foto de Perfil + Informações da Conta) */}
        <TabsContent value="account" className="space-y-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card de Foto (1/3) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Sua foto de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {/* Avatar Preview */}
              {profile?.profilePhoto ? (
                <div className="relative inline-block">
                  <PhotoViewer
                    photoUrl={profile.profilePhoto}
                    altText="Foto de perfil"
                    size="md"
                    rounded
                    className="!w-24 !h-24 sm:!w-32 sm:!h-32"
                  />

                  {/* Loading Overlay */}
                  {(uploadAvatarMutation.isPending || removeAvatarMutation.isPending) && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" />
                    </div>
                  )}

                  {/* Remove Button */}
                  {!uploadAvatarMutation.isPending && !removeAvatarMutation.isPending && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 sm:p-2 shadow-lg transition-colors"
                      title="Remover foto"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                </div>
              )}

              {/* Upload Button */}
              <div className="flex flex-col items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatarMutation.isPending || removeAvatarMutation.isPending}
                  className="w-full max-w-xs"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {profile?.profilePhoto ? 'Trocar Foto' : 'Adicionar Foto'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  JPG, PNG ou WEBP (máximo 5MB)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Conta (2/3) */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
              <CardDescription>
                Dados de autenticação e autorização (gerenciados pelo administrador)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input value={profile.user.name} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={profile.user.email} disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={profile.user.cpf || profile.cpf || ''}
                    placeholder="Não informado"
                    disabled
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input
                    value={profile.user.isActive ? 'Ativo' : 'Inativo'}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* Aba: Dados Pessoais */}
        <TabsContent value="personal" className="space-y-0">
          <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Informações que você pode atualizar a qualquer momento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Telefone */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <Label htmlFor="birthDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Nascimento
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                />
              </div>

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Notas / Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais sobre você..."
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
          </form>
        </TabsContent>

        {/* Aba: Alterar Senha */}
        <TabsContent value="password" className="space-y-0">
          <form onSubmit={handlePasswordChange}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura alterando sua senha regularmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Senha Atual */}
              <div>
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  disabled={changingPassword}
                />
              </div>

              {/* Nova Senha */}
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Digite sua nova senha"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    disabled={changingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial
                </p>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite novamente sua nova senha"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    disabled={changingPassword}
                    className={
                      passwordData.confirmPassword &&
                      passwordData.newPassword &&
                      passwordData.confirmPassword.length >= passwordData.newPassword.length &&
                      passwordData.confirmPassword !== passwordData.newPassword
                        ? 'border-danger focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordData.confirmPassword &&
                 passwordData.newPassword &&
                 passwordData.confirmPassword.length >= passwordData.newPassword.length &&
                 passwordData.confirmPassword !== passwordData.newPassword && (
                  <p className="text-xs text-danger mt-1">
                    As senhas não conferem
                  </p>
                )}
                {passwordData.confirmPassword &&
                 passwordData.newPassword &&
                 passwordData.confirmPassword === passwordData.newPassword && (
                  <p className="text-xs text-success mt-1">
                    ✓ As senhas conferem
                  </p>
                )}
              </div>

              {/* Botão */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
          </form>
        </TabsContent>

        {/* Aba: Autorização ILPI */}
        <TabsContent value="authorization" className="space-y-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Autorização e Estrutura Corporativa ILPI
              </CardTitle>
              <CardDescription>
                Informações de autorização gerenciadas pelo Administrador, RT ou Administrativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cargo ILPI */}
                {profile.positionCode && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Cargo ILPI
                    </Label>
                    <div className="mt-2">
                      <Badge variant="default" className="text-sm py-1 px-3">
                        {POSITION_CODE_LABELS[profile.positionCode as PositionCode]}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Departamento */}
                {profile.department && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Departamento
                    </Label>
                    <div className="mt-2">
                      <div className="text-sm font-medium">
                        {profile.department}
                      </div>
                    </div>
                  </div>
                )}

                {/* Registro Profissional */}
                {profile.registrationType && profile.registrationNumber && (
                  <div>
                    <Label>Registro Profissional</Label>
                    <div className="mt-2 space-y-1">
                      <div className="font-medium text-sm">
                        {REGISTRATION_TYPE_LABELS[profile.registrationType as RegistrationType]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.registrationNumber}
                        {profile.registrationState && ` - ${profile.registrationState}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges especiais */}
              {(profile.isTechnicalManager || profile.isNursingCoordinator) && (
                <div className="pt-2">
                  <Label className="mb-2 block">Responsabilidades Especiais</Label>
                  <div className="flex gap-2 flex-wrap">
                    {profile.isTechnicalManager && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        <Award className="h-3 w-3 mr-1" />
                        Responsável Técnico (RT)
                      </Badge>
                    )}
                    {profile.isNursingCoordinator && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Coordenador de Enfermagem
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Aviso de permissões */}
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Estas informações só podem ser alteradas por usuários com permissão administrativa.
                  Entre em contato com o Administrador, RT ou setor Administrativo para solicitar alterações.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Sessões Ativas */}
        <TabsContent value="sessions" className="space-y-0">
          <SessionsTab userId={user?.id || ''} />
        </TabsContent>

        {/* Aba: Histórico de Acesso */}
        <TabsContent value="access-logs" className="space-y-0">
          <AccessLogsTab userId={user?.id || ''} />
        </TabsContent>
      </Tabs>
    </Page>
  )
}

// ==================== COMPONENTE: Sessões Ativas ====================
function SessionsTab({ userId }: { userId: string }) {
  const { toast } = useToast()
  const { data, isLoading } = useActiveSessions(userId)
  const revokeSessionMutation = useRevokeSession(userId)
  const revokeAllMutation = useRevokeAllOtherSessions(userId)

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync(sessionId)
      toast({
        title: 'Sessão encerrada',
        description: 'A sessão foi encerrada com sucesso.',
      })
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao encerrar sessão',
        description: errorResponse?.data?.message || 'Ocorreu um erro ao encerrar a sessão.',
      })
    }
  }

  const handleRevokeAll = async () => {
    try {
      const result = await revokeAllMutation.mutateAsync()
      toast({
        title: 'Sessões encerradas',
        description: result.message || 'Todas as outras sessões foram encerradas.',
      })
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao encerrar sessões',
        description: errorResponse?.data?.message || 'Ocorreu um erro ao encerrar as sessões.',
      })
    }
  }

  const getDeviceIcon = (device: string) => {
    const deviceLower = device.toLowerCase()
    if (deviceLower.includes('mobile') || deviceLower.includes('android') || deviceLower.includes('ios')) {
      return <Smartphone className="h-5 w-5" />
    }
    if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
      return <Tablet className="h-5 w-5" />
    }
    return <Monitor className="h-5 w-5" />
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const sessions = data?.sessions || []
  const currentSession = sessions.find(s => s.isCurrent)
  const otherSessions = sessions.filter(s => !s.isCurrent)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Sessões Ativas
        </CardTitle>
        <CardDescription>
          Gerencie os dispositivos conectados à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma sessão ativa encontrada.
          </p>
        ) : (
          <>
            {/* Sessão Atual */}
            {currentSession && (
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getDeviceIcon(currentSession.device)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{currentSession.device}</p>
                        <Badge variant="default" className="text-xs">
                          Sessão Atual
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        IP: {currentSession.ipAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Login: {format(new Date(currentSession.loginAt), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Última atividade: {format(new Date(currentSession.lastActivityAt), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Outras Sessões */}
            {otherSessions.length > 0 && (
              <>
                <div className="space-y-3">
                  {otherSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getDeviceIcon(session.device)}
                          <div className="flex-1">
                            <p className="font-medium">{session.device}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              IP: {session.ipAddress}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Login: {format(new Date(session.loginAt), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Última atividade: {format(new Date(session.lastActivityAt), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokeSessionMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão Encerrar Todas */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleRevokeAll}
                    disabled={revokeAllMutation.isPending}
                  >
                    {revokeAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Encerrar Todas as Outras Sessões
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== COMPONENTE: Histórico de Acesso ====================
function AccessLogsTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined)
  const limit = 30

  const { data, isLoading } = useAccessLogs(userId, {
    limit,
    offset: page * limit,
    action: actionFilter,
  })

  const ACTION_LABELS: Record<string, string> = {
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    PASSWORD_CHANGED: 'Senha Alterada',
    SESSION_REVOKED: 'Sessão Revogada',
    FORCE_PASSWORD_CHANGE: 'Troca Forçada de Senha',
  }

  const ACTION_COLORS: Record<string, string> = {
    LOGIN: 'bg-primary/10 text-primary/90',
    LOGOUT: 'bg-muted text-foreground/90',
    PASSWORD_CHANGED: 'bg-warning/10 text-warning/90',
    SESSION_REVOKED: 'bg-danger/10 text-danger/90',
    FORCE_PASSWORD_CHANGE: 'bg-severity-warning/10 text-severity-warning/90',
  }

  const STATUS_COLORS: Record<string, string> = {
    SUCCESS: 'bg-success/10 text-success/90',
    FAILED: 'bg-danger/10 text-danger/90',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Acesso
        </CardTitle>
        <CardDescription>
          Registro de logins, logouts, alterações de senha e sessões revogadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtro por Ação */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <Button
            variant={actionFilter === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActionFilter(undefined)
              setPage(0)
            }}
          >
            Todas
          </Button>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={actionFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActionFilter(key)
                setPage(0)
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum log de acesso encontrado
          </div>
        ) : (
          <>
            {/* Tabela de Logs */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Data/Hora</th>
                    <th className="text-left p-3 text-sm font-medium">Ação</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">IP</th>
                    <th className="text-left p-3 text-sm font-medium">Dispositivo</th>
                    <th className="text-left p-3 text-sm font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                    >
                      <td className="p-3 text-sm">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge className={ACTION_COLORS[log.action] || 'bg-muted text-foreground/90'}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <Badge className={STATUS_COLORS[log.status] || 'bg-muted text-foreground/90'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {log.ipAddress}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {log.device || '-'}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, data.total)} de {data.total} registros
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.hasMore}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
