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
import { formatMedicationPresentation } from '@/utils/formatters'
import {
  formatScheduledWeekDays,
  getRequiredWeekDaysForFrequency,
  isWeeklyMedicationFrequency,
  normalizeScheduledWeekDays,
  WEEKDAY_OPTIONS,
} from '@/utils/medicationSchedule'
import { toast } from 'sonner'

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
  { value: 'UMA_VEZ_SEMANA', label: '1x por semana', times: ['08:00'] },
  { value: 'DUAS_VEZES_SEMANA', label: '2x por semana', times: ['08:00'] },
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
      scheduledWeekDays: [],
      startDate: getCurrentDate(),
      isControlled: false,
      isHighRisk: false,
      requiresDoubleCheck: false,
      instructions: '',
    },
  })

  const frequency = watch('frequency')
  const scheduledTimes = watch('scheduledTimes')
  const scheduledWeekDays = watch('scheduledWeekDays')

  const isWeekly = isWeeklyMedicationFrequency(frequency)

  // Atualizar horários quando frequência muda
  useEffect(() => {
    if (frequency !== 'PERSONALIZADO') {
      const freq = FREQUENCIES.find((f) => f.value === frequency)
      if (
        freq &&
        freq.times.length > 0 &&
        JSON.stringify(scheduledTimes) !== JSON.stringify(freq.times)
      ) {
        setValue('scheduledTimes', freq.times)
      }
    }

    const normalizedDays = normalizeScheduledWeekDays(scheduledWeekDays)

    if (isWeeklyMedicationFrequency(frequency)) {
      const requiredDays = getRequiredWeekDaysForFrequency(frequency)
      let nextWeekDays = normalizedDays

      if (requiredDays === 1) {
        nextWeekDays = normalizedDays.length > 0 ? [normalizedDays[0]] : [1]
      } else if (requiredDays === 2) {
        if (normalizedDays.length === 0) {
          nextWeekDays = [1, 4]
        } else if (normalizedDays.length === 1) {
          const secondDay = normalizedDays[0] === 4 ? 1 : 4
          nextWeekDays = normalizeScheduledWeekDays([normalizedDays[0], secondDay])
        } else {
          nextWeekDays = normalizedDays.slice(0, 2)
        }
      }

      if (JSON.stringify(normalizedDays) !== JSON.stringify(nextWeekDays)) {
        setValue('scheduledWeekDays', nextWeekDays)
      }
    } else {
      if (normalizedDays.length > 0) {
        setValue('scheduledWeekDays', [])
      }
    }
  }, [frequency, scheduledTimes, scheduledWeekDays, setValue])

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
        scheduledWeekDays: normalizeScheduledWeekDays(initialData.scheduledWeekDays),
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
        scheduledWeekDays: [],
        startDate: getCurrentDate(),
        isControlled: false,
        isHighRisk: false,
        requiresDoubleCheck: false,
        instructions: '',
      })
    }
  }, [open, initialData, reset])

  const onSubmit = (data: CreateMedicationDto) => {
    const normalizedTimes = (data.scheduledTimes || []).map((time) => time?.trim()).filter(Boolean)

    if (normalizedTimes.length === 0) {
      toast.error('Informe pelo menos um horário programado')
      return
    }

    if (isWeeklyMedicationFrequency(data.frequency)) {
      const normalizedDays = normalizeScheduledWeekDays(data.scheduledWeekDays)
      const requiredDays = getRequiredWeekDaysForFrequency(data.frequency)

      if (normalizedTimes.length !== 1) {
        toast.error('Medicamentos semanais devem ter exatamente 1 horário programado')
        return
      }

      if (normalizedDays.length !== requiredDays) {
        toast.error(
          requiredDays === 1
            ? 'Selecione 1 dia da semana para a frequência semanal'
            : 'Selecione 2 dias da semana para a frequência semanal',
        )
        return
      }

      onSave({
        ...data,
        scheduledTimes: normalizedTimes,
        scheduledWeekDays: normalizedDays,
      })
      return
    }

    onSave({
      ...data,
      scheduledTimes: normalizedTimes,
      scheduledWeekDays: [],
    })
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

  const handleWeekDayToggle = (day: number) => {
    if (!isWeeklyMedicationFrequency(frequency)) return

    const requiredDays = getRequiredWeekDaysForFrequency(frequency)
    const normalizedDays = normalizeScheduledWeekDays(scheduledWeekDays)
    const isSelected = normalizedDays.includes(day)

    if (requiredDays === 1) {
      setValue('scheduledWeekDays', [day])
      return
    }

    if (isSelected) {
      setValue(
        'scheduledWeekDays',
        normalizedDays.filter((weekDay) => weekDay !== day),
      )
      return
    }

    const nextDays = normalizeScheduledWeekDays([...normalizedDays, day]).slice(0, requiredDays)
    setValue('scheduledWeekDays', nextDays)
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
                      {formatMedicationPresentation(pres)}
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
              <Label>{isWeekly ? 'Horário Programado *' : 'Horários Programados *'}</Label>
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
                    disabled={frequency !== 'PERSONALIZADO' && !isWeekly}
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
            {isWeekly && (
              <p className="text-xs text-muted-foreground mt-2">
                Dias selecionados: {formatScheduledWeekDays(scheduledWeekDays)}
              </p>
            )}
          </div>

          {isWeekly && (
            <div>
              <Label>Dias da Semana *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = normalizeScheduledWeekDays(scheduledWeekDays).includes(day.value)
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      onClick={() => handleWeekDayToggle(day.value)}
                    >
                      {day.label}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {frequency === 'UMA_VEZ_SEMANA'
                  ? 'Selecione 1 dia da semana.'
                  : 'Selecione 2 dias da semana.'}
              </p>
            </div>
          )}

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
