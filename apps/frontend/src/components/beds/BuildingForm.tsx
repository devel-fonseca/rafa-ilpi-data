import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Building, CreateBuildingDto, UpdateBuildingDto } from '@/api/beds.api'
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
import { useCreateBuilding, useUpdateBuilding } from '@/hooks/useBuildings'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react'

const buildingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().min(1, 'Código é obrigatório'),
  description: z.string().optional(),
})

type BuildingFormData = z.infer<typeof buildingSchema>

interface BuildingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  building?: Building
  onSuccess?: () => void
}

export function BuildingForm({ open, onOpenChange, building, onSuccess }: BuildingFormProps) {
  const { toast } = useToast()
  const createMutation = useCreateBuilding()
  const updateMutation = useUpdateBuilding()

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  })

  // Popula form quando editar
  useEffect(() => {
    if (building) {
      form.reset({
        name: building.name,
        code: building.code,
        description: building.description || '',
      })
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
      })
    }
  }, [building, form])

  const onSubmit = async (data: BuildingFormData) => {
    try {
      if (building) {
        await updateMutation.mutateAsync({
          id: building.id,
          data: data as UpdateBuildingDto,
        })
        toast({
          title: 'Prédio atualizado',
          description: 'O prédio foi atualizado com sucesso.',
        })
      } else {
        await createMutation.mutateAsync(data as CreateBuildingDto)
        toast({
          title: 'Prédio criado',
          description: 'O prédio foi criado com sucesso.',
        })
      }
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o prédio.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{building ? 'Editar Prédio' : 'Novo Prédio'}</DialogTitle>
          <DialogDescription>
            {building
              ? 'Atualize as informações do prédio.'
              : 'Preencha os dados para criar um novo prédio.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Bloco A" {...field} />
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
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: BL-A" {...field} />
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
                      placeholder="Informações adicionais sobre o prédio"
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
                  : building
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
