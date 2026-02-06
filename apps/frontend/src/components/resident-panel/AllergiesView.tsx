// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AllergiesView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/design-system/components'
import { ShieldAlert } from 'lucide-react'
import { InfoCard } from './InfoCard'
import type { Allergy } from '@/api/allergies.api'

// ========== CONSTANTS ==========

const ALLERGY_SEVERITY_LABELS: Record<string, { label: string; style: string }> = {
  LEVE: { label: 'Leve', style: 'border-muted-foreground text-muted-foreground' },
  MODERADA: { label: 'Moderada', style: 'border-warning text-warning' },
  GRAVE: { label: 'Grave', style: 'border-danger text-danger' },
  ANAFILAXIA: { label: 'Anafilaxia', style: 'border-danger text-danger bg-danger/10' },
}

// ========== COMPONENT ==========

interface AllergiesViewProps {
  allergies: Allergy[]
}

export function AllergiesView({ allergies }: AllergiesViewProps) {
  if (!allergies || allergies.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Nenhuma alergia cadastrada"
        description="Este residente não possui alergias registradas"
        variant="success"
      />
    )
  }

  return (
    <div className="space-y-4">
      {allergies.map((allergy) => (
        <InfoCard
          key={allergy.id}
          label={allergy.substance}
          value={
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {allergy.severity && (
                  <Badge
                    variant="outline"
                    className={ALLERGY_SEVERITY_LABELS[allergy.severity]?.style || ''}
                  >
                    {ALLERGY_SEVERITY_LABELS[allergy.severity]?.label || allergy.severity}
                  </Badge>
                )}
                {allergy.reaction && (
                  <span className="text-sm">
                    <span className="text-muted-foreground">Reação:</span> {allergy.reaction}
                  </span>
                )}
              </div>
              {allergy.notes && (
                <p className="text-sm text-muted-foreground">{allergy.notes}</p>
              )}
            </div>
          }
        />
      ))}
    </div>
  )
}
