import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useDeleteTenant } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

interface DeleteTenantDialogProps {
  tenantId: string
  tenantName: string
  variant?: 'button' | 'menuItem'
}

export function DeleteTenantDialog({
  tenantId,
  tenantName,
  variant = 'button',
}: DeleteTenantDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()
  const deleteMutation = useDeleteTenant()

  const handleSubmit = async () => {
    if (confirmation !== tenantName) {
      toast({
        title: 'Confirmação incorreta',
        description: `Digite exatamente "${tenantName}" para confirmar a exclusão permanente.`,
        variant: 'destructive',
      })
      return
    }

    try {
      await deleteMutation.mutateAsync(tenantId)
      toast({
        title: '✓ Tenant deletado permanentemente',
        description: `"${tenantName}" e todos os seus dados foram removidos do sistema.`,
      })
      setOpen(false)
      setConfirmation('')
      // Redirecionar para lista de tenants após delete
      navigate('/superadmin/tenants')
    } catch (error: any) {
      toast({
        title: 'Falha ao deletar tenant',
        description:
          error.response?.data?.message || 'Ocorreu um erro ao deletar o tenant. Esta operação pode falhar se houver dependências ativas.',
        variant: 'destructive',
      })
    }
  }

  const isConfirmed = confirmation === tenantName

  const TriggerComponent =
    variant === 'button' ? (
      <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
        <Trash2 className="h-4 w-4 mr-2" />
        Deletar
      </Button>
    ) : (
      <div className="flex items-center cursor-pointer text-red-400 hover:text-red-300 w-full px-2 py-1.5">
        <Trash2 className="h-4 w-4 mr-2" />
        Deletar
      </div>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerComponent}</DialogTrigger>
      <DialogContent className="bg-purple-900 border-purple-700 text-purple-50">
        <DialogHeader>
          <DialogTitle className="text-purple-50">Deletar Tenant</DialogTitle>
          <DialogDescription className="text-purple-300">
            Esta ação é <strong>irreversível</strong>. Todos os dados serão
            permanentemente removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Critical Warning */}
          <div className="p-4 bg-red-950 rounded-lg border border-red-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-300 mb-2">
                  Atenção! Ação Destrutiva
                </h4>
                <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
                  <li>Todos os usuários perderão acesso imediato</li>
                  <li>Dados de residentes serão removidos</li>
                  <li>Histórico de subscriptions será deletado</li>
                  <li>Esta ação NÃO pode ser desfeita</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-purple-200">
              Digite <strong className="text-purple-50">{tenantName}</strong>{' '}
              para confirmar:
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={tenantName}
              className="bg-purple-950 border-purple-700 text-purple-50"
              autoComplete="off"
            />
            {confirmation && !isConfirmed && (
              <p className="text-xs text-red-400">
                O nome não corresponde. Digite exatamente: {tenantName}
              </p>
            )}
            {isConfirmed && (
              <p className="text-xs text-green-400">✓ Confirmação correta</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setConfirmation('')
            }}
            className="bg-purple-950 border-purple-700 text-purple-300 hover:bg-purple-800"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={deleteMutation.isPending || !isConfirmed}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Deletando...' : 'Deletar Permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
