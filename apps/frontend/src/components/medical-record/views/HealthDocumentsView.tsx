// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - HealthDocumentsView (Documentos de Saúde)
// ──────────────────────────────────────────────────────────────────────────────

import { HealthDocumentsTab } from '@/components/medical-record/HealthDocumentsTab'
import type { MedicalViewProps } from '../types'

export function HealthDocumentsView({ residentId }: MedicalViewProps) {
  return <HealthDocumentsTab residentId={residentId} />
}
