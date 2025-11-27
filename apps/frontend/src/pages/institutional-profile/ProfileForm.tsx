import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Upload, Loader2, Building2, Info } from 'lucide-react'
import type { LegalNature } from '@/api/institutional-profile.api'

const profileSchema = z.object({
  legalNature: z.enum(['ASSOCIACAO', 'FUNDACAO', 'EMPRESA_PRIVADA', 'MEI']).optional(),
  tradeName: z.string().optional(),
  cnesCode: z.string().max(20).optional(),
  capacityDeclared: z.number().min(1).optional().or(z.literal('')),
  capacityLicensed: z.number().min(1).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  websiteUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  foundedAt: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.string().optional(),
  notes: z.string().optional(),
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
  const { data: profile, isLoading } = useProfile()
  const updateMutation = useUpdateProfile()
  const uploadLogoMutation = useUploadLogo()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const legalNature = watch('legalNature')

  // Carregar dados do perfil quando disponível
  useEffect(() => {
    if (profile) {
      reset({
        legalNature: profile.legalNature,
        tradeName: profile.tradeName || '',
        cnesCode: profile.cnesCode || '',
        capacityDeclared: profile.capacityDeclared || ('' as any),
        capacityLicensed: profile.capacityLicensed || ('' as any),
        contactPhone: profile.contactPhone || '',
        contactEmail: profile.contactEmail || '',
        websiteUrl: profile.websiteUrl || '',
        foundedAt: profile.foundedAt ? profile.foundedAt.split('T')[0] : '',
        mission: profile.mission || '',
        vision: profile.vision || '',
        values: profile.values || '',
        notes: profile.notes || '',
      })
      setLogoPreview(profile.logoUrl || null)
    }
  }, [profile, reset])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Converter strings vazias em undefined e números
      const payload: any = {}
      Object.entries(data).forEach(([key, value]) => {
        if (value === '') {
          payload[key] = undefined
        } else if (key === 'capacityDeclared' || key === 'capacityLicensed') {
          payload[key] = value ? Number(value) : undefined
        } else {
          payload[key] = value
        }
      })

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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    try {
      await uploadLogoMutation.mutateAsync(file)
      toast({
        title: 'Sucesso',
        description: 'Logo atualizado com sucesso',
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao fazer upload do logo',
        variant: 'destructive',
      })
    }
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
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="h-32 w-32 object-contain rounded-lg border border-border"
                />
              ) : (
                <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 inline-flex">
                  {uploadLogoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fazendo upload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Selecionar logo
                    </>
                  )}
                </div>
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploadLogoMutation.isPending}
              />
              <p className="text-sm text-muted-foreground mt-2">
                PNG, JPG, WebP ou PDF. Tamanho máximo: 10MB
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalNature">Natureza Jurídica</Label>
              <Select
                value={legalNature || ''}
                onValueChange={(value) => setValue('legalNature', value as LegalNature, { shouldDirty: true })}
              >
                <SelectTrigger id="legalNature">
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

      {/* Contatos */}
      <Card>
        <CardHeader>
          <CardTitle>Contatos Institucionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefone</Label>
              <Input id="contactPhone" {...register('contactPhone')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">E-mail</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
              {errors.contactEmail && <p className="text-sm text-danger">{errors.contactEmail.message}</p>}
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
        <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
          {updateMutation.isPending ? (
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
