// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - ClinicalProfileView (Perfil Clínico)
// ──────────────────────────────────────────────────────────────────────────────

import { ClinicalProfileTab } from '@/components/clinical-data/ClinicalProfileTab'
import type { MedicalViewProps } from '../types'

export function ClinicalProfileView({ residentId }: MedicalViewProps) {
  return <ClinicalProfileTab residentId={residentId} />
}
