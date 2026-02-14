import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  CreditCard,
  Activity,
  Play,
  Receipt,
  ExternalLink,
  FileText,
  Download,
  Lock,
  Zap,
  History,
} from 'lucide-react'
import { EditTenantDialog } from '@/components/superadmin/EditTenantDialog'
import { ChangePlanDialog } from '@/components/superadmin/ChangePlanDialog'
import { ApplyDiscountDialog } from '@/components/superadmin/ApplyDiscountDialog'
import { DeleteTenantDialog } from '@/components/superadmin/DeleteTenantDialog'
import { CustomizeLimitsDialog } from '@/components/superadmin/CustomizeLimitsDialog'
import { TermsAcceptanceModal } from '@/components/superadmin/TermsAcceptanceModal'
import { PrivacyPolicyAcceptanceModal } from '@/components/superadmin/PrivacyPolicyAcceptanceModal'
import {
  useTenant,
  useTenantStats,
  useSubscriptionHistory,
  useReactivateTenant,
  useTenantEffectiveLimits,
  useCreateTenantBackup,
} from '@/hooks/useSuperAdmin'
import { useTenantInvoices } from '@/hooks/useInvoices'
import type { Invoice } from '@/api/invoices.api'
import { useTenantContractAcceptance, useTenantPrivacyPolicyAcceptance } from '@/hooks/useContracts'
import { generateTermsAcceptancePDF, generatePrivacyPolicyAcceptancePDF } from '@/utils/acceptance-pdf'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CORE_FEATURES, FEATURES_MAP } from '@/constants/features'
import {
  formatDateOnlySafe,
  formatDateTimeSafe,
  isDateBefore,
  getCurrentDate,
  normalizeUTCDate,
} from '@/utils/dateHelpers'

// Helper para obter nome humanizado de uma feature
const getFeatureName = (key: string): string => FEATURES_MAP[key] || key

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
  unpaid: { label: 'Não paga', variant: 'destructive' },
  incomplete: { label: 'Incompleta', variant: 'outline' },
}

type TimelineEventType = 'all' | 'tenant' | 'subscription' | 'billing' | 'compliance'

interface TimelineEvent {
  id: string
  type: Exclude<TimelineEventType, 'all'>
  happenedAt: string
  title: string
  description?: string
}

const TIMELINE_EVENT_STYLES: Record<
  Exclude<TimelineEventType, 'all'>,
  { label: string; className: string }
