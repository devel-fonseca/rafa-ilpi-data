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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

const alimentacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  refeicao: z.enum(
    ['Café da Manhã', 'Colação', 'Almoço', 'Lanche', 'Jantar', 'Ceia'],
    { required_error: 'Refeição é obrigatória' },
  ),
  cardapio: z.string().optional(),
  consistencia: z.enum(['Geral', 'Pastosa', 'Líquida', 'Triturada'], {
    required_error: 'Consistência é obrigatória',
  }),
  ingeriu: z.enum(['100%', '75%', '50%', '<25%', 'Recusou'], {
    required_error: 'Campo obrigatório',
  }),
  auxilioNecessario: z.boolean(),
  volumeMl: z.coerce
    .number()
    .positive('Volume deve ser maior que zero')
    .max(5000, 'Volume máximo: 5000ml')
    .optional()
    .or(z.literal('')),
  intercorrencia: z
    .enum(['Engasgo', 'Náusea', 'Vômito', 'Recusa', 'Nenhuma'])
    .optional(),
  observacoes: z.string().optional(),
})

type AlimentacaoFormData = z.infer<typeof alimentacaoSchema>

interface AlimentacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function AlimentacaoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: AlimentacaoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<AlimentacaoFormData>({
    resolver: zodResolver(alimentacaoSchema),
    defaultValues: {
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      auxilioNecessario: false,
    },
  })

  const handleFormSubmit = (data: AlimentacaoFormData) => {
    const payload = {
      residentId,
      type: 'ALIMENTACAO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        refeicao: data.refeicao,
        cardapio: data.cardapio,
        consistencia: data.consistencia,
        ingeriu: data.ingeriu,
        auxilioNecessario: data.auxilioNecessario,
        volumeMl: data.volumeMl || undefined, // Volume de líquidos durante a refeição
        intercorrencia: data.intercorrencia,
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
          <DialogTitle>Alimentação - {residentName}</DialogTitle>
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
              />
              {errors.time && (
                <p className="text-sm text-red-500 mt-1">{errors.time.message}</p>
              )}
            </div>

            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
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
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.refeicao && (
                <p className="text-sm text-red-500 mt-1">
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
              placeholder="Ex: Leite, pão com manteiga, banana"
            />
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
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
              <p className="text-sm text-red-500 mt-1">
                {errors.consistencia.message}
              </p>
            )}
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
              Ingeriu
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
              <p className="text-sm text-red-500 mt-1">{errors.ingeriu.message}</p>
            )}
          </div>

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
                    <Label htmlFor="auxilio-sim" className="font-normal cursor-pointer">
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="auxilio-nao" />
                    <Label htmlFor="auxilio-nao" className="font-normal cursor-pointer">
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          <div>
            <Label>Hidratação durante a refeição (ml)</Label>
            <Input
              {...register('volumeMl')}
              type="number"
              className="mt-2"
              placeholder="Ex: 200"
            />
            {errors.volumeMl && (
              <p className="text-sm text-red-500 mt-1">{errors.volumeMl.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Volume de líquidos ingeridos (água, suco, leite, etc)
            </p>
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
            <Textarea {...register('observacoes')} rows={3} className="mt-2" />
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
