import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useMyProfile, useUpdateProfile } from '@/hooks/queries/useUserProfile'
import { uploadFile } from '@/services/upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { PhotoUploadNew } from '@/components/form/PhotoUploadNew'
import { Loader2, User, Phone, Briefcase, Building2, Calendar, FileText, Shield, Award, KeyRound } from 'lucide-react'
import { format } from 'date-fns'
import { getErrorMessage } from '@/utils/errorHandling'
import {
  PositionCode,
  RegistrationType,
  POSITION_CODE_LABELS,
  REGISTRATION_TYPE_LABELS
} from '@/types/permissions'

export default function MyProfile() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  // React Query hooks
  const { data: profile, isLoading, isError, error, refetch } = useMyProfile()
  const updateProfileMutation = useUpdateProfile()

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

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
        birthDate: profile.birthDate ? format(new Date(profile.birthDate), 'yyyy-MM-dd') : '',
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
  }, [user?.id, refetch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      let photoUrl = formData.profilePhoto

      // Se há um novo arquivo de foto, fazer upload primeiro
      if (photoFile) {
        setUploadingPhoto(true)
        try {
          photoUrl = await uploadFile(photoFile, 'user-photos', user.id)
        } catch (uploadError: any) {
          toast({
            title: 'Erro ao fazer upload da foto',
            description: uploadError.message || 'Não foi possível enviar a foto',
            variant: 'destructive',
          })
          setUploadingPhoto(false)
          return
        }
        setUploadingPhoto(false)
      }

      await updateProfileMutation.mutateAsync({
        profilePhoto: photoUrl || undefined,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        notes: formData.notes || undefined,
      })

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso',
      })

      // Limpar arquivo de foto após salvar
      setPhotoFile(null)
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
        birthDate: profile.birthDate ? format(new Date(profile.birthDate), 'yyyy-MM-dd') : '',
        notes: profile.notes || '',
      })
      setPhotoFile(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Erro ao carregar perfil: {error?.message || 'Erro desconhecido'}
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Não foi possível carregar seu perfil
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isSaving = updateProfileMutation.isPending || uploadingPhoto

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e dados de contato
        </p>
      </div>

      <div className="grid gap-6">
        {/* Foto de Perfil + Informações da Conta */}
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
            <CardContent className="flex flex-col items-center">
              <PhotoUploadNew
                onPhotoSelect={setPhotoFile}
                currentPhotoUrl={formData.profilePhoto}
                label="Foto do Perfil"
                description="Clique para selecionar ou arraste uma imagem"
                maxSize={5}
              />
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

        {/* Autorização ILPI (Somente Leitura) */}
        {(profile.positionCode || profile.department || profile.isTechnicalManager || profile.isNursingCoordinator) && (
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
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
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
        )}

        {/* Dados Pessoais (Editáveis) */}
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
                  {uploadingPhoto ? 'Enviando foto...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
