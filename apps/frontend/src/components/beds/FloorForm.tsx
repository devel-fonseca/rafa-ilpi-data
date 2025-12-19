import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Floor, CreateFloorDto, UpdateFloorDto } from '@/api/beds.api'
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
import { useCreateFloor, useUpdateFloor } from '@/hooks/useFloors'
import { useBuildings } from '@/hooks/useBuildings'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'
import { generateFloorCode } from '@/utils/codeGenerator'
const floorSchema = z.object({
  buildingId: z.string().min(1, 'Prédio é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().min(1, 'Código é obrigatório'),
  floorNumber: z.number().min(0, 'Número do andar deve ser positivo'),
  description: z.string().optional(),
})

type FloorFormData = z.infer<typeof floorSchema>

interface FloorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floor?: Floor
  defaultBuildingId?: string
  onSuccess?: () => void
}

export function FloorForm({
  open,
  onOpenChange,
  floor,
  defaultBuildingId,
  onSuccess,
}: FloorFormProps) {
  const { toast } = useToast()
  const createMutation = useCreateFloor()
  const updateMutation = useUpdateFloor()
  const { data: buildings, isLoading: isLoadingBuildings } = useBuildings()

  const form = useForm<FloorFormData>({
    resolver: zodResolver(floorSchema),
    defaultValues: {
      buildingId: defaultBuildingId || '',
      name: '',
      code: '',
      floorNumber: 0,
      description: '',
    },
  })

  // Gera código automaticamente quando o nome ou número mudam (apenas se code estiver vazio)
  useEffect(() => {
    const name = form.watch('name')
    const floorNumber = form.watch('floorNumber')
    const code = form.watch('code')

    if ((name || floorNumber !== undefined) && !floor && !code) {
      // Só gera novo código se estiver criando (não editando) e se code estiver vazio
      const newCode = generateFloorCode(name, floorNumber)
      form.setValue('code', newCode)
    }
  }, [form.watch('name'), form.watch('floorNumber'), floor, form])

  // Popula form quando editar
  useEffect(() => {
    if (floor) {
      form.reset({
        buildingId: floor.buildingId,
        name: floor.name,
        code: floor.code,
        floorNumber: floor.floorNumber,
        description: floor.description || '',
      })
    } else {
      form.reset({
        buildingId: defaultBuildingId || '',
        name: '',
        code: '',
        floorNumber: 0,
        description: '',
      })
    }
  }, [floor, defaultBuildingId, form])

  const onSubmit = async (data: FloorFormData) => {
    try {
      if (floor) {
        await updateMutation.mutateAsync({
          id: floor.id,
          data: data as UpdateFloorDto,
        })
        toast({
          title: 'Andar atualizado',
          description: 'O andar foi atualizado com sucesso.',
        })
      } else {
        await createMutation.mutateAsync(data as CreateFloorDto)
        toast({
          title: 'Andar criado',
          description: 'O andar foi criado com sucesso.',
        })
      }
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o andar.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{floor ? 'Editar Andar' : 'Novo Andar'}</DialogTitle>
          <DialogDescription>
            {floor
              ? 'Atualize as informações do andar.'
              : 'Preencha os dados para criar um novo andar.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="buildingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prédio *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!floor}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o prédio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingBuildings ? (
                        <SelectItem value="loading" disabled>
                          Carregando...
                        </SelectItem>
                      ) : (
                        buildings?.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Térreo, 1º Andar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código do Andar *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: T, 1, 2, 6"
                      className="font-mono uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Código do andar (T=Térreo, ou número do andar).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="floorNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Andar *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 0 para Térreo, 1 para 1º Andar"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o andar"
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
                  : floor
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
