import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createBelonging, updateBelonging } from '@/api/belongings.api'
import {
  BelongingCategory,
  ConservationState,
  CATEGORY_LABELS,
  CONSERVATION_STATE_LABELS,
  type ResidentBelonging,
} from '@/types/belongings'

const formSchema = z.object({
  category: z.nativeEnum(BelongingCategory, { required_error: 'Selecione uma categoria' }),
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  brandModel: z.string().max(100).optional(),
  quantity: z.coerce.number().min(1, 'Quantidade mínima é 1').default(1),
  conservationState: z.nativeEnum(ConservationState, { required_error: 'Selecione o estado' }),
  identification: z.string().max(100).optional(),
  declaredValue: z.coerce.number().min(0).optional(),
  storageLocation: z.string().max(100).optional(),
  entryDate: z.string().min(1, 'Data de entrada é obrigatória'),
  deliveredBy: z.string().min(1, 'Informe quem entregou').max(150),
  receivedBy: z.string().min(1, 'Informe quem recebeu').max(150),
  notes: z.string().optional(),
  changeReason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').optional(),
})

type FormValues = z.infer<typeof formSchema>

interface BelongingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  belonging?: ResidentBelonging
}

export function BelongingFormDialog({
  open,
  onOpenChange,
  residentId,
  belonging,
}: BelongingFormDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!belonging

  const form = useForm<FormValues>({
    resolver: zodResolver(
      isEditing
        ? formSchema.extend({
            changeReason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
          })
        : formSchema,
    ),
    defaultValues: {
      quantity: 1,
      entryDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  // Reset form when dialog opens/closes or belonging changes
  useEffect(() => {
    if (open && belonging) {
      form.reset({
        category: belonging.category,
        description: belonging.description,
        brandModel: belonging.brandModel || '',
        quantity: belonging.quantity,
        conservationState: belonging.conservationState,
        identification: belonging.identification || '',
        declaredValue: belonging.declaredValue ? Number(belonging.declaredValue) : undefined,
        storageLocation: belonging.storageLocation || '',
        entryDate: belonging.entryDate.split('T')[0],
        deliveredBy: belonging.deliveredBy,
        receivedBy: belonging.receivedBy,
        notes: belonging.notes || '',
        changeReason: '',
      })
    } else if (open && !belonging) {
      form.reset({
        quantity: 1,
        entryDate: format(new Date(), 'yyyy-MM-dd'),
        category: undefined,
        description: '',
        brandModel: '',
        conservationState: undefined,
        identification: '',
        declaredValue: undefined,
        storageLocation: '',
        deliveredBy: '',
        receivedBy: '',
        notes: '',
      })
    }
  }, [open, belonging, form])

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      createBelonging(residentId, {
        category: data.category,
        description: data.description,
        brandModel: data.brandModel,
        quantity: data.quantity,
        conservationState: data.conservationState,
        identification: data.identification,
        declaredValue: data.declaredValue,
        storageLocation: data.storageLocation,
        entryDate: data.entryDate,
        deliveredBy: data.deliveredBy,
        receivedBy: data.receivedBy,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success('Pertence cadastrado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['belongings', residentId] })
      queryClient.invalidateQueries({ queryKey: ['belongings-stats', residentId] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao cadastrar pertence')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      updateBelonging(residentId, belonging!.id, {
        description: data.description,
        brandModel: data.brandModel,
        quantity: data.quantity,
        conservationState: data.conservationState,
        identification: data.identification,
        declaredValue: data.declaredValue,
        storageLocation: data.storageLocation,
        notes: data.notes,
        changeReason: data.changeReason!,
      }),
    onSuccess: () => {
      toast.success('Pertence atualizado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['belongings', residentId] })
      queryClient.invalidateQueries({ queryKey: ['belongings-stats', residentId] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar pertence')
    },
  })

  const onSubmit = (data: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Pertence' : 'Novo Pertence'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do pertence'
              : 'Preencha as informações do novo pertence'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conservationState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Conservação *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CONSERVATION_STATE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Celular Samsung Galaxy S21" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brandModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca/Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Samsung Galaxy S21" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="identification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificação</FormLabel>
                    <FormControl>
                      <Input placeholder="Cor, número de série..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="declaredValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Declarado (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storageLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local de Armazenamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Armário do quarto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="entryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Entrada *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveredBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entregue por *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do familiar/responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receivedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recebido por *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do funcionário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre o item..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="changeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Alteração *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo da alteração (mínimo 10 caracteres)"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
