import { useMySubscription } from '@/hooks/useTenant'
import { useUpdatePaymentMethod } from '@/hooks/useBilling'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const PAYMENT_METHODS = {
  CREDIT_CARD: {
    label: 'Cartão de Crédito',
    description: 'Pagamento parcelado no cartão',
  },
  BOLETO: {
    label: 'Boleto Bancário',
    description: 'Boleto com vencimento em até 3 dias úteis',
  },
}

interface SubscriptionWithPaymentMethod {
  preferredPaymentMethod?: string
}

export function PaymentMethodSelector() {
  const { data: subscriptionData, isLoading } = useMySubscription()
  const updatePaymentMethod = useUpdatePaymentMethod()

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

  const subscriptionTyped = subscriptionData.subscription as unknown as SubscriptionWithPaymentMethod
  const currentMethod = subscriptionTyped.preferredPaymentMethod || 'CREDIT_CARD'

  const handleChange = async (value: string) => {
    try {
      await updatePaymentMethod.mutateAsync(value as 'BOLETO' | 'CREDIT_CARD')

      toast.success('Método de pagamento atualizado', {
        description: `Suas próximas faturas serão geradas com ${PAYMENT_METHODS[value as keyof typeof PAYMENT_METHODS].label}`,
      })
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao atualizar método de pagamento', {
        description: errorResponse?.data?.message || 'Não foi possível atualizar. Tente novamente.',
      })
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="payment-method" className="text-foreground">
        Selecione o método de pagamento preferido para suas faturas:
      </Label>
      <Select value={currentMethod} onValueChange={handleChange} disabled={updatePaymentMethod.isPending}>
        <SelectTrigger id="payment-method" className="bg-background border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {Object.entries(PAYMENT_METHODS).map(([key, { label, description }]) => (
            <SelectItem key={key} value={key} className="text-foreground hover:bg-accent">
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Este será o método padrão para geração de novas faturas. Você poderá alterar a qualquer momento.
      </p>
    </div>
  )
}
