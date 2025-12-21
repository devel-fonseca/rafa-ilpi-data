import { useState } from 'react'
import { Ban } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useSuspendTenant } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'

interface SuspendTenantDialogProps {
  tenantId: string
  tenantName: string
  variant?: 'button' | 'menuItem'
}

export function SuspendTenantDialog({
  tenantId,
  tenantName,
  variant = 'button',
}: SuspendTenantDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { toast } = useToast()
  const suspendMutation = useSuspendTenant()

  const handleSubmit = async () => {
    if (!reason || reason.length < 10) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe um motivo detalhado com pelo menos 10 caracteres para justificar a suspensão.',
        variant: 'destructive',
      })
      return
    }

    try {
      await suspendMutation.mutateAsync({ id: tenantId, data: { reason } })
      toast({
        title: '✓ Tenant suspenso',
        description: `"${tenantName}" foi suspenso. Todos os usuários perderam acesso imediato à plataforma.`,
      })
      setOpen(false)
      setReason('')
    } catch (error: any) {
      toast({
        title: 'Falha ao suspender tenant',
        description:
          error.response?.data?.message || 'Ocorreu um erro ao suspender o tenant. Tente novamente ou contate o suporte.',
        variant: 'destructive',
      })
    }
  }

  const TriggerComponent =
    variant === 'button' ? (
      <Button
        variant="destructive"
        disabled={suspendMutation.isPending}
      >
        <Ban className="h-4 w-4 mr-2" />
        Suspender
      </Button>
    ) : (
      <div className="flex items-center cursor-pointer text-slate-400 hover:text-slate-900 w-full px-2 py-1.5">
        <Ban className="h-4 w-4 mr-2" />
        Suspender
      </div>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{TriggerComponent}</DialogTrigger>
      <DialogContent className="bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Suspender Tenant</DialogTitle>
          <DialogDescription className="text-slate-400">
            Suspender o acesso de <strong>{tenantName}</strong> à plataforma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="p-4 bg-red-950 rounded-lg border border-red-800">
            <p className="text-sm text-red-300">
              ⚠️ Esta ação irá bloquear imediatamente o acesso de todos os
              usuários deste tenant.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-600">
              Motivo da suspensão *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Inadimplência de 3 faturas consecutivas..."
              className="bg-white border-slate-200 text-slate-900"
              rows={4}
              minLength={10}
            />
            <p className="text-xs text-slate-500">
              Mínimo 10 caracteres ({reason.length}/10)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setReason('')
            }}
            className="bg-white border-slate-200 text-slate-400 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={suspendMutation.isPending || reason.length < 10}
            variant="destructive"
          >
            {suspendMutation.isPending ? 'Suspendendo...' : 'Confirmar Suspensão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
