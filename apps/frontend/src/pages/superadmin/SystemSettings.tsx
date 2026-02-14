/* eslint-disable @typescript-eslint/no-explicit-any */
import { Settings, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState } from 'react'
import { api } from '@/services/api'
import { toast } from 'sonner'

/**
 * SystemSettings
 *
 * Página de configurações do sistema para SuperAdmin.
 * Permite executar jobs manualmente para manutenção e testes.
 */
export function SystemSettings() {
  const [loadingJobs, setLoadingJobs] = useState<Record<string, boolean>>({})
  const [jobResults, setJobResults] = useState<Record<string, { success: boolean; message: string }>>({})

  const runJob = async (jobKey: string, endpoint: string, jobName: string) => {
    setLoadingJobs((prev) => ({ ...prev, [jobKey]: true }))
    setJobResults((prev) => ({ ...prev, [jobKey]: undefined }))

    try {
      const response = await api.post(endpoint)

      setJobResults((prev) => ({
        ...prev,
        [jobKey]: {
          success: response.data.success,
          message: response.data.message,
        },
      }))

      if (response.data.success) {
        toast.success(`${jobName} executado com sucesso!`)
      } else {
        toast.error(`Erro ao executar ${jobName}: ${response.data.message}`)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'

      setJobResults((prev) => ({
        ...prev,
        [jobKey]: {
          success: false,
          message: errorMessage,
        },
      }))

      toast.error(`Erro ao executar ${jobName}: ${errorMessage}`)
    } finally {
      setLoadingJobs((prev) => ({ ...prev, [jobKey]: false }))
    }
  }

  const jobs = [
    {
      key: 'trial-alerts',
      name: 'Alertas de Trial Expirando',
      description: 'Envia alertas para trials que estão próximos de expirar (7, 3 e 1 dia antes)',
      endpoint: '/superadmin/jobs/trial-alerts',
      icon: RefreshCw,
    },
    {
      key: 'trial-conversion',
      name: 'Conversão Trial → Active',
      description: 'Converte trials expirados para active, cria subscription no Asaas e gera primeira fatura',
      endpoint: '/superadmin/jobs/trial-conversion',
      icon: RefreshCw,
    },
    {
      key: 'asaas-sync',
      name: 'Sincronização Asaas ↔ Local',
      description: 'Sincroniza status de subscriptions e payments entre Asaas e banco local',
      endpoint: '/superadmin/jobs/asaas-sync',
      icon: RefreshCw,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#059669]" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Configurações do Sistema
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Gerenciamento de jobs e manutenção do sistema
            </p>
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertDescription className="text-amber-800">
          <strong>⚠️ Atenção:</strong> Execute esses jobs manualmente apenas para testes, correção de falhas ou situações emergenciais.
          Todos os jobs possuem execução automática agendada.
        </AlertDescription>
      </Alert>

      {/* Jobs Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {jobs.map((job) => {
          const isLoading = loadingJobs[job.key]
          const result = jobResults[job.key]

          return (
            <Card key={job.key} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{job.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {job.description}
                    </CardDescription>
                  </div>
                  <job.icon className="h-5 w-5 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Result Display */}
                  {result && (
                    <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        )}
                        <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                          {result.message}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}

                  {/* Execute Button */}
                  <Button
                    onClick={() => runJob(job.key, job.endpoint, job.name)}
                    disabled={isLoading}
                    className="w-full bg-[#059669] hover:bg-[#047857] text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Executar Job
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info Section */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">ℹ️ Informações sobre Agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div>
            <strong>Alertas de Trial:</strong> Execução diária às 09:00 BRT
          </div>
          <div>
            <strong>Conversão Trial → Active:</strong> Execução diária às 02:00 BRT
          </div>
          <div>
            <strong>Sincronização Asaas:</strong> Execução a cada 6 horas (00:00, 06:00, 12:00, 18:00 BRT)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
