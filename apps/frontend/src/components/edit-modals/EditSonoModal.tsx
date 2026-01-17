import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit } from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const editSonoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  padraoSono: z.string().min(1, 'Padrão de sono é obrigatório'),
  outroPadrao: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditSonoFormData = z.infer<typeof editSonoSchema>

interface SonoRecord {
  time: string
  data: Record<string, unknown>
  [key: string]: unknown
}

interface EditSonoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: SonoRecord
  isUpdating?: boolean
}

export function EditSonoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditSonoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditSonoFormData>({
    resolver: zodResolver(editSonoSchema),
  })

  const watchPadraoSono = watch('padraoSono')

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        padraoSono: record.data.padraoSono || '',
        outroPadrao: record.data.outroPadrao || '',
        observacoes: record.data.observacoes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditSonoFormData) => {
    const payload = {
      time: data.time,
      data: {
        padraoSono: data.padraoSono,
        outroPadrao: data.padraoSono === 'Outro' ? data.outroPadrao : undefined,
        observacoes: data.observacoes,
      },
      notes: '',
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Avaliação de Sono
          </DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo da edição para auditoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Box com info do registro original */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-medium">Registrado por:</span>{' '}
              {record?.recordedBy}
            </p>
            <p className="text-sm">
              <span className="font-medium">Data:</span>{' '}
              {record && formatDateOnlySafe(record.date)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Horário original:</span> {record?.time}
            </p>
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Horário
            </Label>
            <Input {...register('time')} type="time" className="mt-2" />
            {errors.time && (
              <p className="text-sm text-danger mt-1">{errors.time.message}</p>
            )}
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Padrão de Sono
            </Label>
            <Controller
              name="padraoSono"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preservado">Preservado</SelectItem>
                    <SelectItem value="Insônia inicial">Insônia inicial</SelectItem>
                    <SelectItem value="Insônia intermediária">Insônia intermediária</SelectItem>
                    <SelectItem value="Insônia terminal">Insônia terminal</SelectItem>
                    <SelectItem value="Hipersonia">Hipersonia</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.padraoSono && (
              <p className="text-sm text-danger mt-1">
                {errors.padraoSono.message}
              </p>
            )}
          </div>

          {watchPadraoSono === 'Outro' && (
            <div>
              <Label>Especificar outro padrão</Label>
              <Input
                {...register('outroPadrao')}
                className="mt-2"
                placeholder="Descreva o padrão de sono"
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2 resize-none"
              placeholder="Observações adicionais sobre o sono..."
            />
          </div>

          {/* Campo de motivo OBRIGATÓRIO */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Motivo da edição
            </Label>
            <Textarea
              {...register('editReason')}
              rows={4}
              className="mt-2 resize-none"
              placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
            />
            {errors.editReason && (
              <p className="text-sm text-danger mt-1">
                {errors.editReason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
