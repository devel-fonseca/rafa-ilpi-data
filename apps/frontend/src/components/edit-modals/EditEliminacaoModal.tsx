import { useEffect, useState, Fragment, MouseEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

const editEliminacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  tipo: z.enum(['Urina', 'Fezes'], {
    message: 'Tipo é obrigatório',
  }),
  consistencia: z.string().optional(),
  cor: z.string().optional(),
  volume: z.string().optional(),
  odor: z.string().optional(),
  observacoes: z.string().optional(),
  trocaFralda: z.boolean(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditEliminacaoFormData = z.infer<typeof editEliminacaoSchema>

interface EditEliminacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  record: any
  isUpdating?: boolean
}

export function EditEliminacaoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditEliminacaoModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EditEliminacaoFormData>({
    resolver: zodResolver(editEliminacaoSchema),
  })

  const tipo = watch('tipo')

  // Ajustar valores padrão quando o tipo mudar
  useEffect(() => {
    if (tipo === 'Fezes') {
      setValue('odor', undefined)
    } else if (tipo === 'Urina') {
      setValue('consistencia', undefined)
    }
  }, [tipo, setValue])

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        tipo: record.data.tipo || 'Fezes',
        consistencia: record.data.consistencia || undefined,
        cor: record.data.cor || undefined,
        volume: record.data.volume || undefined,
        odor: record.data.odor || undefined,
        observacoes: record.notes || '',
        trocaFralda: record.data.trocaFralda || false,
        editReason: '',
      })
      setCurrentStep(1)
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditEliminacaoFormData) => {
    const payload = {
      time: data.time,
      data: {
        tipo: data.tipo,
        frequencia: 1,
        consistencia: data.consistencia,
        cor: data.cor,
        volume: data.volume,
        odor: data.odor,
        observacoes: data.observacoes,
        trocaFralda: data.trocaFralda,
      },
      notes: data.observacoes,
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  const handleClose = () => {
    setCurrentStep(1)
    onClose()
  }

  const nextStep = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Eliminações
          </DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo da edição para auditoria.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((step) => (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
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
                <span className="text-xs text-muted-foreground">
                  {step === 1 && 'Tipo'}
                  {step === 2 && 'Detalhes'}
                  {step === 3 && 'Motivo'}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={cn(
                    'h-0.5 w-12 transition-colors',
                    currentStep > step ? 'bg-success' : 'bg-muted'
                  )}
                />
              )}
            </Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Step 1: Tipo e Horário */}
          {currentStep === 1 && (
            <>
              <div>
                <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                  Horário
                </Label>
                <Input {...register('time')} type="time" className="mt-2" />
                {errors.time && (
                  <p className="text-sm text-danger mt-1">
                    {errors.time.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                  Tipo
                </Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fezes">Fezes</SelectItem>
                        <SelectItem value="Urina">Urina</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipo && (
                  <p className="text-sm text-danger mt-1">
                    {errors.tipo.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Campos condicionais baseados no tipo */}
          {currentStep === 2 && (
            <>
              {tipo === 'Fezes' && (
                <>
                  <div>
                    <Label>Consistência</Label>
                    <Controller
                      name="consistencia"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Formada">Formada</SelectItem>
                            <SelectItem value="Macia">Macia</SelectItem>
                            <SelectItem value="Pastosa">Pastosa</SelectItem>
                            <SelectItem value="Diarréica">Diarréica</SelectItem>
                            <SelectItem value="Ressecada">Ressecada</SelectItem>
                            <SelectItem value="Endurecida">Endurecida</SelectItem>
                            <SelectItem value="Caprinoide">Caprinoide</SelectItem>
                            <SelectItem value="Muco presente">Muco presente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Cor</Label>
                    <Controller
                      name="cor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Marrom (normal)">Marrom (normal)</SelectItem>
                            <SelectItem value="Marrom-claro">Marrom-claro</SelectItem>
                            <SelectItem value="Marrom-escuro">Marrom-escuro</SelectItem>
                            <SelectItem value="Amarelada">Amarelada</SelectItem>
                            <SelectItem value="Esverdeada">Esverdeada</SelectItem>
                            <SelectItem value="Avermelhada (atenção)">Avermelhada (atenção)</SelectItem>
                            <SelectItem value="Preta/borra de café (atenção)">Preta/borra de café (atenção)</SelectItem>
                            <SelectItem value="Branca/Esbranquiçada (atenção)">Branca/Esbranquiçada (atenção)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Volume</Label>
                    <Controller
                      name="volume"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pequeno">Pequeno</SelectItem>
                            <SelectItem value="Médio (normal)">Médio (normal)</SelectItem>
                            <SelectItem value="Grande">Grande</SelectItem>
                            <SelectItem value="Traços apenas">Traços apenas</SelectItem>
                            <SelectItem value="Ausente">Ausente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              {tipo === 'Urina' && (
                <>
                  <div>
                    <Label>Cor</Label>
                    <Controller
                      name="cor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Amarelo-clara (normal)">Amarelo-clara (normal)</SelectItem>
                            <SelectItem value="Amarelo intensa">Amarelo intensa</SelectItem>
                            <SelectItem value="Transparente">Transparente</SelectItem>
                            <SelectItem value="Escurecida">Escurecida</SelectItem>
                            <SelectItem value="Avermelhada/Hematúria (atenção)">Avermelhada/Hematúria (atenção)</SelectItem>
                            <SelectItem value="Turva">Turva</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Odor</Label>
                    <Controller
                      name="odor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="Forte">Forte</SelectItem>
                            <SelectItem value="Amoniacal">Amoniacal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Volume</Label>
                    <Controller
                      name="volume"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pequeno">Pequeno</SelectItem>
                            <SelectItem value="Médio (normal)">Médio (normal)</SelectItem>
                            <SelectItem value="Grande">Grande</SelectItem>
                            <SelectItem value="Gotejamento/Poucas gotas">Gotejamento/Poucas gotas</SelectItem>
                            <SelectItem value="Ausência">Ausência</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Controller
                  name="trocaFralda"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="trocaFralda"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="trocaFralda" className="font-normal cursor-pointer">
                  Troca de fralda/roupa
                </Label>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  {...register('observacoes')}
                  rows={3}
                  className="mt-2"
                  placeholder="Observações adicionais..."
                />
              </div>
            </>
          )}

          {/* Step 3: Informações Originais e Motivo */}
          {currentStep === 3 && (
            <>
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Registrado por:</span>{' '}
                  {record.recordedBy}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Data:</span>{' '}
                  {new Date(record.date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Horário original:</span> {record.time}
                </p>
              </div>

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
            </>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isUpdating}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              {currentStep < 3 ? (
                <Button type="button" onClick={nextStep} disabled={!tipo}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" variant="success" disabled={isUpdating}>
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
