import { useState, useEffect, MouseEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronLeft, Check, Edit } from 'lucide-react'
import { extractDateOnly } from '@/utils/dateHelpers'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const editAlimentacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  refeicao: z.enum(
    ['Café da Manhã', 'Colação', 'Almoço', 'Lanche', 'Jantar', 'Ceia', 'Colação Extra'],
    { message: 'Refeição é obrigatória' },
  ),
  cardapio: z.string().optional(),
  consistencia: z.enum(['Geral', 'Pastosa', 'Líquida', 'Triturada'], {
    message: 'Consistência é obrigatória',
  }),
  ingeriu: z.enum(['100%', '75%', '50%', '<25%', 'Recusou'], {
    message: 'Campo obrigatório',
  }),
  auxilioNecessario: z.boolean(),
  volumeMl: z.string().optional(),
  intercorrencia: z
    .enum(['Engasgo', 'Náusea', 'Vômito', 'Recusa', 'Nenhuma'])
    .optional(),
  observacoes: z.string().optional(),
  editReason: z
    .string()
    .min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditAlimentacaoFormData = z.infer<typeof editAlimentacaoSchema>

interface AlimentacaoRecord {
  time: string
  data: Record<string, unknown>
  [key: string]: unknown
}

interface EditAlimentacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: AlimentacaoRecord
  isUpdating?: boolean
}

export function EditAlimentacaoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating = false,
}: EditAlimentacaoModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<EditAlimentacaoFormData>({
    resolver: zodResolver(editAlimentacaoSchema),
  })

  // Reset form when record changes
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        refeicao: record.data.refeicao,
        cardapio: record.data.cardapio || '',
        consistencia: record.data.consistencia,
        ingeriu: record.data.ingeriu,
        auxilioNecessario: record.data.auxilioNecessario || false,
        volumeMl: record.data.volumeMl?.toString() || '',
        intercorrencia: record.data.intercorrencia || 'Nenhuma',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditAlimentacaoFormData) => {
    const payload = {
      time: data.time,
      data: {
        refeicao: data.refeicao,
        cardapio: data.cardapio,
        consistencia: data.consistencia,
        ingeriu: data.ingeriu,
        auxilioNecessario: data.auxilioNecessario,
        volumeMl: data.volumeMl ? parseInt(data.volumeMl) : undefined,
        intercorrencia: data.intercorrencia,
      },
      notes: data.observacoes,
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  const handleClose = () => {
    reset()
    setCurrentStep(1)
    onClose()
  }

  const nextStep = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Alimentação
          </DialogTitle>
          <DialogDescription>
            Edite os dados do registro de alimentação. É obrigatório informar o motivo da edição.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                    currentStep === step
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > step
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                <span className="text-xs mt-1 text-muted-foreground">
                  {step === 1 && 'Refeição'}
                  {step === 2 && 'Hidratação'}
                  {step === 3 && 'Detalhes'}
                  {step === 4 && 'Motivo'}
                </span>
              </div>
              {step < 4 && (
                <div
                  className={cn(
                    'h-1 flex-1 mx-2',
                    currentStep > step ? 'bg-success' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Etapa 1: Refeição, Cardápio, Consistência e Ingestão */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                    Horário
                  </Label>
                  <Input
                    {...register('time')}
                    type="time"
                    className="mt-2"
                    placeholder="HH:mm"
                  />
                  {errors.time && (
                    <p className="text-sm text-danger mt-1">
                      {errors.time.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                    Refeição
                  </Label>
                  <Controller
                    name="refeicao"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Café da Manhã">Café da Manhã</SelectItem>
                          <SelectItem value="Colação">Colação</SelectItem>
                          <SelectItem value="Almoço">Almoço</SelectItem>
                          <SelectItem value="Lanche">Lanche</SelectItem>
                          <SelectItem value="Jantar">Jantar</SelectItem>
                          <SelectItem value="Ceia">Ceia</SelectItem>
                          <SelectItem value="Colação Extra">Colação Extra</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.refeicao && (
                    <p className="text-sm text-danger mt-1">
                      {errors.refeicao.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Cardápio</Label>
                <Input
                  {...register('cardapio')}
                  className="mt-2"
                  placeholder="Refeição institucional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                    Consistência
                  </Label>
                  <Controller
                    name="consistencia"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Geral">Geral</SelectItem>
                          <SelectItem value="Pastosa">Pastosa</SelectItem>
                          <SelectItem value="Líquida">Líquida</SelectItem>
                          <SelectItem value="Triturada">Triturada</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.consistencia && (
                    <p className="text-sm text-danger mt-1">
                      {errors.consistencia.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                    Ingestão
                  </Label>
                  <Controller
                    name="ingeriu"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100%">100%</SelectItem>
                          <SelectItem value="75%">75%</SelectItem>
                          <SelectItem value="50%">50%</SelectItem>
                          <SelectItem value="<25%">&lt;25%</SelectItem>
                          <SelectItem value="Recusou">Recusou</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.ingeriu && (
                    <p className="text-sm text-danger mt-1">
                      {errors.ingeriu.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2: Hidratação durante a refeição */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Hidratação durante a refeição (ml)</Label>
                <Input
                  {...register('volumeMl')}
                  type="number"
                  className="mt-2"
                  placeholder="200"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Volume de líquidos ingeridos (água, suco, leite, etc)
                </p>
              </div>
            </div>
          )}

          {/* Etapa 3: Auxílio, Intercorrência e Observações */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Auxílio necessário?</Label>
                <Controller
                  name="auxilioNecessario"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === 'true')}
                      value={field.value ? 'true' : 'false'}
                      className="mt-2 flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="auxilio-sim" />
                        <Label
                          htmlFor="auxilio-sim"
                          className="font-normal cursor-pointer"
                        >
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="auxilio-nao" />
                        <Label
                          htmlFor="auxilio-nao"
                          className="font-normal cursor-pointer"
                        >
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              <div>
                <Label>Intercorrência</Label>
                <Controller
                  name="intercorrencia"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                        <SelectItem value="Engasgo">Engasgo</SelectItem>
                        <SelectItem value="Náusea">Náusea</SelectItem>
                        <SelectItem value="Vômito">Vômito</SelectItem>
                        <SelectItem value="Recusa">Recusa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  {...register('observacoes')}
                  rows={5}
                  className="mt-2"
                  placeholder="Observações adicionais sobre a refeição"
                />
              </div>
            </div>
          )}

          {/* Etapa 4: Motivo da Edição */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Informações do Registro Original</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Registrado por:</span>{' '}
                    {record.recordedBy}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Data:</span>{' '}
                    {format(new Date(extractDateOnly(record.date) + 'T12:00:00'), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="editReason"
                  className="after:content-['*'] after:ml-0.5 after:text-danger"
                >
                  Motivo da edição
                </Label>
                <Textarea
                  {...register('editReason')}
                  id="editReason"
                  placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
                  rows={4}
                  className="resize-none"
                />
                {errors.editReason ? (
                  <p className="text-sm text-danger">{errors.editReason.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Campo obrigatório para auditoria
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
                Cancelar
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={(e) => prevStep(e)} disabled={isUpdating}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              {currentStep < 4 ? (
                <Button type="button" onClick={(e) => nextStep(e)}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isUpdating} className="bg-primary">
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
