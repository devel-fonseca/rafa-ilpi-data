import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AlertStatus } from '@/api/vitalSignAlerts.api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertTriangle,
  Activity,
  Thermometer,
  Heart,
  Droplet,
  TrendingUp,
  FileText,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react'
import { useUpdateAlert, canManageVitalSignAlerts } from '@/hooks/useVitalSignAlerts'
import { useAuthStore } from '@/stores/auth.store'
import type { VitalSignAlert } from '@/api/vitalSignAlerts.api'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { CreateEvolutionFromAlertDialog } from './CreateEvolutionFromAlertDialog'
import { AlertHistoryTimeline } from './AlertHistoryTimeline'

interface ManageAlertDialogProps {
  alert: VitalSignAlert | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ManageAlertFormData {
  status: AlertStatus
  assignedTo?: string
  medicalNotes?: string
  actionTaken?: string
}

export function ManageAlertDialog({
  alert,
  open,
  onOpenChange,
}: ManageAlertDialogProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const updateAlertMutation = useUpdateAlert()
  const [showCreateEvolution, setShowCreateEvolution] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { control, register, handleSubmit, reset, watch } =
    useForm<ManageAlertFormData>({
      defaultValues: {
        status: alert?.status || AlertStatus.ACTIVE,
        assignedTo: alert?.assignedTo || undefined,
        medicalNotes: alert?.medicalNotes || '',
        actionTaken: alert?.actionTaken || '',
      },
    })

  const currentStatus = watch('status')

  // Atualizar formulário quando alerta mudar
  useEffect(() => {
    if (alert) {
      reset({
        status: alert.status,
        assignedTo: alert.assignedTo || undefined,
        medicalNotes: alert.medicalNotes || '',
        actionTaken: alert.actionTaken || '',
      })
    }
  }, [alert, reset])

  const onSubmit = async (data: ManageAlertFormData) => {
    if (!alert) return

    try {
      await updateAlertMutation.mutateAsync({
        id: alert.id,
        data: {
          status: data.status,
          assignedTo: data.assignedTo,
          medicalNotes: data.medicalNotes || undefined,
          actionTaken: data.actionTaken || undefined,
        },
      })
      onOpenChange(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleCreateEvolution = () => {
    setShowCreateEvolution(true)
  }

  const handleEvolutionSuccess = async () => {
    // Salvar as alterações do alerta (se houver mudanças)
    const currentValues = watch()
    const hasChanges =
      currentValues.status !== alert?.status ||
      currentValues.assignedTo !== alert?.assignedTo ||
      currentValues.medicalNotes !== alert?.medicalNotes ||
      currentValues.actionTaken !== alert?.actionTaken

    if (hasChanges && alert) {
      try {
        await updateAlertMutation.mutateAsync({
          id: alert.id,
          data: {
            status: currentValues.status,
            assignedTo: currentValues.assignedTo || undefined,
            medicalNotes: currentValues.medicalNotes || undefined,
            actionTaken: currentValues.actionTaken || undefined,
          },
        })
      } catch (error) {
        // Error handled by mutation, but don't block navigation
      }
    }

    // Fechar todos os modais
    setShowCreateEvolution(false)
    onOpenChange(false)

    // Navegar para a aba de evoluções clínicas do residente
    if (alert?.residentId) {
      navigate(`/dashboard/residentes/${alert.residentId}?tab=evolucoes`)
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'PRESSURE_HIGH':
      case 'PRESSURE_LOW':
        return <Activity className="h-5 w-5" />
      case 'TEMPERATURE_HIGH':
      case 'TEMPERATURE_LOW':
        return <Thermometer className="h-5 w-5" />
      case 'HEART_RATE_HIGH':
      case 'HEART_RATE_LOW':
        return <Heart className="h-5 w-5" />
      case 'OXYGEN_LOW':
        return <Droplet className="h-5 w-5" />
      case 'GLUCOSE_HIGH':
      case 'GLUCOSE_LOW':
        return <TrendingUp className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <Badge variant="destructive" className="ml-2">
            CRÍTICO
          </Badge>
        )
      case 'WARNING':
        return (
          <Badge variant="warning" className="ml-2">
            ATENÇÃO
          </Badge>
        )
      case 'INFO':
        return (
          <Badge variant="secondary" className="ml-2">
            INFO
          </Badge>
        )
      default:
        return null
    }
  }

  const getStatusLabel = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.ACTIVE:
        return 'Ativo'
      case AlertStatus.IN_TREATMENT:
        return 'Em Tratamento'
      case AlertStatus.MONITORING:
        return 'Monitorando'
      case AlertStatus.RESOLVED:
        return 'Resolvido'
      case AlertStatus.IGNORED:
        return 'Ignorado'
      default:
        return status
    }
  }

  if (!alert) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getAlertIcon(alert.type)}
              Gerenciar Alerta Médico
            </DialogTitle>
            <DialogDescription>
              Atualize o status, atribua responsável e documente ações tomadas
              para este alerta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações do Alerta */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg flex items-center">
                    {alert.title}
                    {getSeverityBadge(alert.severity)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {alert.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {alert.value}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDateTimeSafe(alert.createdAt)}
                </div>
              </div>

              {alert.resident && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{alert.resident.fullName}</span>
                  {alert.resident.bedId && (
                    <Badge variant="secondary" className="text-xs">
                      Leito {alert.resident.bedId}
                    </Badge>
                  )}
                </div>
              )}

