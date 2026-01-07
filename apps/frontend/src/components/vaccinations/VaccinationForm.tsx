import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { uploadFile } from '@/services/upload'
import { useCreateVaccination, useUpdateVaccination, CreateVaccinationInput, UpdateVaccinationInput, Vaccination } from '@/hooks/useVaccinations'
import { getCurrentDate } from '@/utils/dateHelpers'

// Validação com Zod
const vaccinationSchema = z.object({
  vaccine: z.string().min(1, 'Vacina é obrigatória').max(255),
  dose: z.string().min(1, 'Dose é obrigatória').max(100),
  date: z.string().min(1, 'Data é obrigatória'),
  batch: z.string().min(1, 'Lote é obrigatório').max(50),
  manufacturer: z.string().min(1, 'Fabricante é obrigatório').max(255),
  cnes: z.string().regex(/^\d{8,10}$/, 'CNES inválido (8-10 dígitos)'),
  healthUnit: z.string().min(1, 'Estabelecimento é obrigatório').max(255),
  municipality: z.string().min(1, 'Município é obrigatório').max(100),
  state: z.string().regex(/^[A-Z]{2}$/, 'UF deve ter 2 caracteres maiúsculos'),
  certificateUrl: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

type VaccinationFormData = z.infer<typeof vaccinationSchema>

interface VaccinationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  vaccination?: Vaccination
  onSuccess?: () => void
}

export function VaccinationForm({
  open,
  onOpenChange,
  residentId,
  vaccination,
  onSuccess,
}: VaccinationFormProps) {
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false)
  const [certificateUrl, setCertificateUrl] = useState<string | undefined>(
    vaccination?.certificateUrl,
  )

  const createMutation = useCreateVaccination()
  const updateMutation = useUpdateVaccination()
  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VaccinationFormData>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: vaccination
      ? {
          vaccine: vaccination.vaccine,
          dose: vaccination.dose,
          date: vaccination.date,
          batch: vaccination.batch,
          manufacturer: vaccination.manufacturer,
          cnes: vaccination.cnes,
          healthUnit: vaccination.healthUnit,
          municipality: vaccination.municipality,
          state: vaccination.state,
          certificateUrl: vaccination.certificateUrl,
          notes: vaccination.notes || '',
        }
      : {
          date: getCurrentDate(),
        },
  })

  const handleCertificateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingCertificate(true)
      const url = await uploadFile(file, 'vaccinations', residentId)
      setCertificateUrl(url)
      setValue('certificateUrl', url)
      toast.success('Comprovante carregado com sucesso')
    } catch (error) {
      toast.error('Erro ao fazer upload do comprovante')
      console.error(error)
    } finally {
      setIsUploadingCertificate(false)
    }
  }

  const onSubmit = async (data: VaccinationFormData) => {
    try {
      if (vaccination) {
        await updateMutation.mutateAsync({
          id: vaccination.id,
          data: data as UpdateVaccinationInput,
        })
        toast.success('Vacinação atualizada com sucesso')
      } else {
        await createMutation.mutateAsync({
          ...data,
          residentId,
          certificateUrl,
        } as CreateVaccinationInput)
        toast.success('Vacinação registrada com sucesso')
        reset()
        setCertificateUrl(undefined)
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar vacinação')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vaccination ? 'Editar Vacinação' : 'Registrar Nova Vacinação'}
          </DialogTitle>
          <DialogDescription>
            Preencha todos os campos de acordo com a RDC 502/2021
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo 1: Vacina/Profilaxia */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vaccine">Vacina/Profilaxia *</Label>
              <Input
                id="vaccine"
                placeholder="ex: COVID-19, Influenza"
                {...register('vaccine')}
              />
              {errors.vaccine && (
                <p className="text-sm text-danger mt-1">{errors.vaccine.message}</p>
              )}
            </div>

            {/* Campo 2: Data */}
            <div>
              <Label htmlFor="date">Data da Vacinação *</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-danger mt-1">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Campo 3: Dose */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dose">Dose *</Label>
              <Input
                id="dose"
                placeholder="ex: 1ª dose, Reforço"
                {...register('dose')}
              />
              {errors.dose && (
                <p className="text-sm text-danger mt-1">{errors.dose.message}</p>
              )}
            </div>

            {/* Campo 4: Lote */}
            <div>
              <Label htmlFor="batch">Lote *</Label>
              <Input
                id="batch"
                placeholder="Código do lote"
                {...register('batch')}
              />
              {errors.batch && (
                <p className="text-sm text-danger mt-1">{errors.batch.message}</p>
              )}
            </div>
          </div>

          {/* Campo 5: Fabricante */}
          <div>
            <Label htmlFor="manufacturer">Fabricante *</Label>
            <Input
              id="manufacturer"
              placeholder="ex: Pfizer, Butantan"
              {...register('manufacturer')}
            />
            {errors.manufacturer && (
              <p className="text-sm text-danger mt-1">{errors.manufacturer.message}</p>
            )}
          </div>

          {/* Campo 6: CNES e Campo 7: Estabelecimento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cnes">CNES *</Label>
              <Input
                id="cnes"
                placeholder="8-10 dígitos"
                {...register('cnes')}
              />
              {errors.cnes && (
                <p className="text-sm text-danger mt-1">{errors.cnes.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="healthUnit">Estabelecimento de Saúde *</Label>
              <Input
                id="healthUnit"
                placeholder="Nome completo da unidade"
                {...register('healthUnit')}
              />
              {errors.healthUnit && (
                <p className="text-sm text-danger mt-1">{errors.healthUnit.message}</p>
              )}
            </div>
          </div>

          {/* Campo 8: Município e Campo 9: UF */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="municipality">Município *</Label>
              <Input
                id="municipality"
                placeholder="Cidade de vacinação"
                {...register('municipality')}
              />
              {errors.municipality && (
                <p className="text-sm text-danger mt-1">{errors.municipality.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">UF *</Label>
              <Input
                id="state"
                placeholder="ex: SP, RJ"
                maxLength={2}
                {...register('state')}
              />
              {errors.state && (
                <p className="text-sm text-danger mt-1">{errors.state.message}</p>
              )}
            </div>
          </div>

          {/* Campo 10: Comprovante */}
          <div>
            <Label>Comprovante/Certificado</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {certificateUrl ? (
                <div className="space-y-2">
                  <p className="text-sm text-success font-medium">✓ Comprovante carregado</p>
                  <a
                    href={certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 hover:underline"
                  >
                    Visualizar arquivo
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCertificateUrl(undefined)
                      setValue('certificateUrl', undefined)
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar arquivo (PDF, PNG, JPG)
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleCertificateUpload}
                    disabled={isUploadingCertificate}
                  />
                </label>
              )}
              {isUploadingCertificate && (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Enviando...</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo 11: Observações */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Anotações adicionais"
              {...register('notes')}
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-danger mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isUploadingCertificate}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {vaccination ? 'Atualizar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
