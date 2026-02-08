// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - VaccinationsView (Vacinação)
// ──────────────────────────────────────────────────────────────────────────────

import { VaccinationList } from '@/components/vaccinations/VaccinationList'
import type { MedicalViewProps } from '../types'

export function VaccinationsView({ residentId, residentName }: MedicalViewProps) {
  return <VaccinationList residentId={residentId} residentName={residentName} />
}
