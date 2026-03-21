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
import { formatBedIdentification } from '@/utils/formatters'

const bedSchema = z.object({
  roomId: z.string().min(1, 'Quarto é obrigatório'),
  status: z.enum(['Disponível', 'Ocupado', 'Manutenção', 'Reservado']).optional(),
  notes: z.string().optional(),
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
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(defaultRoomId)

  // Busca leitos do quarto selecionado em tempo real
  const { data: roomBeds } = useBeds(selectedRoomId)

  const form = useForm<BedFormData>({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      roomId: defaultRoomId || '',
      status: 'Disponível',
      notes: '',
    },
  })

  const selectedRoom = rooms?.find((room) => room.id === form.watch('roomId'))
  const fullBedIdentification =
    selectedRoom?.floor?.building?.code &&
    selectedRoom.floor.code &&
    selectedRoom.code &&
    generatedCode
      ? formatBedIdentification(
          selectedRoom.floor.building.code,
          selectedRoom.floor.code,
          selectedRoom.code,
          generatedCode,
        )
      : undefined


  // Gera código automaticamente quando o roomId muda
  useEffect(() => {
    const roomId = form.watch('roomId')
    setSelectedRoomId(roomId || undefined)

    if (roomId && !bed && roomBeds !== undefined) {
      // Só gera novo código se estiver criando (não editando)
      // Extrai apenas a última parte do código (após o último hífen)
      // Exemplo: "CT-003-A" -> "A", "BA-TR-01-B" -> "B"
      const existingCodes = roomBeds?.map(b => {
        const parts = b.code.split('-')
        return parts[parts.length - 1] // Última parte
      }) || []

      // Gera código sequencial (A, B, C... ou 01, 02, 03...)
      const newCode = generateBedCode('', existingCodes)
      setGeneratedCode(newCode)
    } else if (!roomId && !bed) {
      // Limpa código se desselecionar o quarto
      setGeneratedCode('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch('roomId'), roomBeds, bed])

  // Popula form quando editar
  useEffect(() => {
    if (!open) return // Não faz nada se o modal estiver fechado

    if (bed) {
      form.reset({
        roomId: bed.roomId,
        status: bed.status,
        notes: bed.notes || '',
      })
      setGeneratedCode(bed.code) // Mantém o código existente ao editar
    } else {
      form.reset({
        roomId: defaultRoomId || '',
        status: 'Disponível',
        notes: '',
      })
      setGeneratedCode('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bed, defaultRoomId, open])

  const onSubmit = async (data: BedFormData) => {
    try {
      const submitData = {
        roomId: data.roomId,
        bedSuffix: generatedCode,
        status: data.status,
        notes: data.notes,
      }

      if (bed) {
        await updateMutation.mutateAsync({
          id: bed.id,
          data: {
            status: data.status,
            notes: data.notes,
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
                  <span className="text-sm font-medium text-muted-foreground">Sufixo do Leito:</span>
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
                    {selectedRoom && (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Localização:</span>
                          <span>
                            {selectedRoom.floor?.building?.name || '?'} → {selectedRoom.floor?.name || '?'} →{' '}
                            {selectedRoom.name || '?'}
                          </span>
                        </div>
                        {fullBedIdentification && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-medium">Identificação final:</span>
                            <span className="font-mono">{fullBedIdentification}</span>
                          </div>
                        )}
                      </>
                    )}
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
                      <SelectItem value="Disponível">Disponível</SelectItem>
                      <SelectItem value="Ocupado">Ocupado</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Reservado">Reservado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
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
