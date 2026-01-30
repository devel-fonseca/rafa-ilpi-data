import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DailyRecord } from '@/api/dailyRecords.api'
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels'

interface DailyRecordsTimelineProps {
  records: DailyRecord[]
  onRecordClick?: (record: DailyRecord) => void
}

// Converter hora "HH:MM" para porcentagem do dia (0-100%)
const timeToPercentage = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  return (totalMinutes / 1440) * 100 // 1440 minutos em 24h
}

export function DailyRecordsTimeline({ records, onRecordClick }: DailyRecordsTimelineProps) {
  const timelineData = useMemo(() => {
    return records.map((record) => ({
      id: record.id,
      percentage: timeToPercentage(record.time),
      time: record.time,
      label: RECORD_TYPE_LABELS[record.type]?.label || record.type,
      color: RECORD_TYPE_LABELS[record.type]?.chartColor || '#94a3b8',
      record,
    }))
  }, [records])

  if (records.length === 0) {
    return null
  }

  return (
    <div className="bg-muted/50 rounded-lg p-6 mb-4">
      {/* Marcadores de hora */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>

      {/* Linha do tempo */}
      <div className="relative h-2 bg-muted rounded-full">
        {/* Linha principal */}
        <div className="absolute inset-0 bg-gradient-to-r from-muted-foreground/20 via-muted-foreground/30 to-muted-foreground/20 rounded-full" />

        {/* Marcadores de 6h */}
        {[25, 50, 75].map((position) => (
          <div
            key={position}
            className="absolute top-0 h-2 w-0.5 bg-muted-foreground/40"
            style={{ left: `${position}%` }}
          />
        ))}

        {/* Bolinhas dos registros */}
        <TooltipProvider>
          {timelineData.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRecordClick?.(item.record)}
                  className="absolute -top-2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-background shadow-md transition-all hover:scale-125 hover:shadow-lg hover:z-10 cursor-pointer"
                  style={{
                    left: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-semibold">{item.time}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  )
}
