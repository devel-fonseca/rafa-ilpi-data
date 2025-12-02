import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useMyProfile, useUpdateProfile } from '@/hooks/queries/useUserProfile'
import { uploadFile } from '@/services/upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { PhotoUploadNew } from '@/components/form/PhotoUploadNew'
import { Loader2, User, Phone, Briefcase, Building2, Calendar, FileText } from 'lucide-react'
import { format } from 'date-fns'

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
    position: string
    department: string
    birthDate: string
    notes: string
  }>({
    profilePhoto: undefined,
    phone: '',
    position: '',
    department: '',
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
        position: profile.position || '',
        department: profile.department || '',
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
        position: formData.position || undefined,
        department: formData.department || undefined,
        birthDate: formData.birthDate || undefined,
        notes: formData.notes || undefined,
      })

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso',
      })

      // Limpar arquivo de foto após salvar
      setPhotoFile(null)
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.response?.data?.message || 'Não foi possível salvar as alterações',
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
        position: profile.position || '',
        department: profile.department || '',
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
                  <Label>Função</Label>
                  <Input
                    value={profile.user.role.toUpperCase()}
                    disabled
                    className="uppercase"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cargo */}
                <div>
                  <Label htmlFor="position" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Cargo
                  </Label>
                  <Input
                    id="position"
                    placeholder="Ex: Enfermeiro(a)"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                  />
                </div>

                {/* Departamento */}
                <div>
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Departamento
                  </Label>
                  <Input
                    id="department"
                    placeholder="Ex: Enfermagem"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                  />
                </div>
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
