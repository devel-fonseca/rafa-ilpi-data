// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - ResidentSummaryView (Sumário do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Activity } from 'lucide-react'
import { useBloodType, useLatestAnthropometry } from '@/hooks/useResidentHealth'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
import { useConsolidatedVitalSigns } from '@/hooks/useConsolidatedVitalSigns'
import { useConditionsByResident } from '@/hooks/useConditions'
import { BLOOD_TYPE_LABELS } from '@/api/resident-health.api'
import { ConsolidatedVitalSignsGrid } from '@/components/residents/ConsolidatedVitalSignsGrid'
import type { ResidentSummaryViewProps } from '../types'

// ========== CONSTANTS ==========

const RESTRICTION_TYPE_LABELS: Record<string, string> = {
  ALERGIA_ALIMENTAR: 'Alergia Alimentar',
  INTOLERANCIA: 'Intolerância',
  RESTRICAO_MEDICA: 'Restrição Médica',
  RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
  DISFAGIA: 'Disfagia',
  DIABETES: 'Diabetes',
  HIPERTENSAO: 'Hipertensão',
  OUTRA: 'Outra',
}

// ========== HELPERS ==========

const truncateText = (text: string | undefined | null, maxLength: number = 100) => {
  if (!text) return { text: '', isTruncated: false }
  if (text.length <= maxLength) return { text, isTruncated: false }
  return { text: text.substring(0, maxLength) + '...', isTruncated: true }
}

// ========== COMPONENT ==========

