import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Eye, Mail, Ban, DollarSign } from 'lucide-react'
import { SendReminderDialog } from './SendReminderDialog'
import { RenegotiateDialog } from './RenegotiateDialog'
import { SuspendTenantDialog } from './SuspendTenantDialog'
import type { OverdueTenant } from '@/api/overdue.api'

interface OverdueTenantsTableProps {
  tenants: OverdueTenant[]
}

export function OverdueTenantsTable({ tenants }: OverdueTenantsTableProps) {
  const [selectedTenant, setSelectedTenant] = useState<OverdueTenant | null>(null)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [renegotiateDialogOpen, setRenegotiateDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)

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

      {/* Tabela */}
    <div className="rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-slate-100/50">
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
    </>
  )
}
