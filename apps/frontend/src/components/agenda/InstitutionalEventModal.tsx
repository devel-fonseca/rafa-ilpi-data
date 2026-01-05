import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { InstitutionalEventType, InstitutionalEventVisibility } from '@/types/agenda'

interface FormData {
  eventType: InstitutionalEventType
  visibility: InstitutionalEventVisibility
  title: string
  description?: string
  scheduledDate: string
  scheduledTime?: string
  allDay: boolean
  notes?: string
  // Campos específicos para DOCUMENT_EXPIRY
  documentType?: string
  documentNumber?: string
  expiryDate?: string
  responsible?: string
  // Campos específicos para TRAINING
  trainingTopic?: string
  instructor?: string
  targetAudience?: string
  location?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  initialDate?: Date
  editData?: any
}

const EVENT_TYPE_LABELS: Record<InstitutionalEventType, string> = {
  [InstitutionalEventType.DOCUMENT_EXPIRY]: 'Vencimento de Documento',
  [InstitutionalEventType.TRAINING]: 'Treinamento',
  [InstitutionalEventType.MEETING]: 'Reunião',
  [InstitutionalEventType.INSPECTION]: 'Vistoria',
  [InstitutionalEventType.MAINTENANCE]: 'Manutenção',
  [InstitutionalEventType.OTHER]: 'Outro',
}

const VISIBILITY_LABELS: Record<InstitutionalEventVisibility, string> = {
  [InstitutionalEventVisibility.ADMIN_ONLY]: 'Apenas Administradores',
  [InstitutionalEventVisibility.RT_ONLY]: 'Administradores e RT',
  [InstitutionalEventVisibility.ALL_USERS]: 'Todos os Usuários',
}

export function InstitutionalEventModal({ open, onClose, onSubmit, initialDate, editData }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      eventType: editData?.eventType || InstitutionalEventType.OTHER,
      visibility: editData?.visibility || InstitutionalEventVisibility.ALL_USERS,
      scheduledDate: editData?.scheduledDate
        ? format(new Date(editData.scheduledDate), 'yyyy-MM-dd')
        : initialDate
          ? format(initialDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
      allDay: editData?.allDay || false,
      ...editData,
    },
  })

  const eventType = watch('eventType')
  const allDay = watch('allDay')

  const handleFormSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Editar Evento Institucional' : 'Novo Evento Institucional'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Tipo de Evento */}
          <div>
            <Label htmlFor="eventType">Tipo de Evento *</Label>
            <Select
              value={watch('eventType')}
              onValueChange={(value) => setValue('eventType', value as InstitutionalEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibilidade */}
          <div>
            <Label htmlFor="visibility">Visibilidade *</Label>
            <Select
              value={watch('visibility')}
              onValueChange={(value) => setValue('visibility', value as InstitutionalEventVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Título é obrigatório' })}
              placeholder="Ex: Renovação do Alvará de Funcionamento"
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detalhes adicionais sobre o evento..."
              rows={3}
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduledDate">Data *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="scheduledDate"
                  type="date"
                  {...register('scheduledDate', { required: 'Data é obrigatória' })}
                  className="pl-9"
                />
              </div>
              {errors.scheduledDate && (
                <p className="text-sm text-red-500 mt-1">{errors.scheduledDate.message}</p>
              )}
            </div>

            {!allDay && (
              <div>
                <Label htmlFor="scheduledTime">Horário</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="scheduledTime"
                    type="time"
                    {...register('scheduledTime')}
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* All Day */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={allDay}
              onCheckedChange={(checked) => setValue('allDay', checked as boolean)}
            />
            <Label htmlFor="allDay" className="cursor-pointer">
              Evento de dia inteiro
            </Label>
          </div>

          {/* Campos específicos para DOCUMENT_EXPIRY */}
          {eventType === InstitutionalEventType.DOCUMENT_EXPIRY && (
            <div className="border rounded-lg p-4 space-y-4 bg-amber-50 dark:bg-amber-950">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Dados do Documento</span>
              </div>

              <div>
                <Label htmlFor="documentType">Tipo de Documento *</Label>
                <Input
                  id="documentType"
                  {...register('documentType', {
                    required: eventType === InstitutionalEventType.DOCUMENT_EXPIRY
                      ? 'Tipo de documento é obrigatório'
                      : false,
                  })}
                  placeholder="Ex: Alvará de Funcionamento"
                />
                {errors.documentType && (
                  <p className="text-sm text-red-500 mt-1">{errors.documentType.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="documentNumber">Número do Documento</Label>
                <Input
                  id="documentNumber"
                  {...register('documentNumber')}
                  placeholder="Ex: 12345/2024"
                />
              </div>

              <div>
                <Label htmlFor="expiryDate">Data de Vencimento *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  {...register('expiryDate', {
                    required: eventType === InstitutionalEventType.DOCUMENT_EXPIRY
                      ? 'Data de vencimento é obrigatória'
                      : false,
                  })}
                />
                {errors.expiryDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.expiryDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="responsible">Responsável</Label>
                <Input
                  id="responsible"
                  {...register('responsible')}
                  placeholder="Nome do responsável pela renovação"
                />
              </div>
            </div>
          )}

          {/* Campos específicos para TRAINING */}
          {eventType === InstitutionalEventType.TRAINING && (
            <div className="border rounded-lg p-4 space-y-4 bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Dados do Treinamento</span>
              </div>

              <div>
                <Label htmlFor="trainingTopic">Tema do Treinamento *</Label>
                <Input
                  id="trainingTopic"
                  {...register('trainingTopic', {
                    required: eventType === InstitutionalEventType.TRAINING
                      ? 'Tema do treinamento é obrigatório'
                      : false,
                  })}
                  placeholder="Ex: Prevenção de Quedas em Idosos"
                />
                {errors.trainingTopic && (
                  <p className="text-sm text-red-500 mt-1">{errors.trainingTopic.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="instructor">Instrutor</Label>
                <Input
                  id="instructor"
                  {...register('instructor')}
                  placeholder="Nome do instrutor/palestrante"
                />
              </div>

              <div>
                <Label htmlFor="targetAudience">Público Alvo</Label>
                <Input
                  id="targetAudience"
                  {...register('targetAudience')}
                  placeholder="Ex: Equipe de Enfermagem"
                />
              </div>

              <div>
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="Ex: Sala de Reuniões"
                />
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observações internas sobre o evento..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editData ? 'Atualizar' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
