import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Bed as BedIcon,
  ClipboardList,
  Pill,
  CheckCircle2,
  AlertCircle,
  Droplets,
  Utensils,
  Bath,
  Activity,
  Trash2,
  Smile,
  Moon,
  Weight,
  Dribbble,
  Calendar,
  FileText,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { extractDateOnly } from '@/utils/dateHelpers'
import { useDailyTasksByResident } from '@/hooks/useResidentSchedule'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useBloodType } from '@/hooks/useResidentHealth'
import { useConsolidatedVitalSigns } from '@/hooks/useConsolidatedVitalSigns'
import { BLOOD_TYPE_LABELS } from '@/api/resident-health.api'
import { Check } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────
// ÍCONES POR TIPO DE REGISTRO
// ──────────────────────────────────────────────────────────────────────────

const RECORD_TYPE_CONFIG: Record<
  string,
  { icon: typeof Bath; label: string; color: string }
> = {
  HIGIENE: { icon: Bath, label: 'Higiene', color: 'text-primary' },
  ALIMENTACAO: { icon: Utensils, label: 'Alimentação', color: 'text-success' },
  HIDRATACAO: { icon: Droplets, label: 'Hidratação', color: 'text-cyan-600' },
  MONITORAMENTO: { icon: Activity, label: 'Sinais Vitais', color: 'text-danger' },
  ELIMINACAO: { icon: Trash2, label: 'Eliminação', color: 'text-amber-600' },
  COMPORTAMENTO: { icon: Smile, label: 'Comportamento', color: 'text-medication-controlled' },
  HUMOR: { icon: Smile, label: 'Humor', color: 'text-pink-600' },
  SONO: { icon: Moon, label: 'Sono', color: 'text-indigo-600' },
  PESO: { icon: Weight, label: 'Peso', color: 'text-muted-foreground' },
  INTERCORRENCIA: { icon: AlertTriangle, label: 'Intercorrência', color: 'text-destructive' },
  ATIVIDADES: { icon: Dribbble, label: 'Atividades', color: 'text-teal-600' },
  VISITA: { icon: Calendar, label: 'Visita', color: 'text-violet-600' },
  OUTROS: { icon: FileText, label: 'Outros', color: 'text-muted-foreground' },
}

// ──────────────────────────────────────────────────────────────────────────
// INTERFACES
// ──────────────────────────────────────────────────────────────────────────

interface Allergy {
  id: string
  substance: string
  reaction?: string
  severity?: string
  notes?: string
}

interface DietaryRestriction {
  id: string
  restrictionType: string
  description: string
  notes?: string
}

interface Condition {
  id: string
  condition: string
  icdCode?: string
  notes?: string
}

interface Bed {
  id: string
  code: string
  status: string
}

interface Room {
  id: string
  name: string
  code: string
}

interface Resident {
  id: string
  fullName: string
  socialName?: string | null
  birthDate: string
  gender: string
  fotoUrl?: string | null
  fotoUrlSmall?: string | null
  fotoUrlMedium?: string | null
  allergies?: Allergy[]
  dietaryRestrictions?: DietaryRestriction[]
  conditions?: Condition[]
  hasControlledMedication?: boolean
  bed?: Bed | null
  room?: Room | null
  bloodTypeRecord?: {
    bloodType: string
    source?: string | null
    confirmedAt?: string | null
  } | null
}

interface DailyRecord {
  id: string
  type: string
  date: string
  time: string
  recordedBy: string
}

interface MedicationAdministration {
  id: string
  date: string
  scheduledTime: string
  wasAdministered: boolean
  administeredBy?: string
  actualTime?: string
}

interface Medication {
  id: string
  name: string
  presentation: string
  concentration: string
  dose: string
  route: string
  frequency: string
  scheduledTimes: string[]
  startDate: string
  endDate?: string | null
  isControlled: boolean
  isHighRisk: boolean
  requiresDoubleCheck: boolean
  instructions?: string | null
  administrations?: MedicationAdministration[]
}

interface Prescription {
  id: string
  medications: Medication[]
}

// ──────────────────────────────────────────────────────────────────────────
// PROPS
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  residentId: string
  onClose: () => void
  onRegister?: (recordType: string, mealType?: string) => void
  onAdministerMedication?: (medicationId: string, residentId: string, scheduledTime: string) => void
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ──────────────────────────────────────────────────────────────────────────

