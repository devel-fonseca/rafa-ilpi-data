import type { HTMLAttributes } from 'react'
import { Accessibility } from 'lucide-react'
import { DEPENDENCY_LEVEL_SHORT_LABELS, type DependencyLevel } from '@/api/resident-health.api'
import { StatusBadge } from '@/design-system/components'
import { cn } from '@/lib/utils'
import {
  getDependencyLevelBadgeVariant,
  getResidentStatusBadge,
  RESIDENT_MOBILITY_BADGE_VARIANT,
} from './residentBadgeTokens'

type MobilityDisplay = 'icon' | 'label'

interface ResidentBadgesProps extends Pick<HTMLAttributes<HTMLDivElement>, 'className'> {
  status: string
  dependencyLevel?: DependencyLevel | null
  mobilityAid?: boolean | null
  mobilityDisplay?: MobilityDisplay
  showDependencyFallback?: boolean
  statusClassName?: string
  dependencyClassName?: string
  mobilityClassName?: string
}

export function ResidentBadges({
  status,
  dependencyLevel,
  mobilityAid = false,
  mobilityDisplay = 'icon',
  showDependencyFallback = false,
  className,
  statusClassName,
  dependencyClassName,
  mobilityClassName,
}: ResidentBadgesProps) {
  const statusBadge = getResidentStatusBadge(status)
  const shouldRenderDependency = !!dependencyLevel || showDependencyFallback
  const shouldRenderMobility = !!mobilityAid

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      <StatusBadge variant={statusBadge.variant} className={cn('whitespace-nowrap', statusClassName)}>
        {statusBadge.label}
      </StatusBadge>

      {shouldRenderDependency && (
        <StatusBadge
          variant={dependencyLevel ? getDependencyLevelBadgeVariant(dependencyLevel) : 'secondary'}
          className={cn('whitespace-nowrap', dependencyClassName)}
        >
          {dependencyLevel ? DEPENDENCY_LEVEL_SHORT_LABELS[dependencyLevel] : 'Sem avaliação de dependência'}
        </StatusBadge>
      )}

      {shouldRenderMobility && (
        <StatusBadge
          variant={RESIDENT_MOBILITY_BADGE_VARIANT}
          title="Auxílio de mobilidade"
          className={cn(
            'whitespace-nowrap',
            mobilityDisplay === 'icon' && 'h-5 min-w-5 px-1.5 justify-center',
            mobilityClassName
          )}
        >
          <Accessibility className={cn('h-3 w-3', mobilityDisplay === 'label' && 'mr-1')} />
          {mobilityDisplay === 'label' ? 'Auxílio' : null}
        </StatusBadge>
      )}
    </div>
  )
}
