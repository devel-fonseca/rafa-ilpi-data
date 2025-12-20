import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateTenant } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'
import type { Tenant, UpdateTenantData } from '@/api/superadmin.api'

interface EditTenantDialogProps {
  tenant: Tenant
}

export function EditTenantDialog({ tenant }: EditTenantDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const updateMutation = useUpdateTenant()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateTenantData>({
    defaultValues: {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      addressStreet: tenant.addressStreet || '',
      addressCity: tenant.addressCity || '',
      addressState: tenant.addressState || '',
    },
  })

  const onSubmit = async (data: UpdateTenantData) => {
    try {
      await updateMutation.mutateAsync({ id: tenant.id, data })
      toast({
        title: '✓ Dados atualizados',
        description: `As informações de "${tenant.name}" foram salvas com sucesso.`,
      })
      setOpen(false)
      reset()
    } catch (error: any) {
      toast({
        title: 'Falha ao atualizar dados',
        description:
          error.response?.data?.message || 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-purple-900 border-purple-700 text-purple-300 hover:bg-purple-800"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-purple-900 border-purple-700 text-purple-50 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-purple-50">Editar Tenant</DialogTitle>
          <DialogDescription className="text-purple-300">
            Atualize as informações básicas do tenant {tenant.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-purple-200">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-purple-200">
                  Nome *
                </Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Nome é obrigatório' })}
                  className="bg-purple-950 border-purple-700 text-purple-50"
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-purple-200">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  })}
                  className="bg-purple-950 border-purple-700 text-purple-50"
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-purple-200">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="(00) 00000-0000"
                  className="bg-purple-950 border-purple-700 text-purple-50"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-purple-200">Endereço</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="addressStreet" className="text-purple-200">
                  Logradouro
                </Label>
                <Input
                  id="addressStreet"
                  {...register('addressStreet')}
                  placeholder="Rua, Avenida..."
                  className="bg-purple-950 border-purple-700 text-purple-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressCity" className="text-purple-200">
                  Cidade
                </Label>
                <Input
                  id="addressCity"
                  {...register('addressCity')}
                  className="bg-purple-950 border-purple-700 text-purple-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressState" className="text-purple-200">
                  Estado
                </Label>
                <Input
                  id="addressState"
                  {...register('addressState')}
                  placeholder="UF"
                  maxLength={2}
                  className="bg-purple-950 border-purple-700 text-purple-50 uppercase"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                reset()
              }}
              className="bg-purple-950 border-purple-700 text-purple-300 hover:bg-purple-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
