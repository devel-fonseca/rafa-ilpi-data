import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  CreditCard,
  Activity,
  Ban,
  Play,
  Trash2,
  Receipt,
  ExternalLink,
} from 'lucide-react'
import { EditTenantDialog } from '@/components/superadmin/EditTenantDialog'
import { ChangePlanDialog } from '@/components/superadmin/ChangePlanDialog'
import { SuspendTenantDialog } from '@/components/superadmin/SuspendTenantDialog'
import { DeleteTenantDialog } from '@/components/superadmin/DeleteTenantDialog'
import {
  useTenant,
  useTenantStats,
  useSubscriptionHistory,
  useSuspendTenant,
  useReactivateTenant,
  useChangePlan,
} from '@/hooks/useSuperAdmin'
import { useTenantInvoices } from '@/hooks/useInvoices'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  TRIAL: { label: 'Trial', variant: 'secondary' },
  SUSPENDED: { label: 'Suspenso', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
}

const SUBSCRIPTION_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativa', variant: 'default' },
  trialing: { label: 'Trial', variant: 'secondary' },
  past_due: { label: 'Vencida', variant: 'destructive' },
  canceled: { label: 'Cancelada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
  unpaid: { label: 'Não paga', variant: 'destructive' },
  incomplete: { label: 'Incompleta', variant: 'outline' },
}

export function TenantDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: tenant, isLoading } = useTenant(id!)
  const { data: stats } = useTenantStats(id!)
  const { data: subscriptions } = useSubscriptionHistory(id!)
  const { data: invoicesData } = useTenantInvoices(id!)

  const reactivateMutation = useReactivateTenant()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Carregando...</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-slate-400">Tenant não encontrado</div>
        <Button
          variant="outline"
          onClick={() => navigate('/superadmin/tenants')}
          className="bg-white border-slate-200 text-slate-400"
        >
          Voltar
        </Button>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[tenant.status] || {
    label: tenant.status,
    variant: 'outline' as const,
  }

  const activeSub = tenant.subscriptions.find((s) => s.status === 'active')

  const handleReactivate = async () => {
    if (!confirm(`Confirma a reativação de "${tenant.name}"? O acesso será restaurado imediatamente.`)) return

    try {
      await reactivateMutation.mutateAsync(tenant.id)
      toast({
        title: '✓ Tenant reativado',
        description: `"${tenant.name}" foi reativado. Todos os usuários recuperaram acesso à plataforma.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao reativar tenant',
        description: err.response?.data?.message || 'Ocorreu um erro ao reativar o tenant. Verifique o status e tente novamente.',
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
            onClick={() => navigate('/superadmin/tenants')}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="text-slate-400 mt-1">{tenant.email}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        <div className="flex gap-2">
          <EditTenantDialog tenant={tenant} />
          <ChangePlanDialog tenant={tenant} />
          {tenant.status === 'ACTIVE' && (
            <SuspendTenantDialog
              tenantId={tenant.id}
              tenantName={tenant.name}
              variant="button"
            />
          )}
          {tenant.status === 'SUSPENDED' && (
            <Button
              variant="default"
              onClick={handleReactivate}
              disabled={reactivateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Reativar
            </Button>
          )}
          <DeleteTenantDialog
            tenantId={tenant.id}
            tenantName={tenant.name}
            variant="button"
          />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {tenant._count.users}
            </div>
            {stats && (
              <p className="text-xs text-slate-500 mt-1">
                {stats.activeUsers} ativos
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Residentes
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {tenant._count.residents}
            </div>
            {stats && (
              <p className="text-xs text-slate-500 mt-1">
                {stats.activeResidents} ativos
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Plano Atual
            </CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {activeSub?.plan.displayName || 'Sem plano'}
            </div>
            {activeSub?.plan.price && (
              <p className="text-xs text-slate-500 mt-1">
                R$ {activeSub.plan.price.toLocaleString('pt-BR')} / mês
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações Gerais */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">CNPJ</p>
              <p className="text-slate-900">{tenant.cnpj || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Telefone</p>
              <p className="text-slate-900">{tenant.phone || 'Não informado'}</p>
            </div>
          </div>

          <Separator className="bg-slate-200" />

          <div>
            <p className="text-sm text-slate-500">Endereço</p>
            <p className="text-slate-900">
              {tenant.addressStreet
                ? `${tenant.addressStreet}, ${tenant.addressCity || ''} - ${tenant.addressState || ''}`
                : 'Não informado'}
            </p>
          </div>

          <Separator className="bg-slate-200" />

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            Criado em {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Subscriptions */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Assinaturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions && subscriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-400">Plano</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Início</TableHead>
                  <TableHead className="text-slate-400">Término</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Valor
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => {
                  const subStatus = SUBSCRIPTION_STATUS[sub.status] || {
                    label: sub.status,
                    variant: 'outline' as const,
                  }

                  return (
                    <TableRow key={sub.id} className="border-slate-200">
                      <TableCell className="text-slate-900">
                        {sub.plan.displayName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subStatus.variant}>
                          {subStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {sub.currentPeriodStart
                          ? new Date(sub.currentPeriodStart).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {sub.plan.price
                          ? `R$ ${sub.plan.price.toLocaleString('pt-BR')}`
                          : 'Gratuito'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-slate-500 py-8">
              Nenhum histórico de assinatura
            </p>
          )}
        </CardContent>
      </Card>

      {/* Faturas */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Faturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesData && invoicesData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-400">Número</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Valor</TableHead>
                  <TableHead className="text-slate-400">Vencimento</TableHead>
                  <TableHead className="text-slate-400">Criada em</TableHead>
                  <TableHead className="text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesData.map((invoice: any) => {
                  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                    DRAFT: { label: 'Rascunho', variant: 'outline' },
                    OPEN: { label: 'Pendente', variant: 'secondary' },
                    PAID: { label: 'Pago', variant: 'default' },
                    VOID: { label: 'Cancelado', variant: 'destructive' },
                    UNCOLLECTIBLE: { label: 'Incobrável', variant: 'destructive' },
                  }
                  const statusInfo = statusLabels[invoice.status] || {
                    label: invoice.status,
                    variant: 'outline' as const,
                  }

                  const isOverdue =
                    invoice.status === 'OPEN' &&
                    new Date(invoice.dueDate) < new Date()

                  return (
                    <TableRow key={invoice.id} className="border-slate-200">
                      <TableCell className="text-slate-900 font-mono text-sm">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              Vencida
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {invoice.paymentUrl && (
                          <a
                            href={invoice.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-slate-900 inline-flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver no Asaas
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-slate-500 py-8">
              Nenhuma fatura encontrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
