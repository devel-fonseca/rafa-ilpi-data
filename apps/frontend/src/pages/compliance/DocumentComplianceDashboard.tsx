import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useComplianceDashboard, useProfile, useDocuments } from '@/hooks/useInstitutionalProfile'
import {
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Upload,
  TrendingUp,
  AlertCircle,
  FolderOpen,
  Eye,
} from 'lucide-react'
import { formatDate, formatLegalNature } from '@/utils/formatters'
import { Page, PageHeader, StatCard } from '@/design-system/components'
import { useNavigate } from 'react-router-dom'
import { DocumentUploadModal } from '@/pages/institutional-profile/DocumentUploadModal'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'

/**
 * Mapeamento de cores para os status
 */
const statusColors = {
  OK: 'text-success',
  VENCENDO: 'text-warning',
  VENCIDO: 'text-danger',
  PENDENTE: 'text-muted-foreground',
}

/**
 * Mapeamento de ícones para os status
 */
const statusIcons = {
  OK: CheckCircle,
  VENCENDO: AlertTriangle,
  VENCIDO: XCircle,
  PENDENTE: Clock,
}

/**
 * Página: Dashboard de Conformidade de Documentos
 * Acessível via: Conformidade > Documentos da Instituição > Ver Documentos
 */
export default function DocumentComplianceDashboard() {
  const navigate = useNavigate()
  const { data: fullProfile } = useProfile()
  const { data: dashboard, isLoading } = useComplianceDashboard()

  // Buscar todos os documentos enviados
  const { data: allDocuments = [] } = useDocuments()

  // Estado para controlar o modal de upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | undefined>(undefined)

  // Estado para controlar o modal de visualização
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>('')
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('Documento')

  /**
   * Handler para abrir modal com tipo de documento pré-selecionado
   */
  const handleOpenUploadModal = (documentType: string) => {
    setSelectedDocumentType(documentType)
    setIsUploadModalOpen(true)
  }

  /**
   * Handler para visualizar documento
   */
  const handleViewDocument = (fileUrl: string, title: string) => {
    setSelectedDocumentUrl(fileUrl)
    setSelectedDocumentTitle(title)
    setDocumentViewerOpen(true)
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Dashboard de Conformidade de Documentos"
          subtitle="Visão geral do status dos documentos institucionais"
        />
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </Page>
    )
  }

  if (!dashboard) {
    return (
      <Page>
        <PageHeader
          title="Dashboard de Conformidade de Documentos"
          subtitle="Visão geral do status dos documentos institucionais"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Dados de compliance indisponíveis</p>
            <p className="text-sm text-muted-foreground mt-2">
              Não foi possível carregar os dados de compliance. Tente novamente.
            </p>
          </CardContent>
        </Card>
      </Page>
    )
  }

  const {
    totalDocuments,
    okDocuments,
    expiringDocuments,
    expiredDocuments,
    pendingDocuments,
    requiredDocuments,
    alerts,
    compliancePercentage,
  } = dashboard

  return (
    <Page>
      <PageHeader
        title="Dashboard de Conformidade de Documentos"
        subtitle="Visão geral do status dos documentos institucionais"
        breadcrumbs={[
          { label: 'Hub de Conformidade', href: '/dashboard/conformidade' },
          { label: 'Documentos da Instituição' },
        ]}
        actions={
          <Button
            onClick={() => navigate('/dashboard/conformidade/documentos/gestao')}
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Gestão de Documentos
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Alertas Críticos */}
        {alerts.length > 0 && (
          <Alert variant="destructive" className="border-danger/50 bg-danger/5">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Atenção: Documentos que requerem ação</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="text-sm">
                Você possui {expiredDocuments} documento(s) vencido(s) e {expiringDocuments} documento(s) vencendo em breve.
              </p>
              <div className="mt-3 space-y-2">
                {alerts.slice(0, 3).map((alert) => {
                  const StatusIcon = statusIcons[alert.status]
                  return (
                    <div
                      key={alert.id}
                      className="flex items-center gap-2 text-sm bg-background/50 rounded-md px-3 py-2"
                    >
                      <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColors[alert.status]}`} />
                      <span className="font-medium">{alert.typeLabel}</span>
                      {alert.expiresAt && (
                        <span className="text-muted-foreground">- Vencimento: {formatDate(alert.expiresAt)}</span>
                      )}
                    </div>
                  )
                })}
                {alerts.length > 3 && (
                  <p className="text-xs text-muted-foreground italic">
                    + {alerts.length - 3} outro(s) documento(s) requerem atenção
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total de Documentos"
            value={totalDocuments}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Documentos OK"
            value={okDocuments}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Vencendo"
            value={expiringDocuments}
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="Vencidos"
            value={expiredDocuments}
            icon={XCircle}
            variant="danger"
          />
          <StatCard
            title="Pendentes"
            value={pendingDocuments}
            icon={Clock}
            variant="secondary"
          />
        </div>

        {/* Progresso de Compliance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progresso de Compliance
                </CardTitle>
                <CardDescription className="mt-1">
                  Percentual de documentos obrigatórios enviados
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{compliancePercentage}%</p>
                <p className="text-sm text-muted-foreground">
                  {requiredDocuments.filter((d) => d.uploaded).length} de {requiredDocuments.length} tipos de documento
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={compliancePercentage} className="h-3" />
            {compliancePercentage === 100 ? (
              <Alert className="mt-4 border-success/50 bg-success/5">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Parabéns! Todos os documentos obrigatórios foram enviados.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">
                Envie os documentos pendentes para alcançar 100% de compliance.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lista de Documentos Obrigatórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Obrigatórios
              {fullProfile?.profile?.legalNature && (
                <Badge variant="secondary" className="ml-2">
                  {formatLegalNature(fullProfile.profile.legalNature)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Documentos exigidos pela legislação para a natureza jurídica da instituição
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!fullProfile?.profile?.legalNature ? (
              <Alert className="border-warning/50 bg-warning/5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  Configure a natureza jurídica em "Perfil Institucional" para ver os documentos obrigatórios específicos
                  da sua instituição.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {requiredDocuments.map((doc) => {
                  const isUploaded = doc.uploaded
                  const Icon = isUploaded ? CheckCircle : AlertTriangle

                  // Buscar o documento enviado (se houver)
                  const uploadedDocument = isUploaded
                    ? allDocuments.find(d => d.type === doc.type)
                    : null

                  return (
                    <div
                      key={doc.type}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isUploaded
                          ? 'border-success/30 bg-success/5'
                          : 'border-warning/30 bg-warning/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isUploaded ? 'bg-success/10' : 'bg-warning/10'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isUploaded ? 'text-success' : 'text-warning'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{doc.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {isUploaded ? 'Documento enviado' : 'Pendente de envio'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUploaded && uploadedDocument && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handleViewDocument(uploadedDocument.fileUrl, doc.label)}
                          >
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </Button>
                        )}
                        {!isUploaded && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handleOpenUploadModal(doc.type)}
                          >
                            <Upload className="h-4 w-4" />
                            Enviar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mensagem de Sucesso Total */}
        {compliancePercentage === 100 && alerts.length === 0 && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Compliance 100%</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                Parabéns! Sua instituição está em total conformidade com os requisitos documentais.
                Todos os documentos obrigatórios foram enviados e estão válidos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Upload de Documento */}
      <DocumentUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        defaultType={selectedDocumentType}
      />

      {/* Modal de Visualização de Documento */}
      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        documentUrl={selectedDocumentUrl}
        documentTitle={selectedDocumentTitle}
        documentType="auto"
      />
    </Page>
  )
}
