import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChangePlan } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'
import { getPlans } from '@/api/superadmin.api'
import type { Tenant, Plan } from '@/api/superadmin.api'

interface ChangePlanDialogProps {
  tenant: Tenant
}

export function ChangePlanDialog({ tenant }: ChangePlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [reason, setReason] = useState('')
  const { toast } = useToast()
  const changePlanMutation = useChangePlan()

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })

  const activeSub = tenant.subscriptions.find((s) => s.status === 'active')
  const currentPlan = activeSub?.plan

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      toast({
        title: 'Plano não selecionado',
        description: 'Por favor, selecione um plano antes de continuar.',
        variant: 'destructive',
      })
      return
    }

    if (selectedPlanId === currentPlan?.id) {
      toast({
        title: 'Plano já ativo',
        description: `O tenant "${tenant.name}" já está usando o plano ${currentPlan.displayName}.`,
        variant: 'destructive',
      })
      return
    }

    try {
      await changePlanMutation.mutateAsync({
        tenantId: tenant.id,
        data: { newPlanId: selectedPlanId, reason: reason || undefined },
      })

      const newPlan = plans?.find((p) => p.id === selectedPlanId)
      toast({
        title: '✓ Plano alterado com sucesso',
        description: `"${tenant.name}" foi migrado para ${newPlan?.displayName}. A mudança entra em vigor imediatamente.`,
      })
      setOpen(false)
      setSelectedPlanId('')
      setReason('')
    } catch (error: any) {
      toast({
        title: 'Falha ao alterar plano',
        description:
          error.response?.data?.message || 'Ocorreu um erro ao processar a mudança de plano. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-purple-900 border-purple-700 text-purple-300 hover:bg-purple-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Mudar Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-purple-900 border-purple-700 text-purple-50">
        <DialogHeader>
          <DialogTitle className="text-purple-50">Mudar Plano</DialogTitle>
          <DialogDescription className="text-purple-300">
            Altere o plano de assinatura de {tenant.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plano Atual */}
          <div className="p-4 bg-purple-950 rounded-lg border border-purple-800">
            <div className="text-sm text-purple-400 mb-1">Plano Atual</div>
            <div className="font-semibold text-purple-50">
              {currentPlan?.displayName || 'Nenhum plano ativo'}
            </div>
            {currentPlan?.price && (
              <div className="text-sm text-purple-300">
                R$ {currentPlan.price.toLocaleString('pt-BR')} / mês
              </div>
            )}
          </div>

          {/* Novo Plano */}
          <div className="space-y-2">
            <Label htmlFor="plan" className="text-purple-200">
              Novo Plano *
            </Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="bg-purple-950 border-purple-700 text-purple-50">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent className="bg-purple-950 border-purple-700">
                {loadingPlans ? (
                  <div className="p-2 text-center text-purple-400">
                    Carregando planos...
                  </div>
                ) : (
                  plans?.map((plan) => (
                    <SelectItem
                      key={plan.id}
                      value={plan.id}
                      className="text-purple-300"
                    >
                      {plan.displayName}
                      {plan.price && ` - R$ ${plan.price.toLocaleString('pt-BR')}/mês`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Comparação */}
          {selectedPlan && currentPlan && (
            <div className="p-4 bg-purple-950 rounded-lg border border-purple-700">
              <div className="text-sm text-purple-400 mb-2">Mudança:</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-300">{currentPlan.displayName}</span>
                <span className="text-purple-500">→</span>
                <span className="text-green-400 font-medium">
                  {selectedPlan.displayName}
                </span>
              </div>
              <div className="text-xs text-purple-400 mt-1">
                Residentes: {currentPlan.maxResidents} → {selectedPlan.maxResidents} | Usuários: {currentPlan.maxUsers} → {selectedPlan.maxUsers}
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-purple-200">
              Motivo (opcional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Upgrade por crescimento do cliente..."
              className="bg-purple-950 border-purple-700 text-purple-50"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setSelectedPlanId('')
              setReason('')
            }}
            className="bg-purple-950 border-purple-700 text-purple-300 hover:bg-purple-800"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={changePlanMutation.isPending || !selectedPlanId}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {changePlanMutation.isPending ? 'Alterando...' : 'Confirmar Mudança'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
