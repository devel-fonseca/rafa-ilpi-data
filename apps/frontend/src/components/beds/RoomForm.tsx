import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Room, CreateRoomDto, UpdateRoomDto } from '@/api/beds.api'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateRoom, useUpdateRoom, useRooms } from '@/hooks/useRooms'
import { useFloors } from '@/hooks/useFloors'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'
import { generateRoomCode } from '@/utils/codeGenerator'

const roomSchema = z.object({
  floorId: z.string().min(1, 'Andar é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().min(1, 'Código é obrigatório'),
  roomNumber: z.string().min(1, 'Número do quarto é obrigatório'),
  roomType: z.enum(['INDIVIDUAL', 'DUPLO', 'TRIPLO', 'COLETIVO']),
  capacity: z.number().min(1, 'Capacidade deve ser no mínimo 1'),
  hasPrivateBathroom: z.boolean().optional(),
  accessible: z.boolean().optional(),
  observations: z.string().optional(),
})

type RoomFormData = z.infer<typeof roomSchema>

interface RoomFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room?: Room
  defaultFloorId?: string
  onSuccess?: () => void
}

export function RoomForm({
  open,
  onOpenChange,
  room,
  defaultFloorId,
  onSuccess,
}: RoomFormProps) {
  const { toast } = useToast()
  const createMutation = useCreateRoom()
  const updateMutation = useUpdateRoom()
  const { data: floors, isLoading: isLoadingFloors } = useFloors()
  const { data: allRooms } = useRooms()

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      floorId: defaultFloorId || '',
      name: '',
      code: '',
      roomNumber: '',
      roomType: 'INDIVIDUAL',
      capacity: 1,
      hasPrivateBathroom: false,
      accessible: false,
      observations: '',
    },
  })

  // Gera código automaticamente quando o nome ou número mudam (apenas se code estiver vazio)
  useEffect(() => {
    const name = form.watch('name')
    const roomNumber = form.watch('roomNumber')
    const code = form.watch('code')

    if ((name || roomNumber) && !room && !code) {
      // Só gera novo código se estiver criando (não editando) e se code estiver vazio
      const floorId = form.watch('floorId')
      // Filtra os códigos dos quartos do mesmo andar
      const existingCodes = allRooms
        ?.filter(r => r.floorId === floorId)
        ?.map(r => r.code) || []

      const roomNumberInt = roomNumber ? parseInt(roomNumber) : undefined
      const newCode = generateRoomCode(name || roomNumber, existingCodes, roomNumberInt)
      form.setValue('code', newCode)
    }
  }, [form.watch('name'), form.watch('roomNumber'), form.watch('floorId'), allRooms, room, form])

  // Popula form quando editar
  useEffect(() => {
    if (room) {
      form.reset({
        floorId: room.floorId,
        name: room.name,
        code: room.code,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        capacity: room.capacity,
        hasPrivateBathroom: room.hasPrivateBathroom || false,
        accessible: room.accessible || false,
        observations: room.observations || '',
      })
    } else {
      form.reset({
        floorId: defaultFloorId || '',
        name: '',
        code: '',
        roomNumber: '',
        roomType: 'INDIVIDUAL',
        capacity: 1,
        hasPrivateBathroom: false,
        accessible: false,
        observations: '',
      })
    }
  }, [room, defaultFloorId, form])

  const onSubmit = async (data: RoomFormData) => {
    try {
      if (room) {
        await updateMutation.mutateAsync({
          id: room.id,
          data: data as UpdateRoomDto,
        })
        toast({
          title: 'Quarto atualizado',
          description: 'O quarto foi atualizado com sucesso.',
        })
      } else {
        await createMutation.mutateAsync(data as CreateRoomDto)
        toast({
          title: 'Quarto criado',
          description: 'O quarto foi criado com sucesso.',
        })
      }
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o quarto.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{room ? 'Editar Quarto' : 'Novo Quarto'}</DialogTitle>
          <DialogDescription>
            {room
              ? 'Atualize as informações do quarto.'
              : 'Preencha os dados para criar um novo quarto.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="floorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Andar *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!room}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o andar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingFloors ? (
                        <SelectItem value="loading" disabled>
                          Carregando...
                        </SelectItem>
                      ) : (
                        floors?.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.building?.name} - {floor.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Quarto 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código do Quarto *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 001, 002, 101, 823"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Código numérico do quarto (geralmente 3 dígitos).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ex: 2"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roomType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Quarto *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                      <SelectItem value="DUPLO">Duplo</SelectItem>
                      <SelectItem value="TRIPLO">Triplo</SelectItem>
                      <SelectItem value="COLETIVO">Coletivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="hasPrivateBathroom"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Banheiro Privativo</FormLabel>
                      <FormDescription>
                        Este quarto possui banheiro privativo
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Acessível</FormLabel>
                      <FormDescription>
                        Quarto adaptado para pessoas com deficiência ou mobilidade reduzida
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o quarto"
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
                  : room
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
