import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Pill, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">📊</span>
            Situação Operacional – Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
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

  const isMedicationsComplete = medicationsPercentage === 100 && stats.medications.total > 0
  const isRecordsComplete = recordsPercentage === 100 && stats.mandatoryRecords.expected > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">📊</span>
          Situação Operacional – Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Residentes Ativos */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-4 border border-primary/30 dark:border-primary/80">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/60 dark:bg-primary">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-primary/80 dark:text-primary/30 uppercase tracking-wide">
                  Residentes ativos
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold text-primary/95 dark:text-primary/10">
                {stats.activeResidents}
              </p>
            </div>
          </div>

          {/* Card: Medicamentos */}
          <div className={cn(
            "rounded-lg p-4 border",
            isMedicationsComplete
              ? "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-success/30 dark:border-success/80"
              : "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-severity-warning/30 dark:border-severity-warning/80"
          )}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                isMedicationsComplete
                  ? "bg-success/60 dark:bg-success"
                  : "bg-severity-warning/60 dark:bg-severity-warning"
              )}>
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isMedicationsComplete
                    ? "text-success/80 dark:text-success/30"
                    : "text-severity-warning/80 dark:text-severity-warning/30"
                )}>
                  Medicamentos
                </p>
              </div>
              {isMedicationsComplete ? (
                <CheckCircle2 className="w-5 h-5 text-success dark:text-success/40" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-severity-warning dark:text-severity-warning/40" />
              )}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className={cn(
                  "text-xs font-medium",
                  isMedicationsComplete
                    ? "text-success/80/80 dark:text-success/30/80"
                    : "text-severity-warning/80/80 dark:text-severity-warning/30/80"
                )}>
                  Programados:
                </span>
                <span className={cn(
                  "text-sm font-semibold",
                  isMedicationsComplete
                    ? "text-success/95 dark:text-success/10"
                    : "text-severity-warning/90 dark:text-severity-warning/10"
                )}>
                  {stats.medications.scheduled}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={cn(
                  "text-xs font-medium",
                  isMedicationsComplete
                    ? "text-success/80/80 dark:text-success/30/80"
                    : "text-severity-warning/80/80 dark:text-severity-warning/30/80"
                )}>
                  Aplicados:
                </span>
                <span className={cn(
                  "text-xl font-bold",
                  isMedicationsComplete
                    ? "text-success/95 dark:text-success/10"
                    : "text-severity-warning/90 dark:text-severity-warning/10"
                )}>
                  {isMedicationsComplete ? '100%' : `${medicationsPercentage}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Registros Obrigatórios */}
          <div className={cn(
            "rounded-lg p-4 border",
            isRecordsComplete
              ? "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-success/30 dark:border-success/80"
              : "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-severity-warning/30 dark:border-severity-warning/80"
          )}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                isRecordsComplete
                  ? "bg-success/60 dark:bg-success"
                  : "bg-severity-warning/60 dark:bg-severity-warning"
              )}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isRecordsComplete
                    ? "text-success/80 dark:text-success/30"
                    : "text-severity-warning/80 dark:text-severity-warning/30"
                )}>
                  Registros obrigatórios
                </p>
              </div>
              {isRecordsComplete ? (
                <CheckCircle2 className="w-5 h-5 text-success dark:text-success/40" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-severity-warning dark:text-severity-warning/40" />
              )}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className={cn(
                  "text-xs font-medium",
                  isRecordsComplete
                    ? "text-success/80/80 dark:text-success/30/80"
                    : "text-severity-warning/80/80 dark:text-severity-warning/30/80"
                )}>
                  Esperados:
                </span>
                <span className={cn(
                  "text-sm font-semibold",
                  isRecordsComplete
                    ? "text-success/95 dark:text-success/10"
                    : "text-severity-warning/90 dark:text-severity-warning/10"
                )}>
                  {stats.mandatoryRecords.expected}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={cn(
                  "text-xs font-medium",
                  isRecordsComplete
                    ? "text-success/80/80 dark:text-success/30/80"
                    : "text-severity-warning/80/80 dark:text-severity-warning/30/80"
                )}>
                  Realizados:
                </span>
                <span className={cn(
                  "text-xl font-bold",
                  isRecordsComplete
                    ? "text-success/95 dark:text-success/10"
                    : "text-severity-warning/90 dark:text-severity-warning/10"
                )}>
                  {isRecordsComplete
                    ? `${stats.mandatoryRecords.completed} / ${stats.mandatoryRecords.expected}`
                    : `${stats.mandatoryRecords.completed} / ${stats.mandatoryRecords.expected} (${recordsPercentage}%)`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
