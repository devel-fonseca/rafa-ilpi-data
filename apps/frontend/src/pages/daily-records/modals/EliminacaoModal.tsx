import { useState, useEffect, Fragment, MouseEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { getCurrentTimeLocal } from '@/utils/timezone'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const eliminacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  tipo: z.enum(['Urina', 'Fezes'], {
    required_error: 'Tipo é obrigatório',
  }),
  // Campos para Fezes
  consistencia: z.string().optional(),
  // Campos compartilhados
  cor: z.string().optional(),
  volume: z.string().optional(),
  // Campo para Urina
  odor: z.string().optional(),
  // Campo livre para observações customizadas
  observacoes: z.string().optional(),
  // Troca de fraldas (para futura integração)
  trocaFralda: z.boolean(),
})

type EliminacaoFormData = z.infer<typeof eliminacaoSchema>

interface EliminacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function EliminacaoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: EliminacaoModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EliminacaoFormData>({
    resolver: zodResolver(eliminacaoSchema),
    defaultValues: {
      time: getCurrentTimeLocal(),
      tipo: 'Fezes',
      // Valores normais para Fezes
      consistencia: 'Formada',
      cor: 'Marrom (normal)',
      volume: 'Médio (normal)',
      observacoes: 'Sem observações',
      trocaFralda: false,
    },
  })

  const tipo = watch('tipo')

  // Ajustar valores padrão quando o tipo mudar
  useEffect(() => {
    if (tipo === 'Fezes') {
      setValue('consistencia', 'Formada')
      setValue('cor', 'Marrom (normal)')
      setValue('volume', 'Médio (normal)')
      setValue('odor', undefined)
    } else if (tipo === 'Urina') {
      setValue('cor', 'Amarelo-clara (normal)')
      setValue('odor', 'Normal')
      setValue('volume', 'Médio (normal)')
      setValue('consistencia', undefined)
    }
  }, [tipo, setValue])

  const nextStep = (e?: MouseEvent) => {
    e?.preventDefault()
    if (currentStep < 2) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: MouseEvent) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleFormSubmit = (data: EliminacaoFormData) => {
    const payload = {
      residentId,
      type: 'ELIMINACAO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        tipo: data.tipo,
        frequencia: 1, // Sempre 1, não visível ao usuário
        consistencia: data.consistencia,
        cor: data.cor,
        volume: data.volume,
        odor: data.odor,
        observacoes: data.observacoes,
        trocaFralda: data.trocaFralda,
      },
    }
    onSubmit(payload)
    reset()
    setCurrentStep(1)
  }

  const handleClose = () => {
    reset()
    setCurrentStep(1)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eliminações - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {formatDateOnlySafe(date)}
          </p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2].map((step) => (
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
                  {step}
                </div>
                <span className="text-xs text-muted-foreground">
                  {step === 1 ? 'Tipo' : 'Detalhes'}
                </span>
              </div>
              {step < 2 && (
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Formada">Formada</SelectItem>
                            <SelectItem value="Macia">Macia</SelectItem>
                            <SelectItem value="Pastosa">Pastosa</SelectItem>
                            <SelectItem value="Diarréica">Diarréica</SelectItem>
                            <SelectItem value="Ressecada">Ressecada</SelectItem>
                            <SelectItem value="Endurecida">
                              Endurecida
                            </SelectItem>
                            <SelectItem value="Caprinoide">
                              Caprinoide
                            </SelectItem>
                            <SelectItem value="Muco presente">
                              Muco presente
                            </SelectItem>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Marrom (normal)">
                              Marrom (normal)
                            </SelectItem>
                            <SelectItem value="Marrom-claro">
                              Marrom-claro
                            </SelectItem>
                            <SelectItem value="Marrom-escuro">
                              Marrom-escuro
                            </SelectItem>
                            <SelectItem value="Amarelada">Amarelada</SelectItem>
                            <SelectItem value="Esverdeada">
                              Esverdeada
                            </SelectItem>
                            <SelectItem value="Avermelhada (atenção)">
                              Avermelhada (atenção)
                            </SelectItem>
                            <SelectItem value="Preta/borra de café (atenção)">
                              Preta/borra de café (atenção)
                            </SelectItem>
                            <SelectItem value="Branca/Esbranquiçada (atenção)">
                              Branca/Esbranquiçada (atenção)
                            </SelectItem>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pequeno">Pequeno</SelectItem>
                            <SelectItem value="Médio (normal)">
                              Médio (normal)
                            </SelectItem>
                            <SelectItem value="Grande">Grande</SelectItem>
                            <SelectItem value="Traços apenas">
                              Traços apenas
                            </SelectItem>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Amarelo-clara (normal)">
                              Amarelo-clara (normal)
                            </SelectItem>
                            <SelectItem value="Amarelo intensa">
                              Amarelo intensa
                            </SelectItem>
                            <SelectItem value="Transparente">
                              Transparente
                            </SelectItem>
                            <SelectItem value="Escurecida">
                              Escurecida
                            </SelectItem>
                            <SelectItem value="Avermelhada/Hematúria (atenção)">
                              Avermelhada/Hematúria (atenção)
                            </SelectItem>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pequeno">Pequeno</SelectItem>
                            <SelectItem value="Médio (normal)">
                              Médio (normal)
                            </SelectItem>
                            <SelectItem value="Grande">Grande</SelectItem>
                            <SelectItem value="Gotejamento/Poucas gotas">
                              Gotejamento/Poucas gotas
                            </SelectItem>
                            <SelectItem value="Ausência">Ausência</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Troca de Fralda */}
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

          <div className="text-sm text-muted-foreground">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Voltar
              </Button>
            )}
            {currentStep < 2 ? (
              <Button type="button" onClick={nextStep} disabled={!tipo}>
                Próximo
              </Button>
            ) : (
              <Button type="submit" variant="success">
                Adicionar
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
