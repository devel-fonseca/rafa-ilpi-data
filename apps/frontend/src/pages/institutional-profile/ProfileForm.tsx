import { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useProfile, useUpdateProfile, useUploadLogo } from '@/hooks/useInstitutionalProfile'
import { Upload, Loader2, Building2 } from 'lucide-react'
import type { LegalNature } from '@/api/institutional-profile.api'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import { buscarCEP } from '@/services/viacep'

const profileSchema = z.object({
  // Dados do Profile
  legalNature: z.enum(['ASSOCIACAO', 'FUNDACAO', 'EMPRESA_PRIVADA', 'MEI']).optional(),
  tradeName: z.string().optional(),
  cnesCode: z.string().max(20).optional(),
  capacityDeclared: z.number().min(1).optional().or(z.literal('')),
  capacityLicensed: z.number().min(1).optional().or(z.literal('')),
  websiteUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  foundedAt: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.string().optional(),
  notes: z.string().optional(),

  // Dados do Tenant (sincronizados)
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  addressZipCode: z.string().max(9).optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressDistrict: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const legalNatureLabels: Record<LegalNature, string> = {
  ASSOCIACAO: 'Associação sem fins lucrativos',
  FUNDACAO: 'Fundação privada',
  EMPRESA_PRIVADA: 'Empresa privada',
  MEI: 'Microempreendedor Individual (MEI)',
}

export function ProfileForm() {
  const { toast } = useToast()
  const { data: fullProfile, isLoading } = useProfile()
  const updateMutation = useUpdateProfile()
  const uploadLogoMutation = useUploadLogo()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const legalNature = watch('legalNature')

  // Log sempre que legalNature mudar
  useEffect(() => {
    console.log('🔄 [ProfileForm] legalNature do watch mudou para:', legalNature)
  }, [legalNature])

  // Carregar dados do perfil quando disponível
  useEffect(() => {
    console.log('🔍 [ProfileForm] useEffect - fullProfile mudou:', {
      fullProfile,
      legalNature: fullProfile?.profile?.legalNature,
      timestamp: new Date().toISOString()
    })

    if (fullProfile) {
      const { tenant, profile } = fullProfile

      console.log('✅ [ProfileForm] Chamando reset com legalNature:', profile?.legalNature)

      reset({
        // Dados do profile
        legalNature: profile?.legalNature,
        tradeName: profile?.tradeName || '',
        cnesCode: profile?.cnesCode || '',
        capacityDeclared: profile?.capacityDeclared || ('' as any),
        capacityLicensed: profile?.capacityLicensed || ('' as any),
        websiteUrl: profile?.websiteUrl || '',
        foundedAt: profile?.foundedAt ? profile.foundedAt.split('T')[0] : '',
        mission: profile?.mission || '',
        vision: profile?.vision || '',
        values: profile?.values || '',
        notes: profile?.notes || '',

        // Dados do tenant
        phone: tenant.phone || '',
        email: tenant.email || '',
        addressZipCode: tenant.addressZipCode || '',
        addressStreet: tenant.addressStreet || '',
        addressNumber: tenant.addressNumber || '',
        addressComplement: tenant.addressComplement || '',
        addressDistrict: tenant.addressDistrict || '',
        addressCity: tenant.addressCity || '',
        addressState: tenant.addressState || '',
      })

      console.log('📋 [ProfileForm] Formulário resetado. Valor atual de legalNature no watch:', watch('legalNature'))

      setLogoPreview(profile?.logoUrl || null)
    }
  }, [fullProfile, reset])

  // Função para buscar CEP (chamada no onChange do input)
  const handleBuscarCep = useCallback(async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length === 8) {
      console.log('🔍 [ProfileForm] Buscando CEP no ViaCEP:', cepLimpo)
      const endereco = await buscarCEP(cepLimpo)
      if (endereco) {
        console.log('✅ [ProfileForm] CEP encontrado, preenchendo campos')
        setValue('addressStreet', endereco.logradouro, { shouldDirty: true })
        setValue('addressDistrict', endereco.bairro, { shouldDirty: true })
        setValue('addressCity', endereco.cidade, { shouldDirty: true })
        setValue('addressState', endereco.estado, { shouldDirty: true })
        // Só preencher complemento se vier da API (geralmente não vem)
        if (endereco.complemento) {
          setValue('addressComplement', endereco.complemento, { shouldDirty: true })
        }
      } else {
        toast({
          title: 'CEP não encontrado',
          description: 'Preencha o endereço manualmente',
          variant: 'destructive',
        })
      }
    }
  }, [setValue, toast])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // 1. Upload do logo se houver arquivo selecionado
      if (logoFile) {
        try {
          const updatedProfile = await uploadLogoMutation.mutateAsync(logoFile)

          // Atualizar preview com a URL retornada
          if (updatedProfile?.logoUrl) {
            setLogoPreview(updatedProfile.logoUrl)
          }

          // Limpar arquivo selecionado
          setLogoFile(null)
        } catch (logoError: any) {
          toast({
            title: 'Erro ao salvar logo',
            description: logoError.response?.data?.message || 'Erro ao fazer upload do logo',
            variant: 'destructive',
          })
          // Reverter preview
          setLogoPreview(fullProfile?.profile?.logoUrl || null)
          return // Não continua se o upload do logo falhar
        }
      }

      // 2. Separar dados do profile e do tenant
      const profileFields = [
        'legalNature', 'tradeName', 'cnesCode', 'capacityDeclared', 'capacityLicensed',
        'websiteUrl', 'foundedAt', 'mission', 'vision', 'values', 'notes'
      ]

      const tenantFields = [
        'phone', 'email', 'addressZipCode', 'addressStreet', 'addressNumber',
        'addressComplement', 'addressDistrict', 'addressCity', 'addressState'
      ]

      const profileData: any = {}
      const tenantData: any = {}

      Object.entries(data).forEach(([key, value]) => {
        const processedValue = value === '' ? undefined : value

        if (profileFields.includes(key)) {
          if (key === 'capacityDeclared' || key === 'capacityLicensed') {
            profileData[key] = processedValue ? Number(processedValue) : undefined
          } else {
            profileData[key] = processedValue
          }
        } else if (tenantFields.includes(key)) {
          tenantData[key] = processedValue
        }
      })

      // 3. Atualizar perfil e tenant
      const payload = {
        profile: Object.keys(profileData).length > 0 ? profileData : undefined,
        tenant: Object.keys(tenantData).length > 0 ? tenantData : undefined,
      }

      await updateMutation.mutateAsync(payload)
      toast({
        title: 'Sucesso',
        description: 'Perfil institucional atualizado com sucesso',
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao atualizar perfil',
        variant: 'destructive',
      })
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'Arquivo muito grande. Tamanho máximo: 10MB',
        variant: 'destructive',
      })
      return
    }

    // Guardar arquivo para upload posterior (ao clicar em "Salvar Alterações")
    setLogoFile(file)

    // Criar preview local (base64)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Institucional</CardTitle>
          <CardDescription>Imagem que representa a instituição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {logoPreview ? (
                // Se for base64 (preview temporário), usar img normal
                logoPreview.startsWith('data:') ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-32 w-32 object-contain rounded-lg border border-border"
                  />
                ) : (
                  // Se for URL do MinIO, usar PhotoViewer para assinar automaticamente
                  <PhotoViewer
                    photoUrl={logoPreview}
                    altText="Logo"
                    size="xl"
                    rounded={false}
                    className="!h-32 !w-32 !rounded-lg"
                  />
                )
              ) : (
                <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 inline-flex">
                  <Upload className="h-4 w-4" />
                  {logoFile ? 'Trocar logo' : 'Selecionar logo'}
                </div>
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground mt-2">
                PNG, JPG, WebP ou PDF. Tamanho máximo: 10MB
                {logoFile && <span className="block text-primary font-medium mt-1">Arquivo selecionado: {logoFile.name}</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Básicos */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Básicos</CardTitle>
          <CardDescription>Informações gerais sobre a instituição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dados da ILPI (não editáveis) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={fullProfile?.tenant.cnpj || 'Não informado'} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Nome da ILPI</Label>
              <Input value={fullProfile?.tenant.name || ''} disabled className="bg-muted" />
            </div>
          </div>

          {/* Natureza Jurídica e Nome Fantasia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalNature">Natureza Jurídica</Label>
              <Select
                value={legalNature || ''}
                onValueChange={(value) => {
                  console.log('🎯 [ProfileForm] Select onValueChange chamado com:', value)
                  // Ignorar valores vazios ou inválidos (previne bug do Shadcn Select)
                  if (value && value !== '') {
                    setValue('legalNature', value as LegalNature, { shouldDirty: true })
                  }
                }}
              >
                <SelectTrigger
                  id="legalNature"
                  onClick={() => console.log('👆 [ProfileForm] Select trigger clicado. Valor atual:', legalNature)}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(legalNatureLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.legalNature && <p className="text-sm text-danger">{errors.legalNature.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeName">Nome Fantasia</Label>
              <Input id="tradeName" {...register('tradeName')} />
              {errors.tradeName && <p className="text-sm text-danger">{errors.tradeName.message}</p>}
            </div>
          </div>

          {/* CNES e Capacidades */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnesCode">Código CNES</Label>
              <Input id="cnesCode" {...register('cnesCode')} maxLength={20} />
              {errors.cnesCode && <p className="text-sm text-danger">{errors.cnesCode.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacityDeclared">Capacidade Declarada</Label>
              <Input
                id="capacityDeclared"
                type="number"
                {...register('capacityDeclared', { valueAsNumber: true })}
                min={1}
              />
              {errors.capacityDeclared && <p className="text-sm text-danger">{errors.capacityDeclared.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacityLicensed">Capacidade Licenciada</Label>
              <Input
                id="capacityLicensed"
                type="number"
                {...register('capacityLicensed', { valueAsNumber: true })}
                min={1}
              />
              {errors.capacityLicensed && <p className="text-sm text-danger">{errors.capacityLicensed.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço Institucional */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço Institucional</CardTitle>
          <CardDescription>Localização da instituição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addressZipCode">CEP</Label>
              <Controller
                name="addressZipCode"
                control={control}
                render={({ field }) => (
                  <Input
                    id="addressZipCode"
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e)
                      handleBuscarCep(e.target.value)
                    }}
                    maxLength={9}
                    placeholder="00000-000"
                  />
                )}
              />
              {errors.addressZipCode && <p className="text-sm text-danger">{errors.addressZipCode.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addressStreet">Rua</Label>
              <Input id="addressStreet" {...register('addressStreet')} />
              {errors.addressStreet && <p className="text-sm text-danger">{errors.addressStreet.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número</Label>
              <Input id="addressNumber" {...register('addressNumber')} />
              {errors.addressNumber && <p className="text-sm text-danger">{errors.addressNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addressComplement">Complemento</Label>
              <Input id="addressComplement" {...register('addressComplement')} />
              {errors.addressComplement && <p className="text-sm text-danger">{errors.addressComplement.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressDistrict">Bairro</Label>
              <Input id="addressDistrict" {...register('addressDistrict')} />
              {errors.addressDistrict && <p className="text-sm text-danger">{errors.addressDistrict.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressCity">Cidade</Label>
              <Input id="addressCity" {...register('addressCity')} />
              {errors.addressCity && <p className="text-sm text-danger">{errors.addressCity.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addressState">Estado</Label>
              <Input
                id="addressState"
                {...register('addressState')}
                maxLength={2}
                placeholder="SP"
              />
              {errors.addressState && <p className="text-sm text-danger">{errors.addressState.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contatos */}
      <Card>
        <CardHeader>
          <CardTitle>Contatos Institucionais</CardTitle>
          <CardDescription>Telefone e e-mail de contato da instituição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-danger">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Site</Label>
              <Input id="websiteUrl" type="url" {...register('websiteUrl')} />
              {errors.websiteUrl && <p className="text-sm text-danger">{errors.websiteUrl.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foundedAt">Data de Fundação</Label>
            <Input id="foundedAt" type="date" {...register('foundedAt')} className="max-w-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Missão, Visão e Valores */}
      <Card>
        <CardHeader>
          <CardTitle>Missão, Visão e Valores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mission">Missão</Label>
            <Textarea id="mission" {...register('mission')} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision">Visão</Label>
            <Textarea id="vision" {...register('vision')} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="values">Valores</Label>
            <Textarea id="values" {...register('values')} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register('notes')} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
            setLogoFile(null)
            setLogoPreview(fullProfile?.profile?.logoUrl || null)
          }}
          disabled={!isDirty && !logoFile}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending || uploadLogoMutation.isPending || (!isDirty && !logoFile)}>
          {updateMutation.isPending || uploadLogoMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>
    </form>
  )
}
