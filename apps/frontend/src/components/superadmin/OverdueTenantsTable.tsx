import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { sendReminder, suspendTenant as suspendTenantRequest } from '@/api/collections.api'
import { MoreVertical, Eye, Mail, Ban, DollarSign, Loader2 } from 'lucide-react'
import { SendReminderDialog } from './SendReminderDialog'
import { RenegotiateDialog } from './RenegotiateDialog'
import { SuspendTenantDialog } from './SuspendTenantDialog'
import type { OverdueTenant } from '@/api/overdue.api'

interface OverdueTenantsTableProps {
  tenants: OverdueTenant[]
}

export function OverdueTenantsTable({ tenants }: OverdueTenantsTableProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [selectedTenant, setSelectedTenant] = useState<OverdueTenant | null>(null)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [renegotiateDialogOpen, setRenegotiateDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([])
  const [batchReminderPending, setBatchReminderPending] = useState(false)
  const [batchSuspendPending, setBatchSuspendPending] = useState(false)
  const [batchSuspendDialogOpen, setBatchSuspendDialogOpen] = useState(false)
  const [batchSuspendReason, setBatchSuspendReason] = useState('')
  const [batchSuspendConfirm, setBatchSuspendConfirm] = useState(false)

  const handleSendReminder = (tenant: OverdueTenant) => {
    setSelectedTenant(tenant)
    setReminderDialogOpen(true)
  }

  const handleRenegotiate = (tenant: OverdueTenant) => {
    setSelectedTenant(tenant)
    setRenegotiateDialogOpen(true)
  }

  const handleSuspend = (tenant: OverdueTenant) => {
    setSelectedTenant(tenant)
    setSuspendDialogOpen(true)
  }

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => selectedTenantIds.includes(tenant.tenantId)),
    [selectedTenantIds, tenants],
  )

  const allSelected = tenants.length > 0 && selectedTenantIds.length === tenants.length
  const hasPartialSelection = selectedTenantIds.length > 0 && !allSelected

  const toggleTenantSelection = (tenantId: string, checked: boolean) => {
    setSelectedTenantIds((current) => {
      if (checked) return [...new Set([...current, tenantId])]
      return current.filter((id) => id !== tenantId)
    })
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTenantIds(tenants.map((tenant) => tenant.tenantId))
      return
    }

    setSelectedTenantIds([])
  }

  const invalidateAfterBatch = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['overdue'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    ])
  }

  const handleBatchReminder = async () => {
    if (selectedTenants.length === 0) return

    setBatchReminderPending(true)

    const selectedInvoices = selectedTenants
      .map((tenant) => tenant.invoices[0]?.id)
      .filter((id): id is string => Boolean(id))

    const results = await Promise.allSettled(
      selectedInvoices.map((invoiceId) => sendReminder({ invoiceId })),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    const failCount = results.length - successCount

    await invalidateAfterBatch()

    if (failCount === 0) {
      toast({
        title: 'Lembretes enviados',
        description: `${successCount} tenant${successCount === 1 ? '' : 's'} notificado${successCount === 1 ? '' : 's'} com sucesso.`,
      })
    } else {
      toast({
        title: 'Execução parcial do lote',
        description: `${successCount} enviado(s), ${failCount} com falha.`,
        variant: 'destructive',
      })
    }

    setBatchReminderPending(false)
    setSelectedTenantIds([])
  }

  const handleBatchSuspend = async () => {
    if (!batchSuspendReason || batchSuspendReason.trim().length < 10) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe um motivo com no mínimo 10 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (!batchSuspendConfirm) {
      toast({
        title: 'Confirmação obrigatória',
        description: 'Marque a confirmação antes de suspender em lote.',
        variant: 'destructive',
      })
      return
    }

    setBatchSuspendPending(true)

    const results = await Promise.allSettled(
      selectedTenants.map((tenant) =>
        suspendTenantRequest({
          tenantId: tenant.tenantId,
          invoiceIds: tenant.invoices.map((invoice) => invoice.id),
          reason: batchSuspendReason.trim(),
        }),
      ),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    const failCount = results.length - successCount

    await invalidateAfterBatch()

    if (failCount === 0) {
      toast({
        title: 'Suspensão em lote concluída',
        description: `${successCount} tenant${successCount === 1 ? '' : 's'} suspenso${successCount === 1 ? '' : 's'}.`,
      })
    } else {
      toast({
        title: 'Suspensão em lote parcial',
        description: `${successCount} sucesso(s), ${failCount} falha(s).`,
        variant: 'destructive',
      })
    }

    setBatchSuspendPending(false)
    setBatchSuspendDialogOpen(false)
    setBatchSuspendReason('')
    setBatchSuspendConfirm(false)
    setSelectedTenantIds([])
  }

  return (
    <>
      {/* Modais */}
      <SendReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        tenant={selectedTenant}
      />
      <RenegotiateDialog
        open={renegotiateDialogOpen}
        onOpenChange={setRenegotiateDialogOpen}
        tenant={selectedTenant}
      />
      <SuspendTenantDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        tenant={selectedTenant}
      />
      <Dialog
        open={batchSuspendDialogOpen}
        onOpenChange={(open) => {
          setBatchSuspendDialogOpen(open)
          if (!open) {
            setBatchSuspendReason('')
            setBatchSuspendConfirm(false)
          }
        }}
      >
        <DialogContent className="bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-danger/90">Suspender tenants em lote</DialogTitle>
            <DialogDescription>
              Esta ação bloqueará acesso imediato para os tenants selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {selectedTenants.length} tenant{selectedTenants.length === 1 ? '' : 's'} selecionado{selectedTenants.length === 1 ? '' : 's'}.
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchSuspendReason">Motivo *</Label>
              <Textarea
                id="batchSuspendReason"
                value={batchSuspendReason}
                onChange={(event) => setBatchSuspendReason(event.target.value)}
                placeholder="Ex: Inadimplência persistente sem retorno dos contatos."
                className="min-h-[90px]"
              />
              <p className="text-xs text-slate-500">
                {batchSuspendReason.length}/10 caracteres mínimos
              </p>
            </div>
            <label
              htmlFor="batchSuspendConfirm"
              className="flex cursor-pointer items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3"
            >
              <Checkbox
                id="batchSuspendConfirm"
                checked={batchSuspendConfirm}
                onCheckedChange={(checked) => setBatchSuspendConfirm(checked === true)}
              />
              <span className="text-sm text-slate-700">
                Confirmo que desejo suspender os tenants selecionados.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchSuspendDialogOpen(false)}
              disabled={batchSuspendPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBatchSuspend}
              disabled={batchSuspendPending}
              className="bg-danger/60 hover:bg-danger/70 text-white"
            >
              {batchSuspendPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspendendo...
                </>
              ) : (
                'Confirmar suspensão em lote'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabela */}
    <div className="space-y-3">
      {selectedTenantIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm text-slate-700">
            {selectedTenantIds.length} tenant{selectedTenantIds.length === 1 ? '' : 's'} selecionado{selectedTenantIds.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTenantIds([])}
              disabled={batchReminderPending || batchSuspendPending}
            >
              Limpar seleção
            </Button>
            <Button
              size="sm"
              className="bg-primary/60 hover:bg-primary/70 text-white"
              onClick={handleBatchReminder}
              disabled={batchReminderPending || batchSuspendPending}
            >
              {batchReminderPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar lembrete em lote'
              )}
            </Button>
            <Button
              size="sm"
              className="bg-danger/60 hover:bg-danger/70 text-white"
              onClick={() => setBatchSuspendDialogOpen(true)}
              disabled={batchReminderPending || batchSuspendPending}
            >
              Suspender em lote
            </Button>
          </div>
        </div>
      )}

    <div className="rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-slate-100/50">
            <TableHead className="w-[50px] text-center">
              <Checkbox
                checked={allSelected ? true : hasPartialSelection ? 'indeterminate' : false}
                onCheckedChange={(checked) => handleToggleSelectAll(checked === true)}
                aria-label="Selecionar todos os tenants"
              />
            </TableHead>
            <TableHead className="text-slate-400">Tenant</TableHead>
            <TableHead className="text-slate-400">Plano</TableHead>
            <TableHead className="text-slate-400 text-center">Faturas Vencidas</TableHead>
            <TableHead className="text-slate-400 text-right">Valor Total</TableHead>
            <TableHead className="text-slate-400 text-center">Maior Atraso</TableHead>
            <TableHead className="text-slate-400 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => {
            // Determinar severidade com base no maior atraso
            const isCritical = tenant.maxDaysOverdue >= 30
            const isWarning = tenant.maxDaysOverdue >= 7

            return (
              <TableRow key={tenant.tenantId} className="border-slate-200 hover:bg-slate-100/30">
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedTenantIds.includes(tenant.tenantId)}
                    onCheckedChange={(checked) =>
                      toggleTenantSelection(tenant.tenantId, checked === true)
                    }
                    aria-label={`Selecionar tenant ${tenant.tenantName}`}
                  />
                </TableCell>
                {/* Tenant Info */}
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-900">{tenant.tenantName}</div>
                    <div className="text-sm text-slate-500">{tenant.tenantEmail}</div>
                  </div>
                </TableCell>

                {/* Plano */}
                <TableCell>
                  <Badge variant="outline" className="text-slate-700">
                    {tenant.planName}
                  </Badge>
                </TableCell>

                {/* Faturas Vencidas */}
                <TableCell className="text-center">
                  <Badge
                    variant={isCritical ? 'destructive' : isWarning ? 'secondary' : 'outline'}
                    className={
                      isCritical
                        ? 'bg-danger/60 text-white'
                        : isWarning
                          ? 'bg-severity-warning/10 text-severity-warning/90'
                          : ''
                    }
                  >
                    {tenant.overdueInvoices} {tenant.overdueInvoices === 1 ? 'fatura' : 'faturas'}
                  </Badge>
                </TableCell>

                {/* Valor Total em Atraso */}
                <TableCell className="text-right">
                  <span className="font-semibold text-danger/90">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(tenant.totalOverdueAmount)}
                  </span>
                </TableCell>

                {/* Maior Atraso (dias) */}
                <TableCell className="text-center">
                  <Badge
                    variant={isCritical ? 'destructive' : isWarning ? 'secondary' : 'outline'}
                    className={
                      isCritical
                        ? 'bg-danger/60 text-white'
                        : isWarning
                          ? 'bg-severity-warning/10 text-severity-warning/90'
                          : ''
                    }
                  >
                    {tenant.maxDaysOverdue} {tenant.maxDaysOverdue === 1 ? 'dia' : 'dias'}
                  </Badge>
                </TableCell>

                {/* Ações */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-slate-200">
                      <DropdownMenuItem asChild>
                        <Link
                          to={`/superadmin/tenants/${tenant.tenantId}`}
                          className="cursor-pointer text-slate-700 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer text-primary hover:text-primary/80"
                        onClick={() => handleSendReminder(tenant)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Lembrete
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer text-success hover:text-success/80"
                        onClick={() => handleRenegotiate(tenant)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Renegociar
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer text-danger hover:text-danger/80"
                        onClick={() => handleSuspend(tenant)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Suspender Tenant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </div>
    </>
  )
}
