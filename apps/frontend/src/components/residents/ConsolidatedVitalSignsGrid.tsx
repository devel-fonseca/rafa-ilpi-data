import type { ConsolidatedVitalSigns } from '@/hooks/useConsolidatedVitalSigns'
import { formatDateTimeShortSafe } from '@/utils/dateHelpers'

interface ConsolidatedVitalSignsGridProps {
  consolidatedVitalSigns: ConsolidatedVitalSigns
  includeBloodType?: boolean
  bloodTypeLabel?: string
  gridClassName?: string
}

interface VitalMetricCardProps {
  label: string
  value: string
  timestamp?: string
}

function VitalMetricCard({ label, value, timestamp }: VitalMetricCardProps) {
  return (
    <div className="text-center p-2 bg-muted/50 rounded-lg">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="font-medium text-sm">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {timestamp ? formatDateTimeShortSafe(timestamp) : '--'}
      </div>
    </div>
  )
}

export function ConsolidatedVitalSignsGrid({
  consolidatedVitalSigns,
  includeBloodType = false,
  bloodTypeLabel,
  gridClassName = 'grid grid-cols-2 md:grid-cols-3 gap-3',
}: ConsolidatedVitalSignsGridProps) {
  return (
    <div className={gridClassName}>
      {includeBloodType && (
        <div className="text-center bg-primary/5 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground mb-0.5">Tipo</p>
          <p className="text-sm font-bold text-primary">{bloodTypeLabel || 'Não informado'}</p>
        </div>
      )}

      <VitalMetricCard
        label="PA"
        value={
          consolidatedVitalSigns.bloodPressure
            ? `${consolidatedVitalSigns.bloodPressure.systolic}/${consolidatedVitalSigns.bloodPressure.diastolic}`
            : '-'
        }
        timestamp={consolidatedVitalSigns.bloodPressure?.timestamp}
      />

      <VitalMetricCard
        label="FC"
        value={
          consolidatedVitalSigns.heartRate
            ? `${consolidatedVitalSigns.heartRate.value} bpm`
            : '-'
        }
        timestamp={consolidatedVitalSigns.heartRate?.timestamp}
      />

      <VitalMetricCard
        label="SpO₂"
        value={
          consolidatedVitalSigns.oxygenSaturation
            ? `${consolidatedVitalSigns.oxygenSaturation.value} %`
            : '-'
        }
        timestamp={consolidatedVitalSigns.oxygenSaturation?.timestamp}
      />

      <VitalMetricCard
        label="Temp"
        value={
          consolidatedVitalSigns.temperature
            ? `${consolidatedVitalSigns.temperature.value} °C`
            : '-'
        }
        timestamp={consolidatedVitalSigns.temperature?.timestamp}
      />

      <VitalMetricCard
        label="Glicemia"
        value={
          consolidatedVitalSigns.bloodGlucose
            ? `${consolidatedVitalSigns.bloodGlucose.value} mg/dL`
            : '-'
        }
        timestamp={consolidatedVitalSigns.bloodGlucose?.timestamp}
      />
    </div>
  )
}
