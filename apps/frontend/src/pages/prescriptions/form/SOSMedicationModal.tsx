import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateSOSMedicationDto } from '@/api/prescriptions.api'

interface SOSMedicationModalProps {
  open: boolean
  onClose: () => void
  onSave: (medication: CreateSOSMedicationDto) => void
  initialData?: CreateSOSMedicationDto | null
  isEditing?: boolean
}

const PRESENTATIONS = [
  'COMPRIMIDO', 'CAPSULA', 'AMPOLA', 'GOTAS', 'SOLUCAO', 'SUSPENSAO',
  'POMADA', 'CREME', 'SPRAY', 'INALADOR', 'ADESIVO', 'SUPOSITORIO', 'OUTRO'
]

const ROUTES = [
  { value: 'VO', label: 'Via Oral' },
  { value: 'IM', label: 'Intramuscular' },
  { value: 'EV', label: 'Endovenosa' },
  { value: 'SC', label: 'Subcutânea' },
  { value: 'TOPICA', label: 'Tópica' },
  { value: 'SL', label: 'Sublingual' },
  { value: 'RETAL', label: 'Retal' },
  { value: 'OCULAR', label: 'Ocular' },
  { value: 'NASAL', label: 'Nasal' },
  { value: 'INALATORIA', label: 'Inalatória' },
  { value: 'OUTRA', label: 'Outra' },
]

const INDICATIONS = [
  { value: 'DOR', label: 'Dor' },
  { value: 'FEBRE', label: 'Febre' },
  { value: 'ANSIEDADE', label: 'Ansiedade' },
  { value: 'AGITACAO', label: 'Agitação' },
  { value: 'NAUSEA', label: 'Náusea/Vômito' },
  { value: 'INSONIA', label: 'Insônia' },
  { value: 'OUTRO', label: 'Outro' },
]

export function SOSMedicationModal({
  open,
  onClose,
  onSave,
  initialData,
  isEditing = false,
}: SOSMedicationModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateSOSMedicationDto>({
    defaultValues: initialData || {
      name: '',
      presentation: 'COMPRIMIDO',
      concentration: '',
      dose: '',
      route: 'VO',
      indication: 'DOR',
      indicationDetails: '',
      minInterval: '4h',
      maxDailyDoses: 3,
      startDate: new Date().toISOString().split('T')[0],
      instructions: '',
    },
  })

  useEffect(() => {
    if (open && initialData) {
      reset(initialData)
    } else if (open && !initialData) {
      reset({
        name: '',
        presentation: 'COMPRIMIDO',
        concentration: '',
        dose: '',
        route: 'VO',
        indication: 'DOR',
        indicationDetails: '',
        minInterval: '4h',
        maxDailyDoses: 3,
        startDate: new Date().toISOString().split('T')[0],
        instructions: '',
      })
    }
  }, [open, initialData, reset])

  const onSubmit = (data: CreateSOSMedicationDto) => {
    onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Medicação SOS' : 'Adicionar Medicação SOS'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome e Apresentação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Medicamento *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Nome é obrigatório' })}
                placeholder="Ex: Dipirona"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="presentation">Apresentação *</Label>
              <Select
                value={watch('presentation')}
                onValueChange={(value) => setValue('presentation', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESENTATIONS.map((pres) => (
                    <SelectItem key={pres} value={pres}>
                      {pres}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Concentração e Dose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="concentration">Concentração *</Label>
              <Input
                id="concentration"
                {...register('concentration', { required: 'Concentração é obrigatória' })}
                placeholder="Ex: 500mg"
              />
              {errors.concentration && (
                <p className="text-sm text-red-600 mt-1">{errors.concentration.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dose">Dose *</Label>
              <Input
                id="dose"
                {...register('dose', { required: 'Dose é obrigatória' })}
                placeholder="Ex: 1 comprimido"
              />
              {errors.dose && (
                <p className="text-sm text-red-600 mt-1">{errors.dose.message}</p>
              )}
            </div>
          </div>

          {/* Via de Administração */}
          <div>
            <Label htmlFor="route">Via de Administração *</Label>
            <Select
              value={watch('route')}
              onValueChange={(value) => setValue('route', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUTES.map((route) => (
                  <SelectItem key={route.value} value={route.value}>
                    {route.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indicação */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
            <div>
              <Label htmlFor="indication">Indicação de Uso *</Label>
              <Select
                value={watch('indication')}
                onValueChange={(value) => setValue('indication', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDICATIONS.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="indicationDetails">Detalhes da Indicação</Label>
              <Input
                id="indicationDetails"
                {...register('indicationDetails')}
                placeholder="Ex: Dor moderada a intensa"
              />
              <p className="text-xs text-gray-600 mt-1">
                Especifique quando o medicamento deve ser administrado
              </p>
            </div>
          </div>

          {/* Restrições de Uso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <Label htmlFor="minInterval">Intervalo Mínimo entre Doses *</Label>
              <Input
                id="minInterval"
                {...register('minInterval', {
                  required: 'Intervalo mínimo é obrigatório',
                })}
                placeholder="Ex: 4h, 6h, 8h"
              />
              {errors.minInterval && (
                <p className="text-sm text-red-600 mt-1">{errors.minInterval.message}</p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Tempo mínimo entre administrações
              </p>
            </div>

            <div>
              <Label htmlFor="maxDailyDoses">Dose Máxima Diária *</Label>
              <Input
                id="maxDailyDoses"
                type="number"
                min="1"
                {...register('maxDailyDoses', {
                  required: 'Dose máxima diária é obrigatória',
                  valueAsNumber: true,
                })}
                placeholder="Ex: 3"
              />
              {errors.maxDailyDoses && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.maxDailyDoses.message}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Número máximo de doses em 24h
              </p>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Data de início é obrigatória' })}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">Data de Término</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para uso contínuo
              </p>
            </div>
          </div>

          {/* Instruções */}
          <div>
            <Label htmlFor="instructions">Instruções de Uso</Label>
            <Textarea
              id="instructions"
              {...register('instructions')}
              placeholder="Ex: Administrar quando temperatura acima de 37.8°C"
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Salvar Alterações' : 'Adicionar SOS'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
