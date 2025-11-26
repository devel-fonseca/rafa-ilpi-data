import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ChevronRight, ChevronLeft, Check } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const editHigieneSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido. Use HH:mm'),
  tipoBanho: z.enum(['Sem banho', 'Chuveiro', 'Leito', 'Aspersão']).optional(),
  duracao: z.string().optional(),
  condicaoPele: z.enum(['Normal', 'Ressecada', 'Lesão', 'Edema']).optional(),
  localAlteracao: z.string().optional(),
  hidratanteAplicado: z.boolean(),
  higieneBucal: z.boolean(),
  trocaFralda: z.boolean(),
  quantidadeFraldas: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditHigieneFormData = z.infer<typeof editHigieneSchema>

interface EditHigieneModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  record: any
  isUpdating?: boolean
}

export function EditHigieneModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditHigieneModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditHigieneFormData>({
    resolver: zodResolver(editHigieneSchema),
  })

  const trocaFralda = watch('trocaFralda')
  const tipoBanho = watch('tipoBanho')

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        tipoBanho: record.data.tipoBanho || 'Chuveiro',
        duracao: record.data.duracao ? String(record.data.duracao) : '',
        condicaoPele: record.data.condicaoPele || 'Normal',
        localAlteracao: record.data.localAlteracao || '',
        hidratanteAplicado: record.data.hidratanteAplicado || false,
        higieneBucal: record.data.higieneBucal || false,
        trocaFralda: record.data.trocaFralda || false,
        quantidadeFraldas: record.data.quantidadeFraldas
          ? String(record.data.quantidadeFraldas)
          : '',
        observacoes: record.notes || '',
        editReason: '',
      })
      setCurrentStep(1)
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditHigieneFormData) => {
    const payload = {
      time: data.time,
      data: {
        tipoBanho: data.tipoBanho,
        duracao: data.duracao ? parseInt(data.duracao) : undefined,
        condicaoPele: data.condicaoPele,
        localAlteracao: data.localAlteracao,
        hidratanteAplicado: data.hidratanteAplicado,
        higieneBucal: data.higieneBucal,
        trocaFralda: data.trocaFralda,
        quantidadeFraldas: data.quantidadeFraldas
          ? parseInt(data.quantidadeFraldas)
          : undefined,
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

  const nextStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Higiene Corporal
          </DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo da edição para auditoria.
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
                  {step === 1 && 'Banho'}
                  {step === 2 && 'Pele'}
                  {step === 3 && 'Observações'}
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
          {/* Etapa 1: Banho e Higiene Básica */}
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
                  <Label>Tipo de banho</Label>
                  <Controller
                    name="tipoBanho"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sem banho">Sem banho</SelectItem>
                          <SelectItem value="Chuveiro">Chuveiro</SelectItem>
                          <SelectItem value="Leito">Leito</SelectItem>
                          <SelectItem value="Aspersão">Aspersão</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label>Duração (min)</Label>
                <Input
                  {...register('duracao')}
                  type="number"
                  className="mt-2"
                  placeholder="5"
                  disabled={tipoBanho === 'Sem banho'}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Controller
                    name="higieneBucal"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="bucal"
                      />
                    )}
                  />
                  <Label htmlFor="bucal" className="font-normal cursor-pointer">
                    Higiene bucal realizada
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Controller
                    name="trocaFralda"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="fralda"
                      />
                    )}
                  />
                  <Label htmlFor="fralda" className="font-normal cursor-pointer">
                    Troca de fralda/roupa
                  </Label>
                </div>

                {trocaFralda && (
                  <div className="ml-6">
                    <Label>Quantidade de fraldas</Label>
                    <Input
                      {...register('quantidadeFraldas')}
                      type="number"
                      className="mt-2"
                      placeholder="1"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Etapa 2: Condição da Pele */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Condição da pele</Label>
                <Controller
                  name="condicaoPele"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Ressecada">Ressecada</SelectItem>
                        <SelectItem value="Lesão">Lesão</SelectItem>
                        <SelectItem value="Edema">Edema</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Local da alteração</Label>
                <Input
                  {...register('localAlteracao')}
                  className="mt-2"
                  placeholder="Ex: Braços e pernas"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Controller
                  name="hidratanteAplicado"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="hidratante"
                    />
                  )}
                />
                <Label htmlFor="hidratante" className="font-normal cursor-pointer">
                  Hidratante aplicado
                </Label>
              </div>
            </div>
          )}

          {/* Etapa 3: Observações */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Observações</Label>
                <Textarea
                  {...register('observacoes')}
                  rows={5}
                  className="mt-2"
                  placeholder="Observações adicionais sobre o procedimento"
                />
              </div>
            </div>
          )}

          {/* Etapa 4: Informações Originais e Motivo da Edição */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Box com info do registro original */}
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
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => prevStep(e)}
                  disabled={isUpdating}
                >
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