export function ResidentQuickViewModal({ residentId, onClose, onRegister, onAdministerMedication }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const today = format(new Date(), 'yyyy-MM-dd')
  const { hasPermission } = usePermissions()
  const canAdministerMedications = hasPermission(PermissionType.ADMINISTER_MEDICATIONS)
  const canViewClinicalProfile = hasPermission(PermissionType.VIEW_CLINICAL_PROFILE)

  // Buscar dados básicos do residente (já retorna bed, room, allergies)
  const { data: resident, isLoading: isLoadingResident } = useQuery<Resident>({
    queryKey: tenantKey('residents', residentId),
    queryFn: async () => {
      const response = await api.get(`/residents/${residentId}`)
      return response.data
    },
  })

  // Buscar últimos 3 registros
  const { data: latestRecords } = useQuery<DailyRecord[]>({
    queryKey: tenantKey('daily-records', 'resident', residentId, 'latest'),
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${residentId}/latest`,
        { params: { limit: 3 } },
      )
      return response.data
    },
  })

  // Buscar tarefas pendentes de hoje
  const { data: todayTasks } = useDailyTasksByResident(residentId, today)

  // Buscar prescrições ativas do residente
  const { data: prescriptionsData } = useQuery<{ data: Prescription[] }>({
    queryKey: tenantKey('prescriptions', 'list', JSON.stringify({ residentId, isActive: 'true' })),
    queryFn: async () => {
      const response = await api.get('/prescriptions', {
        params: {
          residentId,
          isActive: 'true',
          limit: '100', // Limite alto para pegar todas as ativas
        },
      })
      return response.data
    },
  })

  // Extrair todas as medicações de todas as prescrições ativas
  const activeMedications = prescriptionsData?.data?.flatMap(
    (prescription) => prescription.medications || [],
  ) || []

  // Buscar tipo sanguíneo da nova tabela
  const { data: bloodTypeData } = useBloodType(residentId, canViewClinicalProfile)

  // Buscar sinais vitais consolidados
  const { data: consolidatedVitalSigns } = useConsolidatedVitalSigns(residentId)

  // Obter label do tipo sanguíneo da nova tabela
  const effectiveBloodType = bloodTypeData?.bloodType || resident?.bloodTypeRecord?.bloodType
  const bloodTypeLabel = effectiveBloodType
    ? BLOOD_TYPE_LABELS[effectiveBloodType as keyof typeof BLOOD_TYPE_LABELS]
    : 'Não informado'

  // Carregar foto se existir
  useEffect(() => {
    // Backend retorna URLs assinadas diretamente (fotoUrl, fotoUrlSmall, fotoUrlMedium)
    // Priorizar fotoUrlSmall para melhor performance
    const photoToUse = resident?.fotoUrlSmall || resident?.fotoUrlMedium || resident?.fotoUrl

    if (photoToUse) {
      setPhotoUrl(photoToUse)
    }
  }, [resident?.fotoUrl, resident?.fotoUrlSmall, resident?.fotoUrlMedium])

  // Leito e quarto já vêm no objeto resident do backend

  // Calcular idade
  const age = resident
    ? new Date().getFullYear() -
      new Date(extractDateOnly(resident.birthDate) + 'T12:00:00').getFullYear()
    : 0

  // Iniciais do nome
  const initials = resident
    ? resident.fullName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
    : '?'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualização Rápida do Residente</DialogTitle>
        </DialogHeader>

        {isLoadingResident ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header: Foto + Nome + Idade */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="w-16 h-16">
                <AvatarImage src={photoUrl || undefined} />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {resident?.fullName}
                </h3>
                {resident?.socialName && (
                  <p className="text-sm text-muted-foreground italic">
                    Nome social: {resident.socialName}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {age} anos • {resident?.gender === 'MASCULINO' ? 'Masculino' : resident?.gender === 'FEMININO' ? 'Feminino' : 'Outro'}
                </p>

                {resident?.bed && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-foreground">
                    <BedIcon className="w-4 h-4" />
                    <span>Leito: {resident.bed.code}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informações de Saúde */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Informações de Saúde
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Sinais Vitais Consolidados */}
                  {consolidatedVitalSigns && (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Tipo Sanguíneo - Destaque */}
                        <div className="text-center bg-primary/5 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Tipo</p>
                          <p className="text-sm font-bold text-primary">
                            {bloodTypeLabel}
                          </p>
                        </div>

                        {/* PA */}
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">PA</p>
                          {consolidatedVitalSigns.bloodPressure ? (
                            <>
                              <p className="text-sm font-semibold">
                                {consolidatedVitalSigns.bloodPressure.systolic}/
                                {consolidatedVitalSigns.bloodPressure.diastolic}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(consolidatedVitalSigns.bloodPressure.timestamp), 'dd/MM HH:mm')}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">--</p>
                          )}
                        </div>

                        {/* Glicemia */}
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Glicemia</p>
                          {consolidatedVitalSigns.bloodGlucose ? (
                            <>
                              <p className="text-sm font-semibold">
                                {consolidatedVitalSigns.bloodGlucose.value}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(consolidatedVitalSigns.bloodGlucose.timestamp), 'dd/MM HH:mm')}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">--</p>
                          )}
                        </div>

                        {/* Temperatura */}
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Temp</p>
                          {consolidatedVitalSigns.temperature ? (
                            <>
                              <p className="text-sm font-semibold">
                                {consolidatedVitalSigns.temperature.value}°
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(consolidatedVitalSigns.temperature.timestamp), 'dd/MM HH:mm')}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">--</p>
                          )}
                        </div>

                        {/* SpO2 */}
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">SpO2</p>
                          {consolidatedVitalSigns.oxygenSaturation ? (
                            <>
                              <p className="text-sm font-semibold">
                                {consolidatedVitalSigns.oxygenSaturation.value}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(consolidatedVitalSigns.oxygenSaturation.timestamp), 'dd/MM HH:mm')}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">--</p>
                          )}
                        </div>

                        {/* FC */}
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">FC</p>
                          {consolidatedVitalSigns.heartRate ? (
                            <>
                              <p className="text-sm font-semibold">
                                {consolidatedVitalSigns.heartRate.value}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(consolidatedVitalSigns.heartRate.timestamp), 'dd/MM HH:mm')}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">--</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alergias */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Alergias
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {resident?.allergies && resident.allergies.length > 0 ? (
                        resident.allergies.map((allergy) => (
                          <Badge
                            key={allergy.id}
                            variant="destructive"
                            className="gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {allergy.substance}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem alergias registradas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Condições Crônicas */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Condições Crônicas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {resident?.conditions &&
                      resident.conditions.length > 0 ? (
                        resident.conditions.map((condition) => (
                          <Badge
                            key={condition.id}
                            variant="secondary"
                          >
                            {condition.condition}
                            {condition.icdCode && ` (${condition.icdCode})`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem condições crônicas registradas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Restrições Alimentares */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Restrições Alimentares
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {resident?.dietaryRestrictions &&
                      resident.dietaryRestrictions.length > 0 ? (
                        resident.dietaryRestrictions.map((restriction) => (
                          <Badge
                            key={restriction.id}
                            variant="secondary"
                          >
                            {restriction.description}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem restrições alimentares registradas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Medicamentos em Uso */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Medicamentos em Uso
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeMedications.length > 0 ? (
                        activeMedications.map((medication) => (
                          <Badge
                            key={medication.id}
                            variant={medication.isControlled ? 'default' : 'outline'}
                            className="gap-1"
                          >
                            {medication.isControlled && (
                              <Pill className="w-3 h-3" />
                            )}
                            {medication.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem medicamentos em uso
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Últimos Registros */}
            {latestRecords && latestRecords.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    Últimos Registros
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {latestRecords.length} registro{latestRecords.length !== 1 ? 's' : ''} mais recente{latestRecords.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {latestRecords.map((record) => {
                      const config = RECORD_TYPE_CONFIG[record.type || 'OUTROS'] || RECORD_TYPE_CONFIG.OUTROS
                      const Icon = config.icon

                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card transition-colors"
                        >
                          {/* Icon */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {config.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {record.recordedBy}
                            </p>
                          </div>

                          {/* Date/Time */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-medium text-muted-foreground">
                              {format(new Date(extractDateOnly(record.date) + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.time}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Registros AVDs Pendentes Hoje */}
            {todayTasks && todayTasks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Registros AVDs Pendentes Hoje
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {todayTasks.filter((t) => t.type === 'RECURRING' && !t.isCompleted).length} pendentes
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {todayTasks
                      .filter((task) => task.type === 'RECURRING' && !task.isCompleted)
                      .sort((a, b) => {
                        // Ordenar por horário (scheduledTime tem prioridade sobre suggestedTimes)
                        const timeA = a.scheduledTime || a.suggestedTimes?.[0] || '23:59'
                        const timeB = b.scheduledTime || b.suggestedTimes?.[0] || '23:59'
                        return timeA.localeCompare(timeB)
                      })
                      .map((task, index) => {
                        const config = RECORD_TYPE_CONFIG[task.recordType || 'OUTROS'] || RECORD_TYPE_CONFIG.OUTROS
                        const Icon = config.icon

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:border-primary transition-colors"
                          >
                            {/* Icon + Time */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                              </div>
                              {(task.scheduledTime || (task.suggestedTimes && task.suggestedTimes.length > 0)) && (
                                <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
                                  {task.scheduledTime || task.suggestedTimes?.[0]}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {config.label}
                                {task.mealType && ` - ${task.mealType}`}
                              </span>
                            </div>

                            {/* Actions */}
                            {onRegister && (
                              <Button
                                size="sm"
                                onClick={() => onRegister(task.recordType!, task.mealType)}
                              >
                                Registrar
                              </Button>
                            )}
                          </div>
                        )
                      })}

                    {todayTasks.filter((t) => t.type === 'RECURRING' && !t.isCompleted).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm">Todas as tarefas concluídas!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medicações Agendadas Hoje */}
            {activeMedications.length > 0 && (() => {
              // Preparar lista de todos os horários de medicação de hoje
              const allMedicationSchedules = activeMedications.flatMap((medication) =>
                (medication.scheduledTimes || []).map((scheduledTime) => {
                  // Verificar se já foi administrado hoje neste horário
                  const todayAdmin = medication.administrations?.find(
                    (admin) =>
                      extractDateOnly(admin.date) === today &&
                      admin.scheduledTime === scheduledTime
                  )

                  return {
                    medication,
                    scheduledTime,
                    wasAdministered: todayAdmin?.wasAdministered || false,
                    administeredBy: todayAdmin?.administeredBy,
                    actualTime: todayAdmin?.actualTime,
                  }
                })
              )

              // Separar pendentes e administrados
              const pendingMeds = allMedicationSchedules.filter(m => !m.wasAdministered)
              const administeredMeds = allMedicationSchedules.filter(m => m.wasAdministered)

              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" />
                      Medicações Agendadas Hoje
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pendingMeds.length} pendentes • {administeredMeds.length} administradas
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* Medicações Pendentes - Estilo similar a Tarefas Pendentes */}
                      {pendingMeds.map((item, index) => (
                        <div
                          key={`pending-${item.medication.id}-${item.scheduledTime}-${index}`}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:border-primary transition-colors"
                        >
                          {/* Icon + Time */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                              <Pill className={`w-4 h-4 ${item.medication.isControlled ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
                              {item.scheduledTime}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {item.medication.name}
                              </span>
                              {item.medication.isControlled && (
                                <Badge variant="default" className="text-xs">
                                  Controlado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.medication.dose} • {item.medication.route}
                            </p>
                          </div>

                          {/* Actions */}
                          {canAdministerMedications && onAdministerMedication && (
                            <Button
                              size="sm"
                              onClick={() => onAdministerMedication(item.medication.id, residentId, item.scheduledTime)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Administrar
                            </Button>
                          )}
                        </div>
                      ))}

                      {/* Medicações Administradas - Estilo similar a Últimos Registros */}
                      {administeredMeds.map((item, index) => (
                        <div
                          key={`administered-${item.medication.id}-${item.scheduledTime}-${index}`}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-card transition-colors"
                        >
                          {/* Icon */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {item.medication.name}
                              </span>
                              {item.medication.isControlled && (
                                <Badge variant="outline" className="text-xs">
                                  Controlado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.administeredBy || 'Administrado'}
                            </p>
                          </div>

                          {/* Time */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-medium text-muted-foreground">
                              {item.actualTime || item.scheduledTime}
                            </p>
                            {item.actualTime && item.actualTime !== item.scheduledTime && (
                              <p className="text-xs text-muted-foreground">
                                (agendado {item.scheduledTime})
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {allMedicationSchedules.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <Pill className="w-8 h-8 mx-auto mb-2 text-muted" />
                          <p className="text-sm">Nenhuma medicação agendada para hoje</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
