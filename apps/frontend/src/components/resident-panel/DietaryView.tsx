// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - DietaryView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/design-system/components'
import { UtensilsCrossed } from 'lucide-react'
import { InfoCard } from './InfoCard'
import type { DietaryRestriction, RestrictionType } from '@/api/dietary-restrictions.api'

// ========== CONSTANTS ==========

const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  ALERGIA_ALIMENTAR: 'Alergia Alimentar',
  INTOLERANCIA: 'Intolerância',
  RESTRICAO_MEDICA: 'Restrição Médica',
  RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
  DISFAGIA: 'Disfagia',
  DIABETES: 'Diabetes',
  HIPERTENSAO: 'Hipertensão',
  OUTRA: 'Outra',
}

// ========== COMPONENT ==========

interface DietaryViewProps {
  dietaryRestrictions: DietaryRestriction[]
}

export function DietaryView({ dietaryRestrictions }: DietaryViewProps) {
  if (!dietaryRestrictions || dietaryRestrictions.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Nenhuma restrição alimentar"
        description="Este residente não possui restrições alimentares registradas"
      />
    )
  }

  return (
    <div className="space-y-4">
      {dietaryRestrictions.map((restriction) => (
        <InfoCard
          key={restriction.id}
          label={restriction.description}
          value={
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                {RESTRICTION_TYPE_LABELS[restriction.restrictionType]}
              </Badge>
              {restriction.notes && (
                <p className="text-sm text-muted-foreground">{restriction.notes}</p>
              )}
            </div>
          }
        />
      ))}
    </div>
  )
}
