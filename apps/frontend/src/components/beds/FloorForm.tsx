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
import { useEffect, useState } from 'react'
import { generateFloorCode } from '@/utils/codeGenerator'
import { Badge } from '@/components/ui/badge'
const floorSchema = z.object({
  buildingId: z.string().min(1, 'Prédio é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
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
  const [generatedCode, setGeneratedCode] = useState<string>('')

  const form = useForm<FloorFormData>({
    resolver: zodResolver(floorSchema),
    defaultValues: {
      buildingId: defaultBuildingId || '',
      name: '',
      floorNumber: 0,
      description: '',
    },
  })

  // Gera código automaticamente quando o nome ou número mudam
  useEffect(() => {
    const name = form.watch('name')
    const floorNumber = form.watch('floorNumber')

    if ((name || floorNumber !== undefined) && !floor) {
      // Só gera novo código se estiver criando (não editando)
      const newCode = generateFloorCode(name, floorNumber)
      setGeneratedCode(newCode)
    }
  }, [form.watch('name'), form.watch('floorNumber'), floor])

  // Popula form quando editar
  useEffect(() => {
    if (floor) {
      form.reset({
        buildingId: floor.buildingId,
        name: floor.name,
        floorNumber: floor.floorNumber,
        description: floor.description || '',
      })
      setGeneratedCode(floor.code) // Mantém o código existente ao editar
    } else {
      form.reset({
        buildingId: defaultBuildingId || '',
        name: '',
        floorNumber: 0,
        description: '',
      })
      setGeneratedCode('')
    }
  }, [floor, defaultBuildingId, form])

  const onSubmit = async (data: FloorFormData) => {
    try {
      const submitData = {
        ...data,
        code: generatedCode, // Adiciona o código gerado
      }

      if (floor) {
        await updateMutation.mutateAsync({
          id: floor.id,
          data: {
            name: data.name,
            code: generatedCode,
            floorNumber: data.floorNumber,
            description: data.description,
          } as UpdateFloorDto,
        })
        toast({
          title: 'Andar atualizado',
          description: 'O andar foi atualizado com sucesso.',
        })
      } else {
        await createMutation.mutateAsync(submitData as CreateFloorDto)
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

            {/* Código gerado automaticamente */}
            {generatedCode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Código:</span>
                <Badge variant="outline">{generatedCode}</Badge>
              </div>
            )}

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
