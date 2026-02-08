// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - ScheduleView (Agenda do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { ResidentScheduleTab } from '@/components/resident-schedule/ResidentScheduleTab'
import type { MedicalViewProps } from '../types'

export function ScheduleView({ residentId, residentName }: MedicalViewProps) {
  return <ResidentScheduleTab residentId={residentId} residentName={residentName} />
}
