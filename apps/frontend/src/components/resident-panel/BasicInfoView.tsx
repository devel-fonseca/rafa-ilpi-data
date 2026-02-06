// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - BasicInfoView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { formatBedFromResident, formatDate } from '@/utils/formatters'
import { InfoCard } from './InfoCard'
import type { Resident } from '@/api/residents.api'

interface BasicInfoViewProps {
  resident: Resident
}

export function BasicInfoView({ resident }: BasicInfoViewProps) {
  const hasHealthPlans = resident.healthPlans && resident.healthPlans.length > 0
  const hasEmergencyContacts = resident.emergencyContacts && resident.emergencyContacts.length > 0
  const hasLegalGuardian = resident.legalGuardianName

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

      {/* Convênios */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground mb-1">Convênios</p>
        {hasHealthPlans ? (
          <div className="space-y-2">
            {resident.healthPlans!.map((plan, index) => (
              <div key={index}>
                <p className="text-base font-medium">{plan.name}</p>
                <p className="text-sm text-muted-foreground">Nº {plan.cardNumber}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base font-medium">Nenhum convênio cadastrado</p>
        )}
      </div>

      {/* Contatos de Emergência */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground mb-1">Contatos de Emergência</p>
        {hasEmergencyContacts ? (
          <div className="space-y-2">
            {resident.emergencyContacts!.map((contact, index) => (
              <div key={index}>
                <p className="text-base font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">
                  {contact.phone} • {contact.relationship}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base font-medium">Nenhum contato cadastrado</p>
        )}
      </div>

      {/* Responsável Legal */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground mb-1">Responsável Legal</p>
        {hasLegalGuardian ? (
          <div>
            <p className="text-base font-medium">{resident.legalGuardianName}</p>
            <p className="text-sm text-muted-foreground">
              {[
                resident.legalGuardianPhone,
                resident.legalGuardianEmail,
                resident.legalGuardianType,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        ) : (
          <p className="text-base font-medium">Nenhum responsável cadastrado</p>
        )}
      </div>
    </div>
  )
}
