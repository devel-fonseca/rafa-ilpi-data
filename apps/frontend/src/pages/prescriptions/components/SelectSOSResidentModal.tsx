import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, subHours } from 'date-fns'
import { Pill, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import type { SOSMedication } from '@/api/prescriptions.api'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import {
  buildUTCFromLocalComponents,
  extractDateOnly,
  formatDateSafe,
  getCurrentDate,
  normalizeUTCDate,
} from '@/utils/dateHelpers'
import { toast } from 'sonner'

interface SelectSOSResidentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSOSMedication: (sosMedication: SOSMedication) => void
}

interface ResidentSOSOption {
  residentId: string
  residentName: string
  sosMedications: SOSMedication[]
}

interface ResidentAdministrationItem {
  id?: string
  type?: string
  date: string | Date
  actualTime?: string | null
  time?: string | null
  sosMedicationId?: string
}

const SOS_INDICATION_LABELS: Record<string, string> = {
  DOR: 'Dor',
  FEBRE: 'Febre',
  ANSIEDADE: 'Ansiedade',
  AGITACAO: 'Agitação',
  NAUSEA: 'Náusea',
  INSONIA: 'Insônia',
  OUTRO: 'Outro',
}

function normalizeDetail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseSOSMinIntervalToMinutes(minInterval: string): number {
  const normalized = minInterval.trim().toLowerCase()
  if (!normalized) return 0

  const hhmmMatch = normalized.match(/^(\d{1,2}):([0-5]\d)$/)
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10)
    const minutes = parseInt(hhmmMatch[2], 10)
    return hours * 60 + minutes
  }

  const numberMatch = normalized.match(/(\d+(?:[.,]\d+)?)/)
  if (!numberMatch) return 0

  const numericValue = Number.parseFloat(numberMatch[1].replace(',', '.'))
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0

  if (normalized.includes('min')) return Math.round(numericValue)
  return Math.round(numericValue * 60)
}

