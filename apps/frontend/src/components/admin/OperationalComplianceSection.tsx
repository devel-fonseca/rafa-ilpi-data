import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Pill, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ComplianceStats {
  activeResidents: number
  medications: {
    scheduled: number
    administered: number
    total: number
  }
  mandatoryRecords: {
    expected: number
    completed: number
  }
}

interface Props {
  stats?: ComplianceStats
  isLoading?: boolean
}

export function OperationalComplianceSection({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Situação Operacional – Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const medicationsPercentage = stats.medications.total > 0
    ? Math.round((stats.medications.administered / stats.medications.total) * 100)
    : 0

  const recordsPercentage = stats.mandatoryRecords.expected > 0
    ? Math.round((stats.mandatoryRecords.completed / stats.mandatoryRecords.expected) * 100)
    : 0

  const isMedicationsComplete = medicationsPercentage === 100
  const isRecordsComplete = recordsPercentage === 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Situação Operacional – Hoje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Residentes Ativos */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Residentes ativos</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.activeResidents}
              </p>
            </div>
          </div>

          {/* Medicamentos */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Medicamentos</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Programados:
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {stats.medications.scheduled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Aplicados:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {isMedicationsComplete ? '100%' : `${medicationsPercentage}%`}
                    </span>
                    {isMedicationsComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registros Obrigatórios */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Registros obrigatórios
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Esperados:
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {stats.mandatoryRecords.expected}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Realizados:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {isRecordsComplete
                        ? `${stats.mandatoryRecords.completed} / ${stats.mandatoryRecords.expected}`
                        : `${stats.mandatoryRecords.completed} / ${stats.mandatoryRecords.expected} (${recordsPercentage}%)`
                      }
                    </span>
                    {isRecordsComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
