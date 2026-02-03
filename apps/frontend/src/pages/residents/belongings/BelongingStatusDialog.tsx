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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

import { changeBelongingStatus } from '@/api/belongings.api'
import { BelongingStatus, STATUS_LABELS, type ResidentBelonging } from '@/types/belongings'

const formSchema = z.object({
  status: z.nativeEnum(BelongingStatus, { required_error: 'Selecione o novo status' }),
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
  exitDate: z.string().min(1, 'Data é obrigatória'),
  exitReceivedBy: z.string().max(150).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface BelongingStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  belonging?: ResidentBelonging
}

export function BelongingStatusDialog({
  open,
  onOpenChange,
  residentId,
  belonging,
}: BelongingStatusDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      exitDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const selectedStatus = form.watch('status')

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      changeBelongingStatus(residentId, belonging!.id, {
        status: data.status,
        reason: data.reason,
        exitDate: data.exitDate,
        exitReceivedBy: data.exitReceivedBy,
      }),
    onSuccess: () => {
      toast.success('Status alterado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['belongings', residentId] })
      queryClient.invalidateQueries({ queryKey: ['belongings-stats', residentId] })
      onOpenChange(false)
      form.reset()
    },
    onError: () => {
      toast.error('Erro ao alterar status')
    },
  })

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data)
  }

  if (!belonging) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Status do Pertence</DialogTitle>
          <DialogDescription>
            Item: <strong>{belonging.description}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={BelongingStatus.DEVOLVIDO}>
                        {STATUS_LABELS[BelongingStatus.DEVOLVIDO]}
                      </SelectItem>
                      <SelectItem value={BelongingStatus.EXTRAVIADO}>
                        {STATUS_LABELS[BelongingStatus.EXTRAVIADO]}
                      </SelectItem>
                      <SelectItem value={BelongingStatus.DESCARTADO}>
                        {STATUS_LABELS[BelongingStatus.DESCARTADO]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedStatus === BelongingStatus.EXTRAVIADO && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Atenção: Marcar como extraviado indica que o item não foi localizado.
                  Esta ação ficará registrada no histórico.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="exitDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedStatus === BelongingStatus.DEVOLVIDO && (
              <FormField
                control={form.control}
                name="exitReceivedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recebido por</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome de quem recebeu o item" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da alteração de status (mínimo 10 caracteres)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
