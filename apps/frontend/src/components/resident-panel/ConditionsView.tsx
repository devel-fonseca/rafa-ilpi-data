// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - ConditionsView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/design-system/components'
import { HeartPulse } from 'lucide-react'
import { InfoCard } from './InfoCard'
import type { Condition } from '@/api/conditions.api'

interface ConditionsViewProps {
  conditions: Condition[]
}

export function ConditionsView({ conditions }: ConditionsViewProps) {
  if (!conditions || conditions.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Nenhuma condição cadastrada"
        description="Este residente não possui condições crônicas registradas"
      />
    )
  }

  return (
    <div className="space-y-4">
      {conditions.map((condition) => (
        <InfoCard
          key={condition.id}
          label={condition.condition}
          value={
            <div className="space-y-1">
              {condition.icdCode && (
                <Badge variant="outline" className="text-xs">
                  CID: {condition.icdCode}
                </Badge>
              )}
              {condition.notes && (
                <p className="text-sm text-muted-foreground">{condition.notes}</p>
              )}
              {!condition.icdCode && !condition.notes && (
                <span className="text-sm text-muted-foreground italic">Sem detalhes adicionais</span>
              )}
            </div>
          }
        />
      ))}
    </div>
  )
}
