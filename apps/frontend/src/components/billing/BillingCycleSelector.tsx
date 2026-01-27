import { useMySubscription } from '@/hooks/useTenant'
import { useUpdateBillingCycle } from '@/hooks/useBilling'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface SubscriptionWithBillingCycle {
  billingCycle?: string
  status?: string
}

/**
 * BillingCycleSelector
 *
 * Permite ao admin do tenant alternar entre cobrança MONTHLY e ANNUAL.
 * Quando muda para ANNUAL, habilita PIX como opção de pagamento.
 */
export function BillingCycleSelector() {
  const { data: subscriptionData, isLoading } = useMySubscription()
  const updateBillingCycle = useUpdateBillingCycle()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!subscriptionData) {
    return null
  }

  const subscriptionTyped = subscriptionData.subscription as unknown as SubscriptionWithBillingCycle
  const currentCycle = subscriptionTyped.billingCycle || 'MONTHLY'
  const isTrialing = subscriptionTyped.status === 'trialing'

  const handleChange = async (value: string) => {
    // Não permitir mudança durante trial
    if (isTrialing) {
      toast.error('Não é possível alterar o ciclo durante o período de testes', {
        description: 'Aguarde a conversão para plano ativo.',
      })
      return
    }

    try {
      await updateBillingCycle.mutateAsync(value as 'MONTHLY' | 'ANNUAL')

      const cycleName = value === 'MONTHLY' ? 'mensal' : 'anual'
      toast.success(`Ciclo de cobrança atualizado para ${cycleName}`, {
        description: value === 'ANNUAL'
          ? '💡 PIX agora disponível como método de pagamento!'
          : 'PIX não está disponível para cobrança mensal.',
      })
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao atualizar ciclo de cobrança', {
        description: errorResponse?.data?.message || 'Não foi possível atualizar. Tente novamente.',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold text-foreground">Ciclo de Cobrança</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha a frequência de pagamento das suas faturas
        </p>
      </div>

      <RadioGroup
        value={currentCycle}
        onValueChange={handleChange}
        disabled={updateBillingCycle.isPending || isTrialing}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Opção Mensal */}
        <div className="relative">
          <RadioGroupItem
            value="MONTHLY"
            id="monthly"
            className="peer sr-only"
          />
          <Label
            htmlFor="monthly"
            className="flex flex-col items-start justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#059669] [&:has([data-state=checked])]:border-[#059669] cursor-pointer"
          >
            <div className="space-y-1">
              <div className="font-medium text-foreground">Mensal</div>
              <div className="text-sm text-muted-foreground">
                Pagamento a cada mês
              </div>
            </div>
          </Label>
        </div>

        {/* Opção Anual */}
        <div className="relative">
          <RadioGroupItem
            value="ANNUAL"
            id="annual"
            className="peer sr-only"
          />
          <Label
            htmlFor="annual"
            className="flex flex-col items-start justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#059669] [&:has([data-state=checked])]:border-[#059669] cursor-pointer"
          >
            <div className="space-y-1">
              <div className="font-medium text-foreground flex items-center gap-2">
                Anual
                <span className="inline-flex items-center rounded-full bg-[#059669] px-2 py-0.5 text-xs font-medium text-white">
                  PIX disponível
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Pagamento único anual
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {isTrialing && (
        <p className="text-xs text-amber-600">
          ⚠️ O ciclo de cobrança não pode ser alterado durante o período de testes.
        </p>
      )}
    </div>
  )
}