              {alert.assignedUser && (
                <div className="text-sm text-muted-foreground">
                  <strong>Atribuído para:</strong> {alert.assignedUser.name}
                  {alert.assignedUser.profile?.positionCode && (
                    <span> ({alert.assignedUser.profile.positionCode})</span>
                  )}
                </div>
              )}

              {alert.vitalSign && (
                <div className="mt-2 pt-2 border-t text-xs space-y-1">
                  <p className="font-medium">Sinais Vitais Registrados:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {alert.vitalSign.systolicBloodPressure && (
                      <span>
                        PA:{' '}
                        {alert.vitalSign.systolicBloodPressure}/
                        {alert.vitalSign.diastolicBloodPressure} mmHg
                      </span>
                    )}
                    {alert.vitalSign.heartRate && (
                      <span>FC: {alert.vitalSign.heartRate} bpm</span>
                    )}
                    {alert.vitalSign.temperature && (
                      <span>Tax: {alert.vitalSign.temperature}°C</span>
                    )}
                    {alert.vitalSign.oxygenSaturation && (
                      <span>SpO₂: {alert.vitalSign.oxygenSaturation}%</span>
                    )}
                    {alert.vitalSign.bloodGlucose && (
                      <span>Glicemia: {alert.vitalSign.bloodGlucose} mg/dL</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Formulário de Gerenciamento */}
            <div className="space-y-4">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status do Alerta</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AlertStatus.ACTIVE}>
                          {getStatusLabel(AlertStatus.ACTIVE)}
                        </SelectItem>
                        <SelectItem value={AlertStatus.IN_TREATMENT}>
                          {getStatusLabel(AlertStatus.IN_TREATMENT)}
                        </SelectItem>
                        <SelectItem value={AlertStatus.MONITORING}>
                          {getStatusLabel(AlertStatus.MONITORING)}
                        </SelectItem>
                        <SelectItem value={AlertStatus.RESOLVED}>
                          {getStatusLabel(AlertStatus.RESOLVED)}
                        </SelectItem>
                        <SelectItem value={AlertStatus.IGNORED}>
                          {getStatusLabel(AlertStatus.IGNORED)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {currentStatus === AlertStatus.ACTIVE &&
                    'Aguardando conduta médica ou de enfermagem'}
                  {currentStatus === AlertStatus.IN_TREATMENT &&
                    'Conduta já iniciada ou evolução criada'}
                  {currentStatus === AlertStatus.MONITORING &&
                    'Sob monitoramento contínuo'}
                  {currentStatus === AlertStatus.RESOLVED &&
                    'Situação normalizada e resolvida'}
                  {currentStatus === AlertStatus.IGNORED &&
                    'Alerta desconsiderado (justifique nas notas)'}
                </p>
              </div>

              {/* Atribuir para */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Atribuir Para (Opcional)</Label>
                <Controller
                  name="assignedTo"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? undefined : value)
                      }
                    >
                      <SelectTrigger id="assignedTo">
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não atribuído</SelectItem>
                        <SelectItem value={user?.id || ''}>
                          Atribuir para mim ({user?.name})
                        </SelectItem>
                        {/* TODO: Adicionar lista de profissionais do tenant */}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Profissional responsável por acompanhar este alerta
                </p>
              </div>

              {/* Notas Médicas */}
              <div className="space-y-2">
                <Label htmlFor="medicalNotes">Notas Médicas</Label>
                <Textarea
                  id="medicalNotes"
                  {...register('medicalNotes')}
                  placeholder="Documentação clínica sobre o alerta, observações, hipóteses diagnósticas..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Observações clínicas importantes sobre este alerta
                </p>
              </div>

              {/* Ações Tomadas */}
              <div className="space-y-2">
                <Label htmlFor="actionTaken">Ações Tomadas</Label>
                <Textarea
                  id="actionTaken"
                  {...register('actionTaken')}
                  placeholder="Condutas aplicadas, medicamentos administrados, orientações dadas..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Documentar condutas médicas ou de enfermagem realizadas
                </p>
              </div>
            </div>

            {/* Evoluções Clínicas Vinculadas */}
            {alert.clinicalNotes && alert.clinicalNotes.length > 0 && (
              <div className="space-y-2 p-3 bg-primary/5 dark:bg-primary/95 rounded-lg border border-primary/30 dark:border-primary/80">
                <div className="flex items-center gap-2 text-sm font-medium text-primary/95 dark:text-primary/10">
                  <FileText className="h-4 w-4" />
                  Evoluções Clínicas Vinculadas ({alert.clinicalNotes.length})
                </div>
                <div className="space-y-1">
                  {alert.clinicalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="text-xs text-primary/90"
                    >
                      • {note.profession} -{' '}
                      {formatDateTimeSafe(note.noteDate)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de Alterações */}
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span>Histórico de Alterações</span>
                  </div>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <AlertHistoryTimeline alertId={alert.id} />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>

              {canManageVitalSignAlerts(user) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCreateEvolution}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Criar Evolução
                </Button>
              )}

              <Button
                type="submit"
                disabled={updateAlertMutation.isPending}
              >
                {updateAlertMutation.isPending
                  ? 'Salvando...'
                  : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação de Evolução */}
      {alert && (
        <CreateEvolutionFromAlertDialog
          alert={alert}
          open={showCreateEvolution}
          onOpenChange={setShowCreateEvolution}
          onSuccess={handleEvolutionSuccess}
        />
      )}
    </>
  )
}
