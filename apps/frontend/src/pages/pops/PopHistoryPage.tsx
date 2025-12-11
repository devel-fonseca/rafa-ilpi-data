import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  History,
  GitBranch,
  FileText,
  Eye,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import {
  usePop,
  usePopVersions,
  usePopHistory,
} from '../../hooks/usePops'
import {
  PopActionLabels,
  PopStatusLabels,
  PopStatusColors,
  type PopVersion,
} from '../../types/pop.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PopHistoryPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { data: pop, isLoading: isLoadingPop } = usePop(id)
  const { data: versions, isLoading: isLoadingVersions } =
    usePopVersions(id)
  const { data: history, isLoading: isLoadingHistory } = usePopHistory(id)

  const [selectedTab, setSelectedTab] = useState('versions')

  if (isLoadingPop || isLoadingVersions || isLoadingHistory) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <History className="mx-auto h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    )
  }

  if (!pop) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">POP não encontrado</h3>
          <Button className="mt-4" onClick={() => navigate('/dashboard/pops')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/pops/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">
                Histórico do POP
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">{pop.title}</p>
              <span>•</span>
              <Badge variant={PopStatusColors[pop.status]}>
                {PopStatusLabels[pop.status]}
              </Badge>
              <span>•</span>
              <span className="text-sm text-muted-foreground">
                Versão {pop.version}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Versões ({versions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Auditoria ({history?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Versions Tab */}
        <TabsContent value="versions" className="mt-6">
          {!versions || versions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Nenhuma versão anterior encontrada
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {versions.map((version: PopVersion, index: number) => {
                const isCurrentVersion = version.id === id
                const isMostRecent = index === 0

                return (
                  <Card
                    key={version.id}
                    className={isCurrentVersion ? 'border-primary' : ''}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <GitBranch className="h-5 w-5" />
                            Versão {version.version}
                            {isMostRecent && (
                              <Badge variant="outline">Mais Recente</Badge>
                            )}
                            {isCurrentVersion && (
                              <Badge>Visualizando</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {version.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={PopStatusColors[version.status]}>
                            {PopStatusLabels[version.status]}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/pops/${version.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Criado em{' '}
                          {format(new Date(version.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                        {version.publishedAt && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Publicado em{' '}
                            {format(
                              new Date(version.publishedAt),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="mt-6">
          {!history || history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Nenhum registro de auditoria encontrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <Card key={record.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-4 w-4" />
                          {PopActionLabels[record.action]}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          {record.changedByName}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(record.changedAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Reason */}
                    {record.reason && (
                      <div>
                        <p className="text-sm font-medium">Motivo:</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {record.reason}
                        </p>
                      </div>
                    )}

                    {/* Changed Fields */}
                    {record.changedFields && record.changedFields.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Campos Alterados:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {record.changedFields.map((field) => (
                            <Badge key={field} variant="secondary">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Changes (if available) */}
                    {(record.previousData || record.newData) && (
                      <>
                        <Separator />
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Previous Data */}
                          {record.previousData && (
                            <div>
                              <p className="text-sm font-medium">Dados Anteriores:</p>
                              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                                {JSON.stringify(record.previousData, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* New Data */}
                          {record.newData && (
                            <div>
                              <p className="text-sm font-medium">Novos Dados:</p>
                              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                                {JSON.stringify(record.newData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
