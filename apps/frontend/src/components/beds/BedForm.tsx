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
import { useCreateBed, useUpdateBed, useBeds } from '@/hooks/useBeds'
import { useRooms } from '@/hooks/useRooms'
import { useToast } from '@/components/ui/use-toast'
import { useEffect, useState } from 'react'
import { generateBedCode } from '@/utils/codeGenerator'
import { Badge } from '@/components/ui/badge'

const bedSchema = z.object({
  roomId: z.string().min(1, 'Quarto é obrigatório'),
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
  const { data: allBeds } = useBeds()
  const [generatedCode, setGeneratedCode] = useState<string>('')

  const form = useForm<BedFormData>({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      roomId: defaultRoomId || '',
      status: 'DISPONIVEL',
      observations: '',
    },
  })


  // Gera código automaticamente quando o roomId muda
  useEffect(() => {
    const roomId = form.watch('roomId')

    if (roomId && !bed) {
      // Só gera novo código se estiver criando (não editando)
      // Filtra os códigos dos leitos do mesmo quarto
      const existingCodes = allBeds
        ?.filter(b => b.roomId === roomId)
        ?.map(b => b.code) || []

      // Gera código sequencial (A, B, C... ou 01, 02, 03...)
      const newCode = generateBedCode('', existingCodes)
      setGeneratedCode(newCode)
    } else if (!roomId && !bed) {
      // Limpa código se desselecionar o quarto
      setGeneratedCode('')
    }
  }, [form.watch('roomId'), allBeds, bed])

  // Popula form quando editar
  useEffect(() => {
    if (!open) return // Não faz nada se o modal estiver fechado

    if (bed) {
      form.reset({
        roomId: bed.roomId,
        status: bed.status,
        observations: bed.observations || '',
      })
      setGeneratedCode(bed.code) // Mantém o código existente ao editar
    } else {
      form.reset({
        roomId: defaultRoomId || '',
        status: 'DISPONIVEL',
        observations: '',
      })
      setGeneratedCode('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bed, defaultRoomId, open])

  const onSubmit = async (data: BedFormData) => {
    try {
      const submitData = {
        ...data,
        code: generatedCode, // Adiciona o código gerado
      }

      if (bed) {
        await updateMutation.mutateAsync({
          id: bed.id,
          data: {
            code: generatedCode,
            status: data.status,
            observations: data.observations,
          } as UpdateBedDto,
        })
        toast({
          title: 'Leito atualizado',
          description: 'O leito foi atualizado com sucesso.',
        })
      } else {
        await createMutation.mutateAsync(submitData as CreateBedDto)
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
                    value={field.value}
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
                        rooms?.map((room) => {
                          const building = room.floor?.building?.name || '?'
                          const floor = room.floor?.name || '?'
                          return (
                            <SelectItem key={room.id} value={room.id}>
                              {building} → {floor} → {room.name}
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Código gerado automaticamente */}
            {!bed && (
              <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Código do Leito:</span>
                  {generatedCode ? (
                    <Badge variant="outline" className="font-mono text-base">
                      {generatedCode}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Aguardando seleção do quarto
                    </span>
                  )}
                </div>
                {form.watch('roomId') && rooms && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    {(() => {
                      const selectedRoom = rooms.find(r => r.id === form.watch('roomId'))
                      if (!selectedRoom) return null
                      const building = selectedRoom.floor?.building?.name || '?'
                      const floor = selectedRoom.floor?.name || '?'
                      const room = selectedRoom.name || '?'
                      return (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Localização:</span>
                          <span>{building} → {floor} → {room}</span>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
            {bed && generatedCode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Código:</span>
                <Badge variant="outline">{generatedCode}</Badge>
              </div>
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
