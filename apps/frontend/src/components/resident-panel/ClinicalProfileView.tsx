// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ClinicalProfileView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/design-system/components'
import { ClipboardList } from 'lucide-react'
import { InfoCard } from './InfoCard'
import type { ClinicalProfile } from '@/api/clinical-profiles.api'
import type { Resident } from '@/api/residents.api'

interface ClinicalProfileViewProps {
  clinicalProfile: ClinicalProfile | null | undefined
  resident: Resident
}

export function ClinicalProfileView({ clinicalProfile, resident }: ClinicalProfileViewProps) {
  const hasAnyData =
    clinicalProfile?.healthStatus || clinicalProfile?.specialNeeds || clinicalProfile?.functionalAspects

  if (!hasAnyData) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Perfil clínico não preenchido"
        description="Nenhuma informação clínica cadastrada para este residente"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Estado de Saúde */}
      <InfoCard
        label="Estado de Saúde"
        value={
          clinicalProfile?.healthStatus || (
            <span className="text-muted-foreground italic">Não informado</span>
          )
        }
      />

      {/* Necessidades Especiais */}
      <InfoCard
        label="Necessidades Especiais"
        value={
          clinicalProfile?.specialNeeds || (
            <span className="text-muted-foreground italic">Não informado</span>
          )
        }
      />

      {/* Aspectos Funcionais */}
      <InfoCard
        label="Aspectos Funcionais"
        value={
          <div className="space-y-2">
            {resident.mobilityAid !== null && resident.mobilityAid !== undefined && (
              <Badge
                variant={resident.mobilityAid ? 'default' : 'secondary'}
                className={resident.mobilityAid ? 'bg-primary/60 text-white' : 'text-xs'}
              >
                {resident.mobilityAid ? '♿ Auxílio Mobilidade' : '✓ Independente'}
              </Badge>
            )}
            <div>
              {clinicalProfile?.functionalAspects || (
                <span className="text-muted-foreground italic">Não informado</span>
              )}
            </div>
          </div>
        }
      />
    </div>
  )
}