function formatMinutesLabel(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.ceil(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

export function SelectSOSResidentModal({
  open,
  onOpenChange,
  onSelectSOSMedication,
}: SelectSOSResidentModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)

  const { prescriptions, isLoading } = usePrescriptions({
    page: 1,
    limit: 200,
    isActive: true,
  })

  const residentsWithSOS = useMemo<ResidentSOSOption[]>(() => {
    const groupedResidents = new Map<string, ResidentSOSOption>()

    prescriptions.forEach((prescription) => {
      const sosMedications = prescription.sosMedications || []
      if (sosMedications.length === 0) return

      const residentId = prescription.resident?.id || prescription.residentId
      const residentName = prescription.resident?.fullName || 'Residente sem nome'

      if (!groupedResidents.has(residentId)) {
        groupedResidents.set(residentId, {
          residentId,
          residentName,
          sosMedications: [],
        })
      }

      const currentResident = groupedResidents.get(residentId)
      if (!currentResident) return

      sosMedications.forEach((sos) => {
        if (!currentResident.sosMedications.some((existing) => existing.id === sos.id)) {
          currentResident.sosMedications.push(sos)
        }
      })
    })

    return Array.from(groupedResidents.values()).sort((a, b) =>
      a.residentName.localeCompare(b.residentName),
    )
  }, [prescriptions])

  const filteredResidents = useMemo(() => {
    if (!searchTerm.trim()) return residentsWithSOS

    const normalizedSearch = searchTerm.toLowerCase().trim()
    return residentsWithSOS.filter((resident) => {
      const residentMatches = resident.residentName.toLowerCase().includes(normalizedSearch)
      const medicationMatches = resident.sosMedications.some((sos) =>
        `${sos.name} ${sos.concentration || ''}`.toLowerCase().includes(normalizedSearch),
      )
      return residentMatches || medicationMatches
    })
  }, [residentsWithSOS, searchTerm])

  const selectedResident = useMemo(() => {
    if (!selectedResidentId) return null
    return filteredResidents.find((resident) => resident.residentId === selectedResidentId) || null
  }, [filteredResidents, selectedResidentId])

  const today = getCurrentDate()
  const yesterday = format(subDays(normalizeUTCDate(today), 1), 'yyyy-MM-dd')

  const {
    data: residentAdministrations = [],
    isLoading: isLoadingResidentAdministrations,
    isError: hasResidentAdministrationsError,
  } = useQuery<ResidentAdministrationItem[]>({
    queryKey: tenantKey(
      'medication-administrations',
      'resident',
      'sos-last-24h',
      selectedResidentId || 'none',
      today,
    ),
    queryFn: async () => {
      if (!selectedResidentId) return []

      const [todayResponse, yesterdayResponse] = await Promise.all([
        api.get(
          `/prescriptions/medication-administrations/resident/${selectedResidentId}/date/${today}`,
        ),
        api.get(
          `/prescriptions/medication-administrations/resident/${selectedResidentId}/date/${yesterday}`,
        ),
      ])

      const todayData = Array.isArray(todayResponse.data) ? todayResponse.data : []
      const yesterdayData = Array.isArray(yesterdayResponse.data) ? yesterdayResponse.data : []
      const mergedData = [...todayData, ...yesterdayData] as ResidentAdministrationItem[]

      // Evita duplicidade quando um mesmo registro é retornado nas duas datas.
      const uniqueByAdministration = new Map<string, ResidentAdministrationItem>()
      mergedData.forEach((administration) => {
        const administrationDate = extractDateOnly(administration.date)
        const administrationTime =
          normalizeDetail(administration.actualTime) || normalizeDetail(administration.time) || ''
        const fallbackKey = [
          administration.type || '',
          administration.sosMedicationId || '',
          administrationDate,
          administrationTime,
        ].join('|')
        const uniqueKey = administration.id || fallbackKey

        if (!uniqueByAdministration.has(uniqueKey)) {
          uniqueByAdministration.set(uniqueKey, administration)
        }
      })

      return Array.from(uniqueByAdministration.values())
    },
    enabled: open && !!selectedResidentId,
    staleTime: 30 * 1000,
  })

  const sosDosesLast24hByMedication = useMemo(() => {
    const dosesByMedication = new Map<string, Array<{ occurredAt: Date; label: string }>>()
    const now = new Date()
    const cutoff = subHours(now, 24)

    residentAdministrations.forEach((administration) => {
      if (administration.type !== 'SOS' || !administration.sosMedicationId) return

      const administrationTime =
        normalizeDetail(administration.actualTime) || normalizeDetail(administration.time)
      if (!administrationTime) return

      const administrationDate = extractDateOnly(administration.date)
      const administrationDateTime = new Date(
        buildUTCFromLocalComponents(administrationDate, administrationTime),
      )
      if (Number.isNaN(administrationDateTime.getTime())) return
      if (administrationDateTime < cutoff || administrationDateTime > now) return

      const currentDoses = dosesByMedication.get(administration.sosMedicationId) || []
      currentDoses.push({
        occurredAt: administrationDateTime,
        label: formatDateSafe(administrationDateTime, 'dd/MM HH:mm'),
      })
      dosesByMedication.set(administration.sosMedicationId, currentDoses)
    })

    dosesByMedication.forEach((doses, medicationId) => {
      doses.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      dosesByMedication.set(medicationId, doses)
    })

    return dosesByMedication
  }, [residentAdministrations])

  const dosesTodayByMedication = useMemo(() => {
    const todayCountByMedication = new Map<string, number>()

    residentAdministrations.forEach((administration) => {
      if (administration.type !== 'SOS' || !administration.sosMedicationId) return
      const administrationDate = extractDateOnly(administration.date)
      if (administrationDate !== today) return

      const currentCount = todayCountByMedication.get(administration.sosMedicationId) || 0
      todayCountByMedication.set(administration.sosMedicationId, currentCount + 1)
    })

    return todayCountByMedication
  }, [residentAdministrations, today])

  const canOpenAdministrationModal = (sosMedication: SOSMedication): boolean => {
    if (isLoadingResidentAdministrations) {
      toast.info('Aguarde o carregamento das administrações para validar os limites')
      return false
    }

    if (hasResidentAdministrationsError) {
      toast.error('Não foi possível validar os limites de administração')
      return false
    }

    const dosesToday = dosesTodayByMedication.get(sosMedication.id) || 0
    if (
      typeof sosMedication.maxDailyDoses === 'number' &&
      sosMedication.maxDailyDoses > 0 &&
      dosesToday >= sosMedication.maxDailyDoses
    ) {
      toast.error(`Limite diário de ${sosMedication.maxDailyDoses} doses já atingido`)
      return false
    }

    const minIntervalMinutes = parseSOSMinIntervalToMinutes(sosMedication.minInterval)
    if (minIntervalMinutes > 0) {
      const dosesLast24h = sosDosesLast24hByMedication.get(sosMedication.id) || []
      const lastDose = dosesLast24h[dosesLast24h.length - 1]

      if (lastDose) {
        const elapsedMinutes = Math.floor((new Date().getTime() - lastDose.occurredAt.getTime()) / (1000 * 60))

        if (elapsedMinutes < minIntervalMinutes) {
          const remainingMinutes = minIntervalMinutes - Math.max(elapsedMinutes, 0)
          toast.error(
            `Intervalo mínimo de ${sosMedication.minInterval} não respeitado. Aguarde ${formatMinutesLabel(remainingMinutes)}.`,
          )
          return false
        }
      }
    }

    return true
  }

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedResidentId(null)
      return
    }

    const hasSelectedResident = !!selectedResidentId &&
      filteredResidents.some((resident) => resident.residentId === selectedResidentId)

    if (!hasSelectedResident && filteredResidents.length > 0) {
      setSelectedResidentId(filteredResidents[0].residentId)
    }
  }, [open, filteredResidents, selectedResidentId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Residente para Medicação SOS</DialogTitle>
          <DialogDescription>
            Escolha o residente com prescrição SOS cadastrada e, em seguida, a medicação a ser administrada.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar residente ou medicação SOS..."
          />
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Nenhum residente com medicação SOS encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="border rounded-lg p-3 overflow-y-auto">
              <p className="text-sm font-medium text-foreground mb-3">Residentes</p>
              <div className="space-y-2">
                {filteredResidents.map((resident) => (
                  <button
                    key={resident.residentId}
                    type="button"
                    onClick={() => setSelectedResidentId(resident.residentId)}
                    className={`w-full text-left rounded-md border p-3 transition-colors ${
                      selectedResidentId === resident.residentId
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{resident.residentName}</p>
                      </div>
                      <Badge variant="outline">
                        {resident.sosMedications.length} SOS
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-3 overflow-y-auto">
              <p className="text-sm font-medium text-foreground mb-3">
                Medicações SOS {selectedResident ? `de ${selectedResident.residentName}` : ''}
              </p>

              {!selectedResident ? (
                <p className="text-sm text-muted-foreground">
                  Selecione um residente para visualizar as medicações SOS.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedResident.sosMedications.map((sosMedication) => {
                    const dosesLast24h = sosDosesLast24hByMedication.get(sosMedication.id) || []

                    return (
                    <div key={sosMedication.id} className="rounded-md border border-border p-3 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {[sosMedication.name, normalizeDetail(sosMedication.concentration)]
                              .filter(Boolean)
                              .join(' ')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {[
                              `Indicação: ${normalizeDetail(sosMedication.indicationDetails) || SOS_INDICATION_LABELS[sosMedication.indication] || sosMedication.indication}`,
                              normalizeDetail(sosMedication.dose),
                              normalizeDetail(sosMedication.route),
                            ]
                              .filter(Boolean)
                              .join(' • ') || 'Detalhes não informados'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {normalizeDetail(sosMedication.minInterval) && (
                              <Badge variant="outline" className="text-xs">
                                Intervalo: {sosMedication.minInterval}
                              </Badge>
                            )}
                            {typeof sosMedication.maxDailyDoses === 'number' && sosMedication.maxDailyDoses > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Máx/dia: {sosMedication.maxDailyDoses}x
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2">
                            {isLoadingResidentAdministrations ? (
                              <p className="text-xs text-muted-foreground">
                                Últimas 24h: carregando doses...
                              </p>
                            ) : hasResidentAdministrationsError ? (
                              <p className="text-xs text-muted-foreground">
                                Últimas 24h: não foi possível carregar
                              </p>
                            ) : dosesLast24h.length > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Últimas 24h ({dosesLast24h.length}):{' '}
                                {dosesLast24h.map((dose) => dose.label).join(' • ')}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Últimas 24h: nenhuma dose administrada
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            if (!canOpenAdministrationModal(sosMedication)) {
                              return
                            }
                            onSelectSOSMedication(sosMedication)
                            onOpenChange(false)
                          }}
                        >
                          <Pill className="h-4 w-4 mr-1" />
                          Administrar
                        </Button>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
