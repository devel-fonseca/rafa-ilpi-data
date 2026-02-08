// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - BasicInfoView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { formatBedFromResident, formatDate } from '@/utils/formatters'
import { InfoCard } from './InfoCard'
import type { Resident } from '@/api/residents.api'
import { useCurrentDependencyAssessment } from '@/hooks/useResidentHealth'
import { DEPENDENCY_LEVEL_LABELS } from '@/api/resident-health.api'

interface BasicInfoViewProps {
  resident: Resident
}

export function BasicInfoView({ resident }: BasicInfoViewProps) {
  // Buscar avaliação de dependência atual da nova tabela
  const { data: dependencyAssessment } = useCurrentDependencyAssessment(resident.id)
  const dependencyLevelLabel = dependencyAssessment?.dependencyLevel
    ? DEPENDENCY_LEVEL_LABELS[dependencyAssessment.dependencyLevel as keyof typeof DEPENDENCY_LEVEL_LABELS]
    : 'Não informado'

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
        value={dependencyLevelLabel}
      />

      {/* Leito */}
      {resident.bedId ? (
        <InfoCard
          label="Leito"
          value={formatBedFromResident(resident as unknown as Record<string, unknown>)}
        />
      ) : (
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground mb-1">Leito</p>
          <p className="text-base font-medium">Leito não informado</p>
          <p className="text-sm text-muted-foreground mt-2">
            A vinculação de um leito ao residente é um requisito operacional e uma boa prática essencial para a organização da assistência, a rastreabilidade do cuidado e o manejo adequado de rotinas e intercorrências. Informe o leito no cadastro do residente.
          </p>
        </div>
      )}

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
          <div>
            <p className="text-base font-medium">Nenhum contato de emergência cadastrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              A indicação de pelo menos um contato é um requisito operacional e uma boa prática essencial para o manejo adequado de urgências e emergências. Cadastre um contato para garantir segurança e continuidade do cuidado.
            </p>
          </div>
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
