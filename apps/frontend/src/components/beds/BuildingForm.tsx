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
import { useCreateBuilding, useUpdateBuilding, useBuildings } from '@/hooks/useBuildings'
import { useToast } from '@/components/ui/use-toast'
import { useEffect, useState } from 'react'
import { generateBuildingCode } from '@/utils/codeGenerator'
import { ContinueCreationDialog } from './ContinueCreationDialog'
import { FloorForm } from './FloorForm'

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
  const { data: buildings } = useBuildings()
  const [showContinueDialog, setShowContinueDialog] = useState(false)
  const [showFloorForm, setShowFloorForm] = useState(false)
  const [newBuildingId, setNewBuildingId] = useState<string>('')

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  })

  // Gera código automaticamente quando o nome muda (apenas se code estiver vazio)
  useEffect(() => {
    const name = form.watch('name')
    const code = form.watch('code')

    if (name && !building && !code) {
      // Só gera novo código se estiver criando (não editando) e se code estiver vazio
      const existingCodes = buildings?.map(b => b.code) || []
      const newCode = generateBuildingCode(name, existingCodes)
      form.setValue('code', newCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch('name'), buildings, building, form])

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
        const result = await createMutation.mutateAsync(data as CreateBuildingDto)
        toast({
          title: 'Prédio criado',
          description: 'O prédio foi criado com sucesso.',
        })

        // Salva o ID do novo prédio e mostra o diálogo
        setNewBuildingId(result.id)
        setShowContinueDialog(true)
      }

      // Só fecha e reseta se estiver editando
      if (building) {
        onOpenChange(false)
        form.reset()
        onSuccess?.()
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o prédio.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
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
                      <Input placeholder="Ex: Casa Principal, Bloco A, Ala Norte" {...field} />
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
                    <FormLabel>Código do Prédio *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: CLI, PP, ANEXO"
                        className="font-mono uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Código alfanumérico curto (2-6 caracteres). Será usado na identificação dos leitos.
                    </p>
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

      {/* Diálogo para perguntar se deseja adicionar andar */}
      <ContinueCreationDialog
        open={showContinueDialog}
        onOpenChange={setShowContinueDialog}
        title="Adicionar Andar?"
        description="Deseja adicionar um andar ao prédio que você acabou de criar?"
        onContinue={() => {
          setShowFloorForm(true)
          onOpenChange(false)
          form.reset()
          onSuccess?.()
        }}
        onCancel={() => {
          onOpenChange(false)
          form.reset()
          onSuccess?.()
        }}
      />

      {/* Formulário de andar com o prédio pré-selecionado */}
      {showFloorForm && (
        <FloorForm
          open={showFloorForm}
          onOpenChange={setShowFloorForm}
          defaultBuildingId={newBuildingId}
          onSuccess={() => setShowFloorForm(false)}
        />
      )}
    </>
  )
}
