import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getContractDetails, getContractHistory, type ResidentContract, type ContractHistory } from '@/services/residentContractsApi'
import { useFinancialTransactions } from '@/hooks/useFinancialOperations'
import { tenantKey } from '@/lib/query-keys'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  Wallet,
  ExternalLink,
} from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'

export default function ResidentContractView() {
  const navigate = useNavigate()
  const { residentId, contractId } = useParams()
  const { hasPermission } = usePermissions()

  const canViewContracts = hasPermission(PermissionType.VIEW_CONTRACTS)
  const canViewFinancial = hasPermission(PermissionType.VIEW_FINANCIAL_OPERATIONS)

  // Buscar contrato
  const { data: contract, isLoading, error } = useQuery<ResidentContract>({
    queryKey: tenantKey('resident-contracts', residentId, contractId),
    queryFn: () => getContractDetails(residentId!, contractId!),
    enabled: !!residentId && !!contractId && canViewContracts,
  })

  // Buscar histórico
  const { data: history = [] } = useQuery<ContractHistory[]>({
    queryKey: tenantKey('resident-contracts', residentId, contractId, 'history'),
    queryFn: () => getContractHistory(residentId!, contractId!),
    enabled: !!residentId && !!contractId && canViewContracts,
  })

  // Buscar transações/parcelas vinculadas ao contrato
  const {
    data: contractTransactionsData,
    isLoading: isLoadingContractTransactions,
    error: contractTransactionsError,
  } = useFinancialTransactions({
    residentContractId: contractId,
    limit: 100,
    sortField: 'dueDate',
    sortDirection: 'desc',
  }, { enabled: canViewFinancial && !!contractId })

  // Obter cor do badge de status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'VIGENTE':
        return 'bg-success/10 text-success border-success/30'
      case 'VENCENDO_EM_30_DIAS':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'VENCIDO':
        return 'bg-danger/10 text-danger border-danger/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  // Traduzir status
  const translateStatus = (status: string) => {
    switch (status) {
      case 'VIGENTE':
        return 'Vigente'
      case 'VENCENDO_EM_30_DIAS':
        return 'Vencendo em 30 dias'
      case 'VENCIDO':
        return 'Vencido'
      default:
        return status
    }
  }

  // Traduzir papel do assinante
  const translateRole = (role: string) => {
    switch (role) {
      case 'RESIDENTE':
        return 'Residente'
      case 'RESPONSAVEL_LEGAL':
        return 'Responsável Legal'
      case 'TESTEMUNHA':
        return 'Testemunha'
      case 'ILPI':
        return 'ILPI'
      default:
        return role
    }
  }

  // Traduzir ação do histórico
  const translateAction = (action: string) => {
    switch (action) {
      case 'CREATED':
        return 'Criado'
      case 'UPDATED':
        return 'Atualizado'
      case 'REPLACED':
        return 'Substituído'
      case 'DELETED':
        return 'Deletado'
      default:
        return action
    }
  }

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const translateTransactionStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente'
      case 'PAID':
        return 'Pago'
      case 'OVERDUE':
        return 'Atrasado'
      case 'CANCELLED':
        return 'Cancelado'
      case 'REFUNDED':
        return 'Estornado'
      case 'PARTIALLY_PAID':
        return 'Parcial'
      default:
        return status
    }
  }

  const getTransactionStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-success/10 text-success border-success/30'
      case 'OVERDUE':
        return 'bg-danger/10 text-danger border-danger/30'
      case 'PENDING':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground border-border'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const buildFinancialDeepLink = (transaction: { status: string; dueDate: string }) => {
    const params = new URLSearchParams()
    params.set('tab', 'transactions')
    params.set('residentContractId', contract.id)
    params.set('status', transaction.status)
    const dueDate = transaction.dueDate ? transaction.dueDate.slice(0, 10) : ''
    if (dueDate) {
      params.set('dueDateFrom', dueDate)
      params.set('dueDateTo', dueDate)
    }
    return `/dashboard/financeiro?${params.toString()}`
  }

  const contractTransactions = contractTransactionsData?.items ?? []
  const totalTransactions = contractTransactions.length
  const paidTransactions = contractTransactions.filter((item) => item.status === 'PAID').length
  const pendingTransactions = contractTransactions.filter((item) => item.status === 'PENDING').length
  const overdueTransactions = contractTransactions.filter((item) => item.status === 'OVERDUE').length
  const contractualResponsibles = (contract?.signatories ?? []).filter(
    (signatory) => signatory.role !== 'ILPI' && signatory.role !== 'TESTEMUNHA',
  )

  // Download do PDF processado
  const handleDownloadProcessed = () => {
    if (contract?.processedFileUrl) {
      window.open(contract.processedFileUrl, '_blank')
    }
  }

  if (!canViewContracts) {
    return (
      <Page maxWidth="default">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-2xl font-semibold">Acesso Negado</div>
          <div className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para visualizar contratos.
          </div>
        </div>
      </Page>
    )
  }

  if (isLoading) {
    return (
      <Page maxWidth="default">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Page>
    )
  }

  if (error || !contract) {
    return (
      <Page maxWidth="default">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="h-12 w-12 text-danger" />
          <div className="text-muted-foreground">Contrato não encontrado</div>
          <Button variant="outline" onClick={() => navigate('/dashboard/contratos')}>
            Voltar para a lista
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page maxWidth="default">
      <PageHeader
        title={`Contrato ${contract.contractNumber}`}
        subtitle={`Residente: ${contract.resident?.fullName || 'Não informado'}`}
        backButton={{ onClick: () => navigate('/dashboard/contratos') }}
        actions={
          contract.processedFileUrl ? (
            <Button onClick={handleDownloadProcessed}>
              <Download className="mr-2 h-4 w-4" />
              Ver contrato
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className={`grid w-full ${canViewFinancial ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          {canViewFinancial && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
        </TabsList>

        {/* TAB: Detalhes */}
        <TabsContent value="details" className="space-y-4">
          {/* Status e Vigência */}
          <Card>
            <CardHeader>
              <CardTitle>Status e Vigência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={getStatusBadgeColor(contract.status)}>
                    {translateStatus(contract.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Data de Início</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{formatDateOnlySafe(contract.startDate)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Data de Fim</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{formatDateOnlySafe(contract.endDate)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle>Valores e Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor da Mensalidade</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-semibold">{formatCurrency(Number(contract.monthlyAmount))}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Dia de Vencimento</p>
                  <p className="text-lg font-medium">Dia {contract.dueDay}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Multa por atraso</p>
                  <p className="text-lg font-medium">{Number(contract.lateFeePercent ?? 0).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Juros por atraso</p>
                  <p className="text-lg font-medium">
                    {Number(contract.interestMonthlyPercent ?? 0).toFixed(2)}% a.m.
                  </p>
                </div>
              </div>

              {contract.adjustmentIndex && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Reajuste</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Índice</p>
                      <p className="font-medium">{contract.adjustmentIndex}</p>
                    </div>
                    {contract.adjustmentRate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Taxa</p>
                        <p className="font-medium">{contract.adjustmentRate}%</p>
                      </div>
                    )}
                    {contract.lastAdjustmentDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Último Reajuste</p>
                        <p className="font-medium">{formatDateOnlySafe(contract.lastAdjustmentDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsáveis contratuais */}
          <Card>
            <CardHeader>
              <CardTitle>Responsáveis Contratuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contractualResponsibles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum responsável contratual informado.
                  </p>
                ) : (
                  contractualResponsibles.map((signatory, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{signatory.name}</p>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        <span>{translateRole(signatory.role)}</span>
                        {signatory.cpf && <span>CPF: {signatory.cpf}</span>}
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {contract.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadados */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Cadastro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <span>
                  Cadastrado por: <span className="text-foreground font-medium">{contract.uploader?.name || 'Desconhecido'}</span>
                </span>
                <span className="mx-2">•</span>
                <span>
                  Data: <span className="text-foreground font-medium">{formatDateOnlySafe(contract.createdAt)}</span>
                </span>
                <span className="mx-2">•</span>
                <span>
                  Versão: <span className="text-foreground font-medium">v{contract.version}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Arquivos */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              {contract.processedFileUrl ? (
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <FileText className="h-12 w-12 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">{contract.processedFileName}</p>
                    {typeof contract.processedFileSize === 'number' && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {(contract.processedFileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    <Button onClick={handleDownloadProcessed} size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Ver contrato
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Histórico */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum histórico disponível
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{translateAction(item.action)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateOnlySafe(item.changedAt)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Por: {item.user?.name || 'Desconhecido'}
                        </p>
                        {item.reason && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            Motivo: {item.reason}
                          </p>
                        )}
                        {item.changedFields.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Campos alterados:</p>
                            <div className="flex flex-wrap gap-1">
                              {item.changedFields.map((field) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Financeiro */}
        {canViewFinancial && (
          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico Financeiro do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total de parcelas</p>
                    <p className="text-xl font-semibold">{totalTransactions}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Pagas</p>
                    <p className="text-xl font-semibold text-success">{paidTransactions}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-xl font-semibold text-warning">{pendingTransactions}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Atrasadas</p>
                    <p className="text-xl font-semibold text-danger">{overdueTransactions}</p>
                  </div>
                </div>

                {isLoadingContractTransactions ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : contractTransactionsError ? (
                  <div className="flex items-center gap-2 text-danger py-4">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">Erro ao carregar histórico financeiro deste contrato.</p>
                  </div>
                ) : contractTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Wallet className="h-8 w-8 mb-2" />
                    <p className="text-sm">Nenhuma parcela/transação encontrada para este contrato.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contractTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="grid grid-cols-1 md:grid-cols-7 gap-3 p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground">Competência</p>
                          <p className="font-medium">{formatDateOnlySafe(transaction.competenceMonth)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vencimento</p>
                          <p className="font-medium">{formatDateOnlySafe(transaction.dueDate)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground">Descrição</p>
                          <p className="font-medium">{transaction.description}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valor líquido</p>
                          <p className="font-semibold">
                            {formatCurrency(Number(transaction.netAmount))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge className={getTransactionStatusBadgeColor(transaction.status)}>
                            {translateTransactionStatus(transaction.status)}
                          </Badge>
                        </div>
                        <div className="md:justify-self-end">
                          <p className="text-xs text-muted-foreground">Ações</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(buildFinancialDeepLink(transaction))}
                            className="mt-1"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir no Financeiro
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </Page>
  )
}
