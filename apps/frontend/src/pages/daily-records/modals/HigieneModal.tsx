import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const higieneSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido. Use HH:mm'),
  tipoBanho: z.enum(['Chuveiro', 'Leito', 'Aspersão'], {
    required_error: 'Tipo de banho é obrigatório',
  }),
  duracao: z.string().optional(),
  condicaoPele: z.enum(['Normal', 'Ressecada', 'Lesão', 'Edema'], {
    required_error: 'Condição da pele é obrigatória',
  }),
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
      hidratanteAplicado: false,
      higieneBucal: false,
      trocaFralda: false,
    },
  })

  const trocaFralda = watch('trocaFralda')

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
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Higiene Corporal - {residentName}</DialogTitle>
          <p className="text-sm text-gray-500">
            Data: {new Date(date).toLocaleDateString('pt-BR')}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Horário
              </Label>
              <Input
                {...register('time')}
                type="time"
                className="mt-2"
                placeholder="HH:mm"
              />
              {errors.time && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.time.message}
                </p>
              )}
            </div>

            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Tipo de banho
              </Label>
              <Controller
                name="tipoBanho"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chuveiro">Chuveiro</SelectItem>
                      <SelectItem value="Leito">Leito</SelectItem>
                      <SelectItem value="Aspersão">Aspersão</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipoBanho && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.tipoBanho.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Duração (min)</Label>
            <Input
              {...register('duracao')}
              type="number"
              className="mt-2"
              placeholder="15"
            />
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
              Condição da pele
            </Label>
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
            {errors.condicaoPele && (
              <p className="text-sm text-red-500 mt-1">
                {errors.condicaoPele.message}
              </p>
            )}
          </div>

          <div>
            <Label>Local da alteração</Label>
            <Input
              {...register('localAlteracao')}
              className="mt-2"
              placeholder="Ex: Braços e pernas"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
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

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre o procedimento"
            />
          </div>

          <div className="text-sm text-gray-600">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
