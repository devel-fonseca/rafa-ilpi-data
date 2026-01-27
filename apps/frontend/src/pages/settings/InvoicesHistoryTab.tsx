import { useState } from 'react'
import { useTenantInvoices } from '@/hooks/useBilling'
import { Loader2, ExternalLink, QrCode as QrCodeIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PixPaymentDisplay } from '@/components/billing/PixPaymentDisplay'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  OPEN: { label: 'Pendente', variant: 'secondary' },
  PAID: { label: 'Pago', variant: 'default' },
  VOID: { label: 'Cancelado', variant: 'destructive' },
  UNCOLLECTIBLE: { label: 'Incobrável', variant: 'destructive' },
}

export function InvoicesHistoryTab() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const { data, isLoading } = useTenantInvoices({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 50,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const invoices = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Histórico de Faturas</h2>
          <p className="text-sm text-muted-foreground">
            Visualize e gerencie suas faturas
          </p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="OPEN">Pendentes</SelectItem>
            <SelectItem value="PAID">Pagas</SelectItem>
            <SelectItem value="VOID">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {invoices.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma fatura encontrada
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-accent/50">
                    <TableHead className="text-muted-foreground">Número</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Plano</TableHead>
                    <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                    <TableHead className="text-muted-foreground">Vencimento</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: { id: string; status: string; dueDate: string; [key: string]: unknown }) => {
                    const statusInfo = STATUS_LABELS[invoice.status] || {
                      label: invoice.status,
                      variant: 'outline' as const,
                    }

                    const isOverdue =
                      invoice.status === 'OPEN' &&
                      new Date(invoice.dueDate) < new Date()

                    return (
                      <TableRow
                        key={invoice.id}
                        className="border-border hover:bg-accent/30"
                      >
                        <TableCell>
                          <div className="font-mono text-xs text-foreground">
                            {invoice.invoiceNumber}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={statusInfo.variant} className="w-fit text-xs">
                              {statusInfo.label}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="w-fit text-xs">
                                Vencida
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-foreground">
                            {invoice.subscription?.plan?.displayName || 'N/A'}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <span className="text-foreground font-medium text-sm">
                            R$ {Number(invoice.amount).toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-foreground">
                            {new Date(invoice.dueDate).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* Botão PIX se houver dados PIX */}
                            {invoice.asaasPixPayload && invoice.status === 'OPEN' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-[#059669] text-[#059669] hover:bg-[#059669] hover:text-white"
                                  >
                                    <QrCodeIcon className="h-4 w-4 mr-1" />
                                    Pagar com PIX
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Pagamento via PIX</DialogTitle>
                                    <DialogDescription>
                                      Escaneie o QR Code ou copie o código abaixo
                                    </DialogDescription>
                                  </DialogHeader>
                                  <PixPaymentDisplay
                                    pixPayload={invoice.asaasPixPayload}
                                    pixQrCodeId={invoice.asaasPixQrCodeId}
                                    amount={Number(invoice.amount)}
                                    dueDate={invoice.dueDate}
                                  />
                                </DialogContent>
                              </Dialog>
                            )}

                            {/* Botão Ver no Asaas (sempre disponível se tiver URL) */}
                            {invoice.paymentUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary hover:bg-accent"
                                onClick={() => window.open(invoice.paymentUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Ver no Asaas
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
