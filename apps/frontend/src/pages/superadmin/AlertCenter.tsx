import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAlerts, useMarkAlertAsRead, useMarkAllAlertsAsRead, useDeleteAlert } from '@/hooks/useAlerts'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  Eye,
  CheckCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AlertType, AlertSeverity } from '@/api/alerts.api'

/**
 * AlertCenter Page
 *
 * Central de alertas do SuperAdmin:
 * - Listagem de todos os alertas
 * - Filtros por tipo, severidade e status (lido/não lido)
 * - Ações: Marcar como lido, Deletar
 * - Marcar todos como lidos
 */
export function AlertCenter() {
  const [searchParams] = useSearchParams()
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL')
  const [readFilter, setReadFilter] = useState<'ALL' | 'READ' | 'UNREAD'>('ALL')

  useEffect(() => {
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const read = searchParams.get('read')

    if (
      type === 'PAYMENT_FAILED' ||
      type === 'SUBSCRIPTION_EXPIRING' ||
      type === 'SUBSCRIPTION_CANCELLED' ||
      type === 'USAGE_LIMIT_EXCEEDED' ||
      type === 'TENANT_SUSPENDED' ||
      type === 'SYSTEM_ERROR'
    ) {
      setTypeFilter(type)
    }

    if (severity === 'INFO' || severity === 'WARNING' || severity === 'CRITICAL') {
      setSeverityFilter(severity)
    }

    if (read === 'READ' || read === 'UNREAD' || read === 'ALL') {
      setReadFilter(read)
    }
  }, [searchParams])

  const filters = {
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    severity: severityFilter !== 'ALL' ? severityFilter : undefined,
    read: readFilter === 'READ' ? true : readFilter === 'UNREAD' ? false : undefined,
    limit: 100,
  }

  const { data, isLoading } = useAlerts(filters)
  const markAsReadMutation = useMarkAlertAsRead()
  const markAllAsReadMutation = useMarkAllAlertsAsRead()
  const deleteMutation = useDeleteAlert()

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este alerta?')) {
      deleteMutation.mutate(id)
    }
  }

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-danger" />
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case 'INFO':
        return <Info className="h-5 w-5 text-primary" />
    }
  }

  const getSeverityBadge = (severity: AlertSeverity) => {
    const variants = {
      CRITICAL: 'bg-danger/10 text-danger/80 border-danger/50',
      WARNING: 'bg-warning/10 text-warning/80 border-warning',
      INFO: 'bg-primary/10 text-primary/80 border-primary/50',
    }
    return (
      <Badge variant="outline" className={variants[severity]}>
        {severity}
      </Badge>
    )
  }

  const getTypeLabel = (type: AlertType) => {
    const labels: Record<AlertType, string> = {
      PAYMENT_FAILED: 'Pagamento Falhou',
      SUBSCRIPTION_EXPIRING: 'Assinatura Expirando',
      SUBSCRIPTION_CANCELLED: 'Assinatura Cancelada',
      USAGE_LIMIT_EXCEEDED: 'Limite de Uso Excedido',
      TENANT_SUSPENDED: 'Tenant Suspenso',
      SYSTEM_ERROR: 'Erro do Sistema',
    }
    return labels[type]
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  const alerts = data?.data || []
  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Central de Alertas</h1>
          <p className="text-slate-400 mt-2">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
            {unreadCount > 0 && (
              <span className="ml-2 text-warning/30">
                ({unreadCount} não {unreadCount === 1 ? 'lido' : 'lidos'})
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
            className="border-slate-200 text-slate-900 hover:bg-slate-100"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar Todos como Lidos
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          {/* Tipo */}
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-2 block">Tipo</label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AlertType | 'ALL')}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="PAYMENT_FAILED">Pagamento Falhou</SelectItem>
                <SelectItem value="SUBSCRIPTION_EXPIRING">Assinatura Expirando</SelectItem>
                <SelectItem value="SUBSCRIPTION_CANCELLED">Assinatura Cancelada</SelectItem>
                <SelectItem value="TENANT_SUSPENDED">Tenant Suspenso</SelectItem>
                <SelectItem value="SYSTEM_ERROR">Erro do Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severidade */}
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-2 block">Severidade</label>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'ALL')}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-2 block">Status</label>
            <Select value={readFilter} onValueChange={(v) => setReadFilter(v as 'ALL' | 'READ' | 'UNREAD')}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="UNREAD">Não Lidos</SelectItem>
                <SelectItem value="READ">Lidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-slate-400">Nenhum alerta encontrado</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-slate-200 ${
                alert.read ? 'bg-white opacity-70' : 'bg-white border-l-4 border-l-yellow-500'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Ícone de severidade */}
                  <div className="mt-1">{getSeverityIcon(alert.severity)}</div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                      {getSeverityBadge(alert.severity)}
                      <Badge variant="outline" className="text-xs bg-slate-100 border-slate-300 text-slate-700">
                        {getTypeLabel(alert.type)}
                      </Badge>
                      {alert.read && (
                        <Badge variant="outline" className="text-xs bg-success/10 border-success/30 text-success/80">
                          Lido
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 mb-2">{alert.message}</p>

                    {alert.tenant && (
                      <p className="text-xs text-slate-500">Tenant: {alert.tenant.name}</p>
                    )}

                    <p className="text-xs text-slate-500 mt-2">
                      {formatDistanceToNow(new Date(alert.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    {!alert.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(alert.id)}
                        disabled={markAsReadMutation.isPending}
                        className="text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(alert.id)}
                      disabled={deleteMutation.isPending}
                      className="text-danger/40 hover:text-danger/30 hover:bg-danger/90/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
