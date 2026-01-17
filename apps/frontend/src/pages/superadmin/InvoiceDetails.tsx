import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Receipt,
  Calendar,
  DollarSign,
  ExternalLink,
  RefreshCw,
  X,
  Building2,
  CreditCard,
} from 'lucide-react'
import { useInvoice, useSyncInvoice, useCancelInvoice } from '@/hooks/useInvoices'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  OPEN: { label: 'Pendente', variant: 'secondary' },
  PAID: { label: 'Pago', variant: 'default' },
  VOID: { label: 'Cancelado', variant: 'destructive' },
  UNCOLLECTIBLE: { label: 'Incobrável', variant: 'destructive' },
}

export function InvoiceDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: invoice, isLoading } = useInvoice(id!)
  const syncMutation = useSyncInvoice()
  const cancelMutation = useCancelInvoice()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Carregando...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-slate-400">Fatura não encontrada</div>
        <Button
          variant="outline"
          onClick={() => navigate('/superadmin/invoices')}
          className="bg-white border-slate-200 text-slate-400"
        >
          Voltar
        </Button>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[invoice.status] || {
    label: invoice.status,
    variant: 'outline' as const,
  }

  const isOverdue =
    invoice.status === 'OPEN' &&
    new Date(invoice.dueDate) < new Date()

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync(invoice.id)
      toast({
        title: '✓ Sincronizado',
        description: 'Fatura sincronizada com o Asaas.',
      })
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast({
        title: 'Falha ao sincronizar',
        description: errorResponse?.data?.message || 'Erro ao sincronizar fatura.',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async () => {
    if (!confirm(`Confirma o cancelamento da fatura ${invoice.invoiceNumber}?`)) return

    try {
      await cancelMutation.mutateAsync(invoice.id)
      toast({
        title: '✓ Fatura cancelada',
        description: 'A fatura foi cancelada com sucesso.',
      })
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response;
      toast({
        title: 'Falha ao cancelar',
        description: errorResponse?.data?.message || 'Erro ao cancelar fatura.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/superadmin/invoices')}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-mono">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-slate-400 mt-1">Detalhes da Fatura</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Vencida
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {invoice.status === 'OPEN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="bg-white border-slate-200 text-slate-400 hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
          )}
          {(invoice.status === 'OPEN' || invoice.status === 'DRAFT') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
          {invoice.paymentUrl && (
            <Button
              variant="default"
              size="sm"
              asChild
              className="bg-[#059669] hover:bg-slate-600"
            >
              <a href={invoice.paymentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver no Asaas
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Valor
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Vencimento
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Método
            </CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {invoice.billingType === 'UNDEFINED' ? 'Cliente Escolhe' : invoice.billingType}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing & Discount Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Billing Cycle Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Ciclo de Cobrança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {invoice.billingCycle === 'ANNUAL' ? (
                <>
                  <Calendar className="h-5 w-5 text-success" />
                  <span className="text-lg font-semibold">Anual</span>
                  <Badge variant="default" className="ml-2 bg-success/60">
                    12 meses
                  </Badge>
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">Mensal</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discount Card (conditional) */}
        {(invoice.discountPercent || invoice.originalAmount) && (
          <Card className="bg-success/5 border-success/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-success/95">
                💰 Desconto Aplicado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.originalAmount && (
                <div>
                  <p className="text-xs text-success/80">Valor Original:</p>
                  <p className="text-lg font-semibold line-through text-slate-500">
                    R$ {Number(invoice.originalAmount).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                  </p>
                </div>
              )}
              {invoice.discountPercent && (
                <div>
                  <p className="text-xs text-success/80">Desconto:</p>
                  <p className="text-2xl font-bold text-success">
                    -{invoice.discountPercent}%
                  </p>
                </div>
              )}
              {invoice.discountReason && (
                <div>
                  <p className="text-xs text-success/80">Motivo:</p>
                  <p className="text-sm text-success/95">{invoice.discountReason}</p>
                </div>
              )}
              <div className="pt-2 border-t border-success/30">
                <p className="text-xs text-success/80">Valor Final:</p>
                <p className="text-2xl font-bold text-success/95">
                  R$ {Number(invoice.amount).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tenant Info */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações do Tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">Nome</p>
            <Link
              to={`/superadmin/tenants/${invoice.tenant.id}`}
              className="text-slate-900 hover:text-[#059669] font-medium"
            >
              {invoice.tenant.name}
            </Link>
          </div>

          <Separator className="bg-slate-200" />

          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-slate-900">{invoice.tenant.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Informações da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">Plano</p>
            <p className="text-slate-900 font-medium">
              {invoice.subscription.plan.displayName}
            </p>
          </div>

          <Separator className="bg-slate-200" />

          <div>
            <p className="text-sm text-slate-500">Período</p>
            <p className="text-slate-900">
              {invoice.subscription.currentPeriodStart && invoice.subscription.currentPeriodEnd
                ? `${new Date(invoice.subscription.currentPeriodStart).toLocaleDateString('pt-BR')} - ${new Date(invoice.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}`
                : 'Período não disponível'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      {invoice.description && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">{invoice.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Criada em:</span>
            <span className="text-slate-900">
              {new Date(invoice.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Atualizada em:</span>
            <span className="text-slate-900">
              {new Date(invoice.updatedAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