> = {
  tenant: {
    label: 'Tenant',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  subscription: {
    label: 'Assinatura',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  billing: {
    label: 'Cobrança',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  compliance: {
    label: 'Compliance',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
}

export function TenantDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [privacyPolicyModalOpen, setPrivacyPolicyModalOpen] = useState(false)
  const [timelineFilter, setTimelineFilter] = useState<TimelineEventType>('all')

  const { data: tenant, isLoading } = useTenant(id!)
  const { data: stats } = useTenantStats(id!)
  const { data: subscriptions } = useSubscriptionHistory(id!)
  const { data: invoicesData } = useTenantInvoices(id!)
  const { data: contractAcceptance } = useTenantContractAcceptance(id!)
  const { data: privacyPolicyAcceptance } = useTenantPrivacyPolicyAcceptance(id!)
  const { data: effectiveLimits } = useTenantEffectiveLimits(id!, !!id)

  const reactivateMutation = useReactivateTenant()
  const createTenantBackupMutation = useCreateTenantBackup()

  const timelineEvents = useMemo(() => {
    if (!tenant) return []

    const events: TimelineEvent[] = [
      {
        id: `tenant-created-${tenant.id}`,
        type: 'tenant',
        happenedAt: tenant.createdAt,
        title: 'Tenant criado',
        description: `${tenant.name} entrou na plataforma.`,
      },
    ]

    subscriptions?.forEach((sub) => {
      events.push({
        id: `subscription-created-${sub.id}`,
        type: 'subscription',
        happenedAt: sub.createdAt,
        title: `Assinatura criada (${sub.plan.displayName})`,
        description: `Status inicial: ${SUBSCRIPTION_STATUS[sub.status]?.label || sub.status}.`,
      })

      if (sub.currentPeriodStart) {
        events.push({
          id: `subscription-period-start-${sub.id}-${sub.currentPeriodStart}`,
          type: 'subscription',
          happenedAt: sub.currentPeriodStart,
          title: `Início de período - ${sub.plan.displayName}`,
        })
      }

      if (sub.currentPeriodEnd) {
        events.push({
          id: `subscription-period-end-${sub.id}-${sub.currentPeriodEnd}`,
          type: 'subscription',
          happenedAt: sub.currentPeriodEnd,
          title: `Fim de período - ${sub.plan.displayName}`,
        })
      }

      if (sub.trialEndDate) {
        events.push({
          id: `subscription-trial-end-${sub.id}-${sub.trialEndDate}`,
          type: 'subscription',
          happenedAt: sub.trialEndDate,
          title: 'Término do trial',
          description: `Plano do trial: ${sub.plan.displayName}.`,
        })
      }
    })

    invoicesData?.forEach((invoice) => {
      events.push({
        id: `invoice-created-${invoice.id}`,
        type: 'billing',
        happenedAt: invoice.createdAt,
        title: `Fatura emitida (${invoice.invoiceNumber})`,
        description: `Valor: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(invoice.amount)} • Status: ${invoice.status}.`,
      })

      events.push({
        id: `invoice-due-${invoice.id}`,
        type: 'billing',
        happenedAt: invoice.dueDate,
        title: `Vencimento da fatura ${invoice.invoiceNumber}`,
      })

      if (invoice.paidAt) {
        events.push({
          id: `invoice-paid-${invoice.id}`,
          type: 'billing',
          happenedAt: invoice.paidAt,
          title: `Fatura paga (${invoice.invoiceNumber})`,
          description: `Pagamento confirmado para ${invoice.tenant.name}.`,
        })
      }
    })

    if (contractAcceptance) {
      events.push({
        id: `terms-acceptance-${contractAcceptance.id}`,
        type: 'compliance',
        happenedAt: contractAcceptance.acceptedAt,
        title: `Termos de uso aceitos (${contractAcceptance.termsVersion})`,
        description: contractAcceptance.user?.name
          ? `Aceito por ${contractAcceptance.user.name}.`
          : undefined,
      })
    }

    if (privacyPolicyAcceptance) {
      events.push({
        id: `privacy-acceptance-${privacyPolicyAcceptance.id}`,
        type: 'compliance',
        happenedAt: privacyPolicyAcceptance.acceptedAt,
        title: `Política de privacidade aceita (${privacyPolicyAcceptance.policyVersion})`,
        description: privacyPolicyAcceptance.user?.name
          ? `Aceito por ${privacyPolicyAcceptance.user.name}.`
          : undefined,
      })
    }

    return events
      .filter((event) => Boolean(event.happenedAt))
      .sort(
        (a, b) =>
          normalizeUTCDate(b.happenedAt).getTime() - normalizeUTCDate(a.happenedAt).getTime(),
      )
  }, [
    contractAcceptance,
    invoicesData,
    privacyPolicyAcceptance,
    subscriptions,
    tenant?.createdAt,
    tenant?.id,
    tenant?.name,
  ])

  const filteredTimelineEvents = useMemo(() => {
    if (timelineFilter === 'all') return timelineEvents
    return timelineEvents.filter((event) => event.type === timelineFilter)
  }, [timelineEvents, timelineFilter])

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

  const activeSub = tenant.subscriptions.find((s) => s.status === 'active' || s.status === 'trialing')

  const handleReactivate = async () => {
    if (!confirm(`Confirma a reativação de "${tenant.name}"? O acesso será restaurado imediatamente.`)) return

    try {
      await reactivateMutation.mutateAsync(tenant.id)
      toast({
        title: '✓ Tenant reativado',
        description: `"${tenant.name}" foi reativado. Todos os usuários recuperaram acesso à plataforma.`,
      })
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response;
      toast({
        title: 'Falha ao reativar tenant',
        description: errorResponse?.data?.message || 'Ocorreu um erro ao reativar o tenant. Verifique o status e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateTenantBackup = async () => {
    try {
      const response = await createTenantBackupMutation.mutateAsync(tenant.id)
      toast({
        title: 'Backup do tenant gerado',
        description: response.message,
      })
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Falha ao gerar backup',
        description: errorResponse?.data?.message || 'Não foi possível gerar o backup do tenant',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4">
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
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-slate-900">{tenant.name}</h1>
              <div className="flex gap-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                {effectiveLimits?.hasCustomizations && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    🎯 Customizado
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-slate-400 mt-1">{tenant.email}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <EditTenantDialog tenant={tenant} />
            <Button
              variant="outline"
              onClick={handleCreateTenantBackup}
              disabled={createTenantBackupMutation.isPending}
              className="bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
            >
              {createTenantBackupMutation.isPending ? (
                <>Gerando backup...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Backup do Tenant
                </>
              )}
            </Button>
            <ChangePlanDialog tenant={tenant} />
            {activeSub && (
              <>
                <ApplyDiscountDialog
                  subscriptionId={activeSub.id}
                  currentDiscount={{
                    discountPercent: activeSub.discountPercent,
                    discountReason: activeSub.discountReason,
                    customPrice: activeSub.customPrice,
                  }}
                  planPrice={activeSub.plan.price !== null ? activeSub.plan.price.toString() : null}
                />
                <CustomizeLimitsDialog tenant={tenant} />
              </>
            )}
            {tenant.status === 'SUSPENDED' && (
              <Button
                variant="default"
                onClick={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="bg-success/60 hover:bg-success/70"
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

      {/* Limites Efetivos */}
      {effectiveLimits && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Limites Efetivos
              {effectiveLimits.hasCustomizations && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  Customizado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Limite de Usuários */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Usuários</span>
                <span className="text-sm text-slate-500">
                  {tenant._count.users} / {effectiveLimits.effectiveLimits.maxUsers === -1 ? '∞' : effectiveLimits.effectiveLimits.maxUsers}
                </span>
              </div>
              {effectiveLimits.effectiveLimits.maxUsers !== -1 && (
                <Progress
                  value={(tenant._count.users / effectiveLimits.effectiveLimits.maxUsers) * 100}
                  className="h-2"
                />
              )}
              {effectiveLimits.customOverrides.customMaxUsers && (
                <p className="text-xs text-blue-600">
                  🎯 Customizado: {effectiveLimits.customOverrides.customMaxUsers}
                  <span className="text-slate-400 ml-1">
                    (base do plano: {activeSub?.plan.maxUsers === -1 ? 'ilimitado' : activeSub?.plan.maxUsers})
                  </span>
                </p>
              )}
            </div>

            <Separator className="bg-slate-200" />

            {/* Limite de Residentes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Residentes</span>
                <span className="text-sm text-slate-500">
                  {tenant._count.residents} / {effectiveLimits.effectiveLimits.maxResidents === -1 ? '∞' : effectiveLimits.effectiveLimits.maxResidents}
                </span>
              </div>
              {effectiveLimits.effectiveLimits.maxResidents !== -1 && (
                <Progress
                  value={(tenant._count.residents / effectiveLimits.effectiveLimits.maxResidents) * 100}
                  className="h-2"
                />
              )}
              {effectiveLimits.customOverrides.customMaxResidents && (
                <p className="text-xs text-blue-600">
                  🎯 Customizado: {effectiveLimits.customOverrides.customMaxResidents}
                  <span className="text-slate-400 ml-1">
                    (base do plano: {activeSub?.plan.maxResidents === -1 ? 'ilimitado' : activeSub?.plan.maxResidents})
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features Efetivas */}
      {effectiveLimits && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Features Efetivas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Features Core */}
            <div className="p-3 bg-slate-50 rounded-md border border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-3 w-3 text-slate-600" />
                <p className="text-xs font-medium text-slate-700">
                  Features Core ({CORE_FEATURES.length}):
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CORE_FEATURES.map((feature, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-slate-200 text-slate-700 border border-slate-300 text-xs"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    {getFeatureName(feature)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Features do Plano/Assinadas */}
            {effectiveLimits.effectiveLimits.features && Object.entries(effectiveLimits.effectiveLimits.features)
              .filter(([key, val]) => val === true && !(CORE_FEATURES as readonly string[]).includes(key))
              .length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200">
                <p className="text-xs font-medium text-emerald-900 mb-2">
                  ✓ Features da Assinatura (
                    {Object.entries(effectiveLimits.effectiveLimits.features)
                      .filter(([key, val]) => val === true && !(CORE_FEATURES as readonly string[]).includes(key))
                      .length}
                  ):
                </p>
                <div className="flex flex-wrap gap-2">
                  {effectiveLimits.effectiveLimits.features && Object.entries(effectiveLimits.effectiveLimits.features)
                    .filter(([key, val]) => val === true && !(CORE_FEATURES as readonly string[]).includes(key))
                    .map(([feature], idx) => (
                      <Badge
                        key={idx}
                        className="bg-emerald-600 text-white text-xs"
                      >
                        {getFeatureName(feature)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Features Customizadas Adicionadas */}
            {effectiveLimits.customOverrides.customFeatures &&
             Object.entries(effectiveLimits.customOverrides.customFeatures)
               .filter(([, val]) => val === true)
               .length > 0 && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-2">
                  🎯 Features Customizadas Adicionadas (
                    {Object.entries(effectiveLimits.customOverrides.customFeatures)
                      .filter(([, val]) => val === true)
                      .length}
                  ):
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(effectiveLimits.customOverrides.customFeatures)
                    .filter(([, val]) => val === true)
                    .map(([feature], idx) => (
                      <Badge
                        key={idx}
                        className="bg-blue-600 text-white text-xs"
                      >
                        {getFeatureName(feature)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Features Customizadas Removidas */}
            {effectiveLimits.customOverrides.customFeatures &&
             Object.entries(effectiveLimits.customOverrides.customFeatures)
               .filter(([, val]) => val === false)
               .length > 0 && (
              <div className="p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-xs font-medium text-red-900 mb-2">
                  ✗ Features Customizadas Removidas (
                    {Object.entries(effectiveLimits.customOverrides.customFeatures)
                      .filter(([, val]) => val === false)
                      .length}
                  ):
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(effectiveLimits.customOverrides.customFeatures)
                    .filter(([, val]) => val === false)
                    .map(([feature], idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="border-red-300 text-red-700 text-xs line-through"
                      >
                        {getFeatureName(feature)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Timeline Unificada */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5" />
            Timeline do Tenant
          </CardTitle>
          <Select
            value={timelineFilter}
            onValueChange={(value: TimelineEventType) => setTimelineFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filtrar eventos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="subscription">Assinatura</SelectItem>
              <SelectItem value="billing">Cobrança</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredTimelineEvents.length > 0 ? (
            <div className="space-y-3">
              {filteredTimelineEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={TIMELINE_EVENT_STYLES[event.type].className}>
                        {TIMELINE_EVENT_STYLES[event.type].label}
                      </Badge>
                      <p className="text-sm font-medium text-slate-900">{event.title}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDateTimeSafe(event.happenedAt)}
                    </p>
                  </div>
                  {event.description && (
                    <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-6">Nenhum evento encontrado para o filtro selecionado.</p>
          )}
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
            <div className="overflow-x-auto">
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
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">
              Nenhum histórico de assinatura
            </p>
          )}
        </CardContent>
      </Card>

      {/* Termos de Uso Aceitos */}
      {contractAcceptance && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Termos de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-slate-400">Versão</TableHead>
                    <TableHead className="text-slate-400">Data de Aceite</TableHead>
                    <TableHead className="text-slate-400">Aceito por</TableHead>
                    <TableHead className="text-slate-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-slate-200">
                    <TableCell className="text-slate-900 font-medium">
                      {contractAcceptance.termsVersion}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(contractAcceptance.acceptedAt).toLocaleDateString('pt-BR')}
                      <span className="text-xs ml-2">
                        {new Date(contractAcceptance.acceptedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      <div>
                        <p className="text-slate-900">{contractAcceptance.user?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{contractAcceptance.user?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContractModalOpen(true)}
                          className="bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateTermsAcceptancePDF(contractAcceptance)}
                          className="bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                          title="Baixar PDF do comprovante de aceite"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Política de Privacidade Aceita */}
      {privacyPolicyAcceptance && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Política de Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-slate-400">Versão</TableHead>
                    <TableHead className="text-slate-400">Data de Aceite</TableHead>
                    <TableHead className="text-slate-400">Aceito por</TableHead>
                    <TableHead className="text-slate-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-slate-200">
                    <TableCell className="text-slate-900 font-medium">
                      {privacyPolicyAcceptance.policyVersion}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(privacyPolicyAcceptance.acceptedAt).toLocaleDateString('pt-BR')}
                      <span className="text-xs ml-2">
                        {new Date(privacyPolicyAcceptance.acceptedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      <div>
                        <p className="text-slate-900">{privacyPolicyAcceptance.user?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{privacyPolicyAcceptance.user?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrivacyPolicyModalOpen(true)}
                          className="bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePrivacyPolicyAcceptancePDF(privacyPolicyAcceptance)}
                          className="bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                          title="Baixar PDF do comprovante de aceite"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes do Termo de Uso */}
      <TermsAcceptanceModal
        acceptance={contractAcceptance || null}
        open={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
      />

      {/* Modal de Detalhes da Política de Privacidade */}
      <PrivacyPolicyAcceptanceModal
        acceptance={privacyPolicyAcceptance || null}
        open={privacyPolicyModalOpen}
        onClose={() => setPrivacyPolicyModalOpen(false)}
      />

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
            <div className="overflow-x-auto">
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
                  {invoicesData.map((invoice: Invoice) => {
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
                      isDateBefore(invoice.dueDate, getCurrentDate())

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
                          {formatDateOnlySafe(invoice.dueDate)}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {formatDateOnlySafe(invoice.createdAt)}
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
            </div>
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