export function ResidentSummaryView({ resident, residentId, onVitalSignsClick }: ResidentSummaryViewProps) {
  const healthConditionsCardRef = useRef<HTMLDivElement>(null)

  // Buscar tipo sanguíneo da nova tabela
  const { data: bloodTypeData } = useBloodType(residentId)
  const bloodTypeLabel = bloodTypeData?.bloodType
    ? BLOOD_TYPE_LABELS[bloodTypeData.bloodType as keyof typeof BLOOD_TYPE_LABELS]
    : 'Não informado'

  // Buscar última medição antropométrica
  const { data: anthropometry } = useLatestAnthropometry(residentId)

  // Buscar restrições alimentares
  const { data: dietaryRestrictions } = useDietaryRestrictionsByResident(residentId)

  // Buscar condições crônicas da tabela atual
  const { data: conditions = [] } = useConditionsByResident(residentId)

  // Buscar sinais vitais consolidados (mesma fonte da Visualização Rápida)
  const { data: consolidatedVitalSigns } = useConsolidatedVitalSigns(residentId)

  const scrollToHealthConditions = () => {
    if (healthConditionsCardRef.current) {
      healthConditionsCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Tipo Sanguíneo, Altura, Peso e IMC */}
      <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Tipo Sanguíneo</div>
                <div className="font-semibold text-lg text-danger">{bloodTypeLabel}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Altura</div>
                <div className="font-medium text-foreground">
                  {anthropometry?.height ? `${Number(anthropometry.height).toFixed(2)} m` : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Peso</div>
                <div className="font-medium text-foreground">
                  {anthropometry?.weight ? `${Number(anthropometry.weight).toFixed(1)} kg` : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">IMC</div>
                <div className="font-medium text-foreground">
                  {anthropometry?.bmi ? Number(anthropometry.bmi).toFixed(1) : '-'}
                </div>
              </div>
            </div>

      {/* Últimos Sinais Vitais */}
      <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-muted-foreground">Últimos Sinais Vitais</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onVitalSignsClick}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Ver Histórico
                </Button>
              </div>
              {consolidatedVitalSigns ? (
                <ConsolidatedVitalSignsGrid
                  consolidatedVitalSigns={consolidatedVitalSigns}
                  gridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
                />
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  Nenhum registro de sinais vitais
                </div>
              )}
      </div>

      {/* Alergias - sempre visível */}
      <div className="border-t pt-6">
        <div className="text-sm text-muted-foreground mb-2">Alergias</div>
        {resident.allergies && Array.isArray(resident.allergies) && resident.allergies.length > 0 ? (
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2">
              {resident.allergies.map((allergy) => {
                const hasDetails = allergy.reaction || allergy.severity || allergy.notes || allergy.contraindications

                return hasDetails ? (
                  <Tooltip key={allergy.id}>
                    <TooltipTrigger asChild>
                      <div className="inline-block">
                        <Badge variant="destructive" className="text-xs cursor-help">
                          {allergy.substance}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>
                      <div className="space-y-1.5 max-w-xs">
                        <p className="font-semibold text-sm">{allergy.substance}</p>
                        {allergy.severity && (
                          <p className="text-xs">
                            <span className="font-medium">Severidade:</span>{' '}
                            {allergy.severity === 'LEVE' && 'Leve'}
                            {allergy.severity === 'MODERADA' && 'Moderada'}
                            {allergy.severity === 'GRAVE' && 'Grave'}
                            {allergy.severity === 'ANAFILAXIA' && 'Anafilaxia'}
                          </p>
                        )}
                        {allergy.reaction && (
                          <p className="text-xs">
                            <span className="font-medium">Reação:</span> {allergy.reaction}
                          </p>
                        )}
                        {allergy.notes && (
                          <p className="text-xs">
                            <span className="font-medium">Observações:</span> {allergy.notes}
                          </p>
                        )}
                        {allergy.contraindications && (
                          <p className="text-xs">
                            <span className="font-medium">Contraindicações:</span> {allergy.contraindications}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge key={allergy.id} variant="destructive" className="text-xs">
                    {allergy.substance}
                  </Badge>
                )
              })}
            </div>
          </TooltipProvider>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Nenhuma alergia cadastrada
          </div>
        )}
      </div>

      {/* Condições Crônicas - sempre visível */}
      <div className="border-t pt-6" ref={healthConditionsCardRef}>
        <div className="text-sm text-muted-foreground mb-1">Condições Crônicas</div>
        {conditions.length > 0 ? (
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition) => {
                const hasDetails = condition.icdCode || condition.notes || condition.contraindications

                return hasDetails ? (
                  <Tooltip key={condition.id}>
                    <TooltipTrigger asChild>
                      <div className="inline-block">
                        <Badge variant="outline" className="text-xs cursor-help">
                          {condition.condition}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>
                      <div className="space-y-1.5 max-w-xs">
                        <p className="font-semibold text-sm">{condition.condition}</p>
                        {condition.icdCode && (
                          <p className="text-xs">
                            <span className="font-medium">CID:</span> {condition.icdCode}
                          </p>
                        )}
                        {condition.notes && (
                          <p className="text-xs">
                            <span className="font-medium">Observações:</span> {condition.notes}
                          </p>
                        )}
                        {condition.contraindications && (
                          <p className="text-xs">
                            <span className="font-medium">Contraindicações:</span> {condition.contraindications}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge key={condition.id} variant="outline" className="text-xs">
                    {condition.condition}
                  </Badge>
                )
              })}
            </div>
          </TooltipProvider>
        ) : resident.chronicConditions ? (() => {
          const { text: truncatedConditions, isTruncated: conditionsTruncated } = truncateText(resident.chronicConditions)
          return (
            <>
              <div className="text-sm text-foreground">{truncatedConditions}</div>
              {conditionsTruncated && (
                <Button
                  type="button"
                  variant="link"
                  className="text-xs p-0 mt-2 h-auto"
                  onClick={scrollToHealthConditions}
                >
                  Ver mais →
                </Button>
              )}
            </>
          )
        })() : (
          <div className="text-sm text-muted-foreground italic">
            Nenhuma condição crônica cadastrada
          </div>
        )}
      </div>

      {/* Restrições Alimentares - sempre visível */}
      <div className="border-t pt-6">
        <div className="text-sm text-muted-foreground mb-2">Restrições Alimentares</div>
        {dietaryRestrictions && dietaryRestrictions.length > 0 ? (
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2">
              {dietaryRestrictions.map((restriction) => {
                const hasDetails = restriction.notes || restriction.contraindications

                return hasDetails ? (
                  <Tooltip key={restriction.id}>
                    <TooltipTrigger asChild>
                      <div className="inline-block">
                        <Badge variant="secondary" className="text-xs cursor-help">
                          {restriction.description}
                          <span className="ml-1 text-muted-foreground">
                            ({RESTRICTION_TYPE_LABELS[restriction.restrictionType] || restriction.restrictionType})
                          </span>
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8}>
                      <div className="space-y-1.5 max-w-xs">
                        <p className="font-semibold text-sm">{restriction.description}</p>
                        <p className="text-xs">
                          <span className="font-medium">Tipo:</span>{' '}
                          {RESTRICTION_TYPE_LABELS[restriction.restrictionType] || restriction.restrictionType}
                        </p>
                        {restriction.notes && (
                          <p className="text-xs">
                            <span className="font-medium">Observações:</span> {restriction.notes}
                          </p>
                        )}
                        {restriction.contraindications && (
                          <p className="text-xs">
                            <span className="font-medium">Contraindicações:</span> {restriction.contraindications}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge key={restriction.id} variant="secondary" className="text-xs">
                    {restriction.description}
                    <span className="ml-1 text-muted-foreground">
                      ({RESTRICTION_TYPE_LABELS[restriction.restrictionType] || restriction.restrictionType})
                    </span>
                  </Badge>
                )
              })}
            </div>
          </TooltipProvider>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Nenhuma restrição alimentar cadastrada
          </div>
        )}
      </div>
    </div>
  )
}
