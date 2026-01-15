import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getContractDetails, getContractHistory, type ResidentContract, type ContractHistory } from '@/services/residentContractsApi'
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
  Shield,
  Clock,
  Hash,
  CheckCircle2,
} from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { toast } from 'sonner'

export default function ResidentContractView() {
  const navigate = useNavigate()
  const { residentId, contractId } = useParams()
  const { hasPermission } = usePermissions()

  const canViewContracts = hasPermission(PermissionType.VIEW_CONTRACTS)

  // Buscar contrato
  const { data: contract, isLoading, error } = useQuery<ResidentContract>({
    queryKey: ['contract', residentId, contractId],
    queryFn: () => getContractDetails(residentId!, contractId!),
    enabled: !!residentId && !!contractId && canViewContracts,
  })

  // Buscar histórico
  const { data: history = [] } = useQuery<ContractHistory[]>({
    queryKey: ['contract-history', residentId, contractId],
    queryFn: () => getContractHistory(residentId!, contractId!),
    enabled: !!residentId && !!contractId && canViewContracts,
  })

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

  // Download do PDF processado
  const handleDownloadProcessed = () => {
    if (contract?.processedFileUrl) {
      window.open(contract.processedFileUrl, '_blank')
    }
  }

  // Download do arquivo original
  const handleDownloadOriginal = () => {
    if (contract?.originalFileUrl) {
      window.open(contract.originalFileUrl, '_blank')
    }
  }

  // Copiar hash para validação
  const handleCopyHash = () => {
    if (contract?.processedFileHash) {
      navigator.clipboard.writeText(contract.processedFileHash)
      toast.success('Hash copiado para a área de transferência!')
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
        subtitle={`Residente: ${contract.resident?.fullName || 'Nome não disponível'}`}
        backButton={{ onClick: () => navigate('/dashboard/contratos') }}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadOriginal}>
              <Download className="mr-2 h-4 w-4" />
              Original
            </Button>
            <Button onClick={handleDownloadProcessed}>
              <Download className="mr-2 h-4 w-4" />
              PDF Processado
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Assinantes */}
          <Card>
            <CardHeader>
              <CardTitle>Assinantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(contract.signatories as any[]).map((signatory, index) => (
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
                ))}
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
              <CardTitle>Informações de Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Upload por</p>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{contract.uploader?.name || 'Desconhecido'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Data de Upload</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{formatDateOnlySafe(contract.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Versão</p>
                  <p className="font-medium">v{contract.version}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Arquivos */}
        <TabsContent value="files" className="space-y-4">
          {/* Arquivo Processado */}
          <Card>
            <CardHeader>
              <CardTitle>PDF Processado com Carimbo Institucional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <FileText className="h-12 w-12 text-primary" />
                <div className="flex-1">
                  <p className="font-medium mb-1">{contract.processedFileName}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {(contract.processedFileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button onClick={handleDownloadProcessed} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF Processado
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Hash SHA-256 para Validação</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono">
                    {contract.processedFileHash}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyHash}>
                    <Hash className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Este hash pode ser usado para validar a autenticidade do documento
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Arquivo Original */}
          <Card>
            <CardHeader>
              <CardTitle>Arquivo Original</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium mb-1">{contract.originalFileName}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {(contract.originalFileSize / 1024 / 1024).toFixed(2)} MB • {contract.originalFileMimeType}
                  </p>
                  <Button onClick={handleDownloadOriginal} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Original
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-2">Hash SHA-256 (Original)</p>
                <code className="block text-xs bg-muted p-2 rounded font-mono">
                  {contract.originalFileHash}
                </code>
              </div>
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
      </Tabs>
    </Page>
  )
}
