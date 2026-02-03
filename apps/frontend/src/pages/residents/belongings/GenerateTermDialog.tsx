import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

import { generateTerm, listBelongings } from '@/api/belongings.api'
import { useAuthStore } from '@/stores/auth.store'
import {
  BelongingTermType,
  BelongingMovementType,
  BelongingStatus,
  TERM_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
  CATEGORY_LABELS,
  type ResidentBelonging,
  type TermItemDto,
} from '@/types/belongings'

const formSchema = z.object({
  type: z.nativeEnum(BelongingTermType, { required_error: 'Selecione o tipo' }),
  termDate: z.string().min(1, 'Data é obrigatória'),
  issuedBy: z.string().min(1, 'Informe quem emitiu').max(150),
  receivedBy: z.string().max(150).optional(),
  receiverDocument: z.string().max(50).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface GenerateTermDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  selectedItems?: ResidentBelonging[]
}

export function GenerateTermDialog({
  open,
  onOpenChange,
  residentId,
  selectedItems: initialSelectedItems,
}: GenerateTermDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [termItems, setTermItems] = useState<
    (TermItemDto & { description: string; category: string })[]
  >([])

  // Fetch all belongings to show available items
  const { data: belongingsData } = useQuery({
    queryKey: ['belongings', residentId, { status: BelongingStatus.EM_GUARDA }],
    queryFn: () => listBelongings(residentId, { status: BelongingStatus.EM_GUARDA, limit: 100 }),
    enabled: open,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      termDate: format(new Date(), 'yyyy-MM-dd'),
      type: BelongingTermType.RECEBIMENTO,
      issuedBy: user?.name || '',
      receivedBy: '',
      receiverDocument: '',
      notes: '',
    },
  })

  const selectedType = form.watch('type')

  // Initialize with pre-selected items
  useEffect(() => {
    if (open && initialSelectedItems && initialSelectedItems.length > 0) {
      setTermItems(
        initialSelectedItems.map((item) => ({
          belongingId: item.id,
          movementType: BelongingMovementType.ENTRADA,
          description: item.description,
          category: CATEGORY_LABELS[item.category],
        })),
      )
    } else if (!open) {
      setTermItems([])
      form.reset({
        termDate: format(new Date(), 'yyyy-MM-dd'),
        type: BelongingTermType.RECEBIMENTO,
        issuedBy: user?.name || '',
        receivedBy: '',
        receiverDocument: '',
        notes: '',
      })
    }
  }, [open, initialSelectedItems, form, user?.name])

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      generateTerm(residentId, {
        type: data.type,
        termDate: data.termDate,
        issuedBy: data.issuedBy,
        receivedBy: data.receivedBy,
        receiverDocument: data.receiverDocument,
        notes: data.notes,
        items: termItems.map(({ belongingId, movementType, previousState, newState, stateChangeReason }) => ({
          belongingId,
          movementType,
          previousState,
          newState,
          stateChangeReason,
        })),
      }),
    onSuccess: () => {
      toast.success('Termo gerado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['belonging-terms', residentId] })
      queryClient.invalidateQueries({ queryKey: ['belongings', residentId] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao gerar termo')
    },
  })

  const onSubmit = (data: FormValues) => {
    if (termItems.length === 0) {
      toast.error('Adicione pelo menos um item ao termo')
      return
    }
    mutation.mutate(data)
  }

  const addItem = (belonging: ResidentBelonging) => {
    if (termItems.some((i) => i.belongingId === belonging.id)) {
      toast.error('Item já adicionado')
      return
    }
    setTermItems((prev) => [
      ...prev,
      {
        belongingId: belonging.id,
        movementType: selectedType === BelongingTermType.DEVOLUCAO_FINAL
          ? BelongingMovementType.SAIDA
          : BelongingMovementType.ENTRADA,
        description: belonging.description,
        category: CATEGORY_LABELS[belonging.category],
      },
    ])
  }

  const removeItem = (belongingId: string) => {
    setTermItems((prev) => prev.filter((i) => i.belongingId !== belongingId))
  }

  const updateItemMovement = (belongingId: string, movementType: BelongingMovementType) => {
    setTermItems((prev) =>
      prev.map((i) =>
        i.belongingId === belongingId ? { ...i, movementType } : i,
      ),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar Termo de Pertences</DialogTitle>
          <DialogDescription>
            Selecione o tipo de termo e os itens a serem incluídos
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Termo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TERM_TYPE_LABELS).map(([key, label]) => (
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
                    name="termDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Termo *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="issuedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emitido por</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === BelongingTermType.DEVOLUCAO_FINAL && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="receivedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recebido por</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome de quem recebeu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receiverDocument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Documento (CPF/RG)</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações gerais sobre o termo..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Items Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Itens do Termo ({termItems.length})</h4>
                  </div>

                  {termItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Movimentação</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {termItems.map((item) => (
                          <TableRow key={item.belongingId}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>
                              <Select
                                value={item.movementType}
                                onValueChange={(v) =>
                                  updateItemMovement(
                                    item.belongingId,
                                    v as BelongingMovementType,
                                  )
                                }
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.belongingId)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {/* Available Items */}
                  <div className="border rounded-lg p-4 mt-4">
                    <h5 className="text-sm font-medium mb-2">Itens Disponíveis</h5>
                    {!belongingsData ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : belongingsData.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum item cadastrado com status "Em Guarda".
                        Cadastre itens primeiro na aba "Itens".
                      </p>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {belongingsData.items
                          .filter((b) => !termItems.some((t) => t.belongingId === b.id))
                          .map((belonging) => (
                            <div
                              key={belonging.id}
                              className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">{belonging.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[belonging.category]}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addItem(belonging)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                          ))}
                        {belongingsData.items.filter((b) => !termItems.some((t) => t.belongingId === b.id)).length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Todos os itens já foram adicionados ao termo.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending || termItems.length === 0}>
                {mutation.isPending ? 'Gerando...' : 'Gerar Termo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
