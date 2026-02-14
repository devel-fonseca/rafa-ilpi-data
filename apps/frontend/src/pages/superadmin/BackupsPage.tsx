import { useMemo, useState } from 'react'
import { Database, Download, Loader2, Plus, RefreshCw, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  useBackups,
  useCreateFullBackup,
  useRestoreFullBackup,
  useRestoreTenantBackup,
} from '@/hooks/useSuperAdmin'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { api } from '@/services/api'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function BackupsPage() {
  const { toast } = useToast()
  const [scopeFilter, setScopeFilter] = useState<'all' | 'full' | 'tenant'>('all')
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { data, isLoading, isError, error, refetch, isFetching } = useBackups(100, {
    scope: scopeFilter,
  })
  const createMutation = useCreateFullBackup()
  const restoreMutation = useRestoreFullBackup()
  const restoreTenantMutation = useRestoreTenantBackup()

  const filteredBackups = useMemo(() => {
    if (!data?.data) return []

    const now = Date.now()
    const periodMsMap: Record<'7d' | '30d' | '90d', number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    }
    const search = searchTerm.trim().toLowerCase()

    return data.data.filter((backup) => {
      if (periodFilter !== 'all') {
        const ageMs = now - new Date(backup.createdAt).getTime()
        if (ageMs > periodMsMap[periodFilter]) {
          return false
        }
      }

      if (!search) return true

      return (
        backup.id.toLowerCase().includes(search) ||
        backup.fileName.toLowerCase().includes(search) ||
        (backup.tenantName || '').toLowerCase().includes(search) ||
        (backup.tenantId || '').toLowerCase().includes(search)
      )
    })
  }, [data?.data, periodFilter, searchTerm])

  const handleCreateBackup = async () => {
    try {
      const response = await createMutation.mutateAsync()
      toast({
        title: 'Backup gerado',
        description: response.message,
      })
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Falha ao gerar backup',
        description: errorResponse?.data?.message || 'Não foi possível gerar o backup full',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = async (backupId: string, fileName: string) => {
    try {
      setDownloadingId(backupId)
      const response = await api.get(`/superadmin/backups/${backupId}/download`, {
        responseType: 'blob',
      })

      const fileUrl = URL.createObjectURL(response.data as Blob)
      const anchor = document.createElement('a')
      anchor.href = fileUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(fileUrl)
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Falha no download',
        description: errorResponse?.data?.message || 'Não foi possível baixar o backup',
        variant: 'destructive',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const handleRestore = async (backupId: string) => {
    const confirmed = confirm(
      'Confirma restauração FULL deste backup no banco atual? Esta ação pode interromper o ambiente.',
    )
    if (!confirmed) return

    try {
      setRestoringId(backupId)
      const response = await restoreMutation.mutateAsync(backupId)
      toast({
        title: 'Restore concluído',
        description: `${response.message} (${response.data.durationMs} ms).`,
      })
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Falha no restore',
        description: errorResponse?.data?.message || 'Não foi possível executar o restore full',
        variant: 'destructive',
      })
    } finally {
      setRestoringId(null)
    }
  }

  const handleRestoreTenant = async (backupId: string) => {
    const confirmed = confirm(
      'Confirma restauração do TENANT deste backup? Apenas o schema desse tenant será restaurado.',
    )
    if (!confirmed) return

    try {
      setRestoringId(backupId)
      const response = await restoreTenantMutation.mutateAsync(backupId)
      toast({
        title: 'Restore do tenant concluído',
        description: `${response.message} (${response.data.durationMs} ms).`,
      })
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Falha no restore de tenant',
        description: errorResponse?.data?.message || 'Não foi possível executar o restore do tenant',
        variant: 'destructive',
      })
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Backups</h1>
          <p className="mt-1 text-slate-400">
            Gere e baixe backups full do banco de dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por ID, arquivo ou tenant..."
            className="w-[280px] border-slate-200 bg-white"
          />
          <Select
            value={scopeFilter}
            onValueChange={(value: 'all' | 'full' | 'tenant') => setScopeFilter(value)}
          >
            <SelectTrigger className="w-[170px] border-slate-200 bg-white">
              <SelectValue placeholder="Escopo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="full">Apenas Full</SelectItem>
              <SelectItem value="tenant">Apenas Tenant</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={periodFilter}
            onValueChange={(value: 'all' | '7d' | '30d' | '90d') => setPeriodFilter(value)}
          >
            <SelectTrigger className="w-[150px] border-slate-200 bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Período: Todos</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-slate-200"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
          <Button
            onClick={handleCreateBackup}
            disabled={createMutation.isPending}
            className="bg-success/60 hover:bg-success/70"
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Gerar Backup Full
          </Button>
        </div>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Database className="h-5 w-5" />
            Histórico de Backups
          </CardTitle>
          <p className="text-sm text-slate-500">
            Exibindo {filteredBackups.length} de {data?.data.length || 0} backups.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-slate-400">Carregando backups...</div>
          )}

          {isError && (
            <div className="py-8 text-center text-danger/70">
              Erro ao carregar backups: {error.message}
            </div>
          )}

          {data && filteredBackups.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              Nenhum backup disponível
            </div>
          )}

          {data && filteredBackups.length > 0 && (
            <Table className="min-w-[1180px] table-auto">
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-slate-100/50">
                  <TableHead className="min-w-[240px] text-slate-400">ID</TableHead>
                  <TableHead className="min-w-[95px] text-slate-400">Escopo</TableHead>
                  <TableHead className="min-w-[320px] text-slate-400">Arquivo</TableHead>
                  <TableHead className="min-w-[180px] text-slate-400">Tenant</TableHead>
                  <TableHead className="min-w-[130px] text-slate-400">Gerado em</TableHead>
                  <TableHead className="min-w-[100px] text-right text-slate-400">Tamanho</TableHead>
                  <TableHead className="min-w-[240px] text-right text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBackups.map((backup) => (
                  <TableRow key={backup.id} className="border-slate-200 hover:bg-slate-100/30">
                    <TableCell className="font-mono text-xs text-slate-700">
                      <span className="break-all" title={backup.id}>
                        {backup.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-slate-700">
                        {backup.scope === 'tenant' ? 'Tenant' : 'Full'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-900">
                      <span className="break-all" title={backup.fileName}>
                        {backup.fileName}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      <span className="break-words" title={backup.tenantName || backup.tenantId || '-'}>
                        {backup.tenantName || backup.tenantId || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">
                      {formatDateTimeSafe(backup.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Badge variant="outline" className="text-slate-700">
                        {formatBytes(backup.sizeBytes)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {backup.scope === 'full' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-warning/40 text-warning/95"
                            onClick={() => handleRestore(backup.id)}
                            disabled={restoringId === backup.id}
                          >
                            {restoringId === backup.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Restaurar
                          </Button>
                        )}
                        {backup.scope === 'tenant' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-warning/40 text-warning/95"
                            onClick={() => handleRestoreTenant(backup.id)}
                            disabled={restoringId === backup.id}
                          >
                            {restoringId === backup.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Restaurar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-200"
                          onClick={() => handleDownload(backup.id, backup.fileName)}
                          disabled={downloadingId === backup.id || restoringId === backup.id}
                        >
                          {downloadingId === backup.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
