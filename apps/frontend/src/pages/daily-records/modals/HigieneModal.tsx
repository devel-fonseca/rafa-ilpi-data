import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
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

const higieneSchema = z.object({
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
})

type HigieneFormData = z.infer<typeof higieneSchema>

interface HigieneModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function HigieneModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: HigieneModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<HigieneFormData>({
    resolver: zodResolver(higieneSchema),
    defaultValues: {
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      tipoBanho: 'Chuveiro',
      duracao: '5',
      condicaoPele: 'Normal',
      localAlteracao: 'Sem alteração',
      hidratanteAplicado: false,
      higieneBucal: false,
      trocaFralda: false,
      observacoes: 'Sem observações',
    },
  })

  const trocaFralda = watch('trocaFralda')
  const tipoBanho = watch('tipoBanho')

  const handleFormSubmit = (data: HigieneFormData) => {
    const payload = {
      residentId,
      type: 'HIGIENE',
      date,
      time: data.time,
      recordedBy: currentUserName,
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

  const nextStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Higiene Corporal - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {new Date(date).toLocaleDateString('pt-BR')}
          </p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((step) => (
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
                </span>
              </div>
              {step < 3 && (
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

              <div className="text-sm text-muted-foreground">
                Responsável: <span className="font-medium">{currentUserName}</span>
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
                <Button type="button" variant="outline" onClick={(e) => prevStep(e)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              {currentStep < 3 ? (
                <Button type="button" onClick={(e) => nextStep(e)}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" variant="success">
                  <Check className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
