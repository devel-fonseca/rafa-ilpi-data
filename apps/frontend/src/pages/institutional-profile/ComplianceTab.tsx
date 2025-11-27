import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useComplianceDashboard, useProfile } from '@/hooks/useInstitutionalProfile'
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
} from 'lucide-react'
import { formatDate } from '@/utils/formatters'
import type { DocumentStatus } from '@/api/institutional-profile.api'

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
 * Componente de card de estatística
 */
interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  bgColor: string
}

function StatCard({ title, value, icon: Icon, iconColor, bgColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`h-12 w-12 rounded-full ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Componente principal da aba de Compliance
 */
export function ComplianceTab() {
  const { data: profile } = useProfile()
  const { data: dashboard, isLoading } = useComplianceDashboard()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!dashboard) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-gray-900">Dados de compliance indisponíveis</p>
          <p className="text-sm text-muted-foreground mt-2">
            Não foi possível carregar os dados de compliance. Tente novamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  const {
    totalDocuments,
    okDocuments,
    expiringDocuments,
    expiredDocuments,
    pendingDocuments,
    requiredDocuments,
    missingDocuments,
    alerts,
    compliancePercentage,
  } = dashboard

  return (
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
          iconColor="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          title="Documentos OK"
          value={okDocuments}
          icon={CheckCircle}
          iconColor="text-success"
          bgColor="bg-success/10"
        />
        <StatCard
          title="Vencendo"
          value={expiringDocuments}
          icon={AlertTriangle}
          iconColor="text-warning"
          bgColor="bg-warning/10"
        />
        <StatCard
          title="Vencidos"
          value={expiredDocuments}
          icon={XCircle}
          iconColor="text-danger"
          bgColor="bg-danger/10"
        />
        <StatCard
          title="Pendentes"
          value={pendingDocuments}
          icon={Clock}
          iconColor="text-muted-foreground"
          bgColor="bg-muted"
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
                {requiredDocuments.filter((d) => d.uploaded).length} de {requiredDocuments.length} documentos
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
            {profile?.legalNature && (
              <Badge variant="secondary" className="ml-2">
                {profile.legalNature}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="mt-1">
            Documentos exigidos pela legislação para a natureza jurídica da instituição
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!profile?.legalNature ? (
            <Alert className="border-warning/50 bg-warning/5">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                Configure a natureza jurídica na aba "Dados Básicos" para ver os documentos obrigatórios específicos
                da sua instituição.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {requiredDocuments.map((doc) => {
                const isUploaded = doc.uploaded
                const Icon = isUploaded ? CheckCircle : XCircle

                return (
                  <div
                    key={doc.type}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isUploaded
                        ? 'border-success/30 bg-success/5'
                        : 'border-muted bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isUploaded ? 'bg-success/10' : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isUploaded ? 'text-success' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {isUploaded ? 'Documento enviado' : 'Pendente de envio'}
                        </p>
                      </div>
                    </div>
                    {!isUploaded && (
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Enviar
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentos Pendentes (Faltantes) */}
      {missingDocuments.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Documentos Faltantes ({missingDocuments.length})
            </CardTitle>
            <CardDescription className="mt-1">
              Estes documentos são obrigatórios e ainda não foram enviados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingDocuments.map((doc) => (
                <div
                  key={doc.type}
                  className="flex items-center justify-between p-3 bg-warning/5 border border-warning/30 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                    <span className="text-sm font-medium">{doc.label}</span>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Enviar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de Sucesso Total */}
      {compliancePercentage === 100 && alerts.length === 0 && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Compliance 100%</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Parabéns! Sua instituição está em total conformidade com os requisitos documentais.
              Todos os documentos obrigatórios foram enviados e estão válidos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
