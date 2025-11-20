import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Bed, CreateBedDto, UpdateBedDto } from '@/api/beds.api'
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
import { useCreateBed, useUpdateBed } from '@/hooks/useBeds'
import { useRooms } from '@/hooks/useRooms'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'

const bedSchema = z.object({
  roomId: z.string().min(1, 'Quarto é obrigatório'),
  code: z.string().min(1, 'Código é obrigatório'),
  bedNumber: z.string().min(1, 'Número do leito é obrigatório'),
  status: z.enum(['DISPONIVEL', 'OCUPADO', 'MANUTENCAO', 'RESERVADO']).optional(),
  observations: z.string().optional(),
})

type BedFormData = z.infer<typeof bedSchema>

interface BedFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bed?: Bed
  defaultRoomId?: string
  onSuccess?: () => void
}

export function BedForm({ open, onOpenChange, bed, defaultRoomId, onSuccess }: BedFormProps) {
  const { toast } = useToast()
  const createMutation = useCreateBed()
  const updateMutation = useUpdateBed()
  const { data: rooms, isLoading: isLoadingRooms } = useRooms()

  const form = useForm<BedFormData>({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      roomId: defaultRoomId || '',
      code: '',
      bedNumber: '',
      status: 'DISPONIVEL',
      observations: '',
    },
  })

  // Popula form quando editar
  useEffect(() => {
    if (bed) {
      form.reset({
        roomId: bed.roomId,
        code: bed.code,
        bedNumber: bed.bedNumber,
        status: bed.status,
        observations: bed.observations || '',
      })
    } else {
      form.reset({
        roomId: defaultRoomId || '',
        code: '',
        bedNumber: '',
        status: 'DISPONIVEL',
        observations: '',
      })
    }
  }, [bed, defaultRoomId, form])

  const onSubmit = async (data: BedFormData) => {
    try {
      if (bed) {
        await updateMutation.mutateAsync({
          id: bed.id,
          data: {
            code: data.code,
            bedNumber: data.bedNumber,
            status: data.status,
            observations: data.observations,
          } as UpdateBedDto,
        })
        toast({
          title: 'Leito atualizado',
          description: 'O leito foi atualizado com sucesso.',
        })
      } else {
        await createMutation.mutateAsync(data as CreateBedDto)
        toast({
          title: 'Leito criado',
          description: 'O leito foi criado com sucesso.',
        })
      }
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o leito.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{bed ? 'Editar Leito' : 'Novo Leito'}</DialogTitle>
          <DialogDescription>
            {bed
              ? 'Atualize as informações do leito.'
              : 'Preencha os dados para criar um novo leito.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quarto *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!bed}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o quarto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingRooms ? (
                        <SelectItem value="loading" disabled>
                          Carregando...
                        </SelectItem>
                      ) : (
                        rooms?.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} ({room.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: L-101-A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bedNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Leito *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: A, B, 1, 2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                      <SelectItem value="OCUPADO">Ocupado</SelectItem>
                      <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                      <SelectItem value="RESERVADO">Reservado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o leito"
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
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : bed
                  ? 'Atualizar'
                  : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
