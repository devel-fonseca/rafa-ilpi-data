// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - BasicInfoView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge'
import { formatBedFromResident, formatDate } from '@/utils/formatters'
import { InfoCard } from './InfoCard'
import type { Resident } from '@/api/residents.api'

interface BasicInfoViewProps {
  resident: Resident
}

export function BasicInfoView({ resident }: BasicInfoViewProps) {
  return (
    <div className="space-y-6">
      {/* Data de Admissão */}
      <InfoCard
        label="Data de admissão"
        value={resident.admissionDate ? formatDate(resident.admissionDate) : 'Não informada'}
      />

      {/* Grau de Dependência */}
      <InfoCard
        label="Grau de dependência"
        value={resident.dependencyLevel || 'Não informado'}
      />

      {/* Leito */}
      <InfoCard
        label="Leito"
        value={resident.bedId ? formatBedFromResident(resident as unknown as Record<string, unknown>) : 'Sem leito atribuído'}
      />

      {/* Status */}
      <InfoCard
        label="Status"
        value={
          <Badge
            variant={resident.status === 'ATIVO' ? 'default' : 'secondary'}
            className={resident.status === 'ATIVO' ? 'bg-success/10 text-success border-success/30' : ''}
          >
            {resident.status}
          </Badge>
        }
      />
    </div>
  )
}
