import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateMedicationDto, MedicationPresentation, AdministrationRoute, MedicationFrequency } from '@/api/prescriptions.api'
import { getCurrentDate } from '@/utils/dateHelpers'

interface MedicationModalProps {
  open: boolean
  onClose: () => void
  onSave: (medication: CreateMedicationDto) => void
  initialData?: CreateMedicationDto | null
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

const FREQUENCIES = [
  { value: 'UMA_VEZ_DIA', label: '1x ao dia', times: ['08:00'] },
  { value: 'DUAS_VEZES_DIA', label: '2x ao dia', times: ['08:00', '20:00'] },
  { value: 'SEIS_SEIS_H', label: '6/6h', times: ['06:00', '12:00', '18:00', '00:00'] },
  { value: 'OITO_OITO_H', label: '8/8h', times: ['08:00', '16:00', '00:00'] },
  { value: 'DOZE_DOZE_H', label: '12/12h', times: ['08:00', '20:00'] },
  { value: 'PERSONALIZADO', label: 'Personalizado', times: [] },
]

export function MedicationModal({
  open,
  onClose,
  onSave,
  initialData,
  isEditing = false,
}: MedicationModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateMedicationDto>({
    defaultValues: initialData || {
      name: '',
      presentation: 'COMPRIMIDO',
      concentration: '',
      dose: '',
      route: 'VO',
      frequency: 'UMA_VEZ_DIA',
      scheduledTimes: ['08:00'],
      startDate: getCurrentDate(),
      isControlled: false,
      isHighRisk: false,
      requiresDoubleCheck: false,
      instructions: '',
    },
  })

  const frequency = watch('frequency')
  const scheduledTimes = watch('scheduledTimes')

  // Atualizar horários quando frequência muda
  useEffect(() => {
    if (frequency !== 'PERSONALIZADO') {
      const freq = FREQUENCIES.find((f) => f.value === frequency)
      if (freq && freq.times.length > 0) {
        setValue('scheduledTimes', freq.times)
      }
    }
  }, [frequency, setValue])

  // Reset form quando modal abre/fecha
  useEffect(() => {
    if (open && initialData) {
      // Converter datas ISO para formato local YYYY-MM-DD
      const convertDateToLocal = (isoDate: string | undefined): string => {
        if (!isoDate) return getCurrentDate()
        // Se já está no formato YYYY-MM-DD, retorna direto
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate
        // Se é ISO completo (com hora), extrai apenas a parte da data
        return isoDate.split('T')[0]
      }

      reset({
        ...initialData,
        startDate: convertDateToLocal(initialData.startDate),
        endDate: initialData.endDate ? convertDateToLocal(initialData.endDate) : undefined,
      })
    } else if (open && !initialData) {
      reset({
        name: '',
        presentation: 'COMPRIMIDO',
        concentration: '',
        dose: '',
        route: 'VO',
        frequency: 'UMA_VEZ_DIA',
        scheduledTimes: ['08:00'],
        startDate: getCurrentDate(),
        isControlled: false,
        isHighRisk: false,
        requiresDoubleCheck: false,
        instructions: '',
      })
    }
  }, [open, initialData, reset])

  const onSubmit = (data: CreateMedicationDto) => {
    onSave(data)
  }

  const handleAddTime = () => {
    setValue('scheduledTimes', [...scheduledTimes, '08:00'])
  }

  const handleRemoveTime = (index: number) => {
    const newTimes = scheduledTimes.filter((_, i) => i !== index)
    setValue('scheduledTimes', newTimes)
  }

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...scheduledTimes]
    newTimes[index] = value
    setValue('scheduledTimes', newTimes)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Medicamento' : 'Adicionar Medicamento'}
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
                placeholder="Ex: Losartana"
              />
              {errors.name && (
                <p className="text-sm text-danger mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="presentation">Apresentação *</Label>
              <Select
                value={watch('presentation')}
                onValueChange={(value) => setValue('presentation', value as MedicationPresentation)}
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
                placeholder="Ex: 50mg"
              />
              {errors.concentration && (
                <p className="text-sm text-danger mt-1">{errors.concentration.message}</p>
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
                <p className="text-sm text-danger mt-1">{errors.dose.message}</p>
              )}
            </div>
          </div>

          {/* Via e Frequência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="route">Via de Administração *</Label>
              <Select
                value={watch('route')}
                onValueChange={(value) => setValue('route', value as AdministrationRoute)}
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

            <div>
              <Label htmlFor="frequency">Frequência *</Label>
              <Select
                value={watch('frequency')}
                onValueChange={(value) => setValue('frequency', value as MedicationFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Horários Programados */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Horários Programados *</Label>
              {frequency === 'PERSONALIZADO' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddTime}
                >
                  Adicionar Horário
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {scheduledTimes.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(index, e.target.value)}
                    disabled={frequency !== 'PERSONALIZADO'}
                  />
                  {frequency === 'PERSONALIZADO' && scheduledTimes.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveTime(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
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
                <p className="text-sm text-danger mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">Data de Término</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para uso contínuo
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isControlled"
                checked={watch('isControlled')}
                onCheckedChange={(checked) => setValue('isControlled', checked as boolean)}
              />
              <Label htmlFor="isControlled" className="font-normal cursor-pointer">
                Medicamento Controlado
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isHighRisk"
                checked={watch('isHighRisk')}
                onCheckedChange={(checked) => setValue('isHighRisk', checked as boolean)}
              />
              <Label htmlFor="isHighRisk" className="font-normal cursor-pointer">
                Medicamento de Alto Risco
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresDoubleCheck"
                checked={watch('requiresDoubleCheck')}
                onCheckedChange={(checked) =>
                  setValue('requiresDoubleCheck', checked as boolean)
                }
              />
              <Label htmlFor="requiresDoubleCheck" className="font-normal cursor-pointer">
                Requer Dupla Checagem
              </Label>
            </div>
          </div>

          {/* Instruções */}
          <div>
            <Label htmlFor="instructions">Instruções de Uso</Label>
            <Textarea
              id="instructions"
              {...register('instructions')}
              placeholder="Ex: Tomar com alimentação"
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Salvar Alterações' : 'Adicionar Medicamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
