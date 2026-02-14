import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { useTenants } from '@/hooks/useSuperAdmin'
import { useToast } from '@/components/ui/use-toast'

interface Subscription {
  id: string
  status: string
  [key: string]: unknown
}

interface Tenant {
  id: string
  name: string
  email: string
  subscriptions: Subscription[]
  [key: string]: unknown
}

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
}: CreateInvoiceDialogProps) {
  const { toast } = useToast()
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{
    tenant?: string
    amount?: string
    subscription?: string
  }>({})

  const { data: tenantsData } = useTenants({ limit: 100 })
  const createMutation = useCreateInvoice()

  // Buscar subscriptions do tenant selecionado
  const selectedTenant = tenantsData?.data?.find((t: Tenant) => t.id === selectedTenantId)
  const activeSubscription = selectedTenant?.subscriptions?.find(
    (s: Subscription) => s.status === 'active'
  )

  // Auto-preencher quando selecionar tenant
  useEffect(() => {
    if (activeSubscription) {
      setSelectedSubscriptionId(activeSubscription.id)
      setAmount(activeSubscription.plan.price?.toString() || '0')
      setDescription(
        `Mensalidade ${activeSubscription.plan.displayName} - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
      )
    }
  }, [activeSubscription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { tenant?: string; amount?: string; subscription?: string } = {}

    if (!selectedTenantId) newErrors.tenant = 'Selecione um tenant.'
    if (!selectedSubscriptionId) {
      newErrors.subscription = 'Tenant selecionado não possui assinatura ativa.'
    }
    if (!amount || Number(amount) <= 0) {
      newErrors.amount = 'Informe um valor maior que zero.'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      return
    }

    try {
      await createMutation.mutateAsync({
        tenantId: selectedTenantId,
        subscriptionId: selectedSubscriptionId,
        amount: parseFloat(amount),
        description: description || undefined,
      })

      toast({
        title: '✓ Fatura criada',
        description: 'A fatura foi criada com sucesso no Asaas.',
      })

      // Reset form
      setSelectedTenantId('')
      setSelectedSubscriptionId('')
      setAmount('')
      setDescription('')
      setErrors({})
      onOpenChange(false)
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast({
        title: 'Falha ao criar fatura',
        description:
          errorResponse?.data?.message ||
          'Ocorreu um erro ao criar a fatura. Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const canSubmit =
    !!selectedTenantId &&
    !!selectedSubscriptionId &&
    !!amount &&
    Number(amount) > 0 &&
    !createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            Gerar Fatura Manual
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Crie uma fatura manualmente para um tenant com subscription ativa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label htmlFor="tenant" className="text-slate-600">
                Tenant *
              </Label>
              <Select
                value={selectedTenantId}
                onValueChange={(value) => {
                  setSelectedTenantId(value)
                  setErrors((prev) => ({ ...prev, tenant: undefined, subscription: undefined }))
                }}
              >
                <SelectTrigger
                  id="tenant"
                  className="bg-white border-slate-200 text-slate-900"
                >
                  <SelectValue placeholder="Selecione um tenant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {tenantsData?.data
                    ?.filter((tenant: Tenant) =>
                      tenant.subscriptions.some((s: Subscription) => s.status === 'active')
                    )
                    .map((tenant: Tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.tenant && <p className="text-sm text-danger">{errors.tenant}</p>}
            </div>

            {/* Subscription Info (read-only) */}
            {activeSubscription && (
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Plano:</span>
                    <span className="ml-2 text-slate-900">
                      {activeSubscription.plan.displayName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ciclo:</span>
                    <span className="ml-2 text-slate-900">
                      {activeSubscription.plan.billingCycle === 'MONTHLY'
                        ? 'Mensal'
                        : 'Anual'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>
                    <span className="ml-2 text-slate-900">
                      {activeSubscription.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Preço do plano:</span>
                    <span className="ml-2 text-slate-900">
                      R${' '}
                      {Number(activeSubscription.plan.price).toLocaleString(
                        'pt-BR',
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {!activeSubscription && selectedTenantId && (
              <p className="text-sm text-danger">{errors.subscription || 'Nenhuma assinatura ativa encontrada para este tenant.'}</p>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-600">
                Valor (R$) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setErrors((prev) => ({ ...prev, amount: undefined }))
                }}
                placeholder="299.90"
                className="bg-white border-slate-200 text-slate-900"
              />
              {errors.amount && <p className="text-sm text-danger">{errors.amount}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-600">
                Descrição (opcional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Mensalidade Plano Profissional - Janeiro/2024"
                className="bg-white border-slate-200 text-slate-900"
                rows={3}
              />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-primary/95/30 rounded-lg border border-primary/70">
              <p className="text-sm text-primary/30">
                ℹ️ <strong>Importante:</strong> A fatura será criada
                automaticamente no Asaas com vencimento em 7 dias. Um boleto e
                link de pagamento serão gerados.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white border-slate-200 text-slate-400 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-success/60 hover:bg-success/70"
            >
              {createMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Criando fatura no Asaas...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Fatura no Asaas
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
