import type { ClinicalProfession } from '@/api/clinicalNotes.api'
import { getSOAPTemplate } from '@/utils/clinicalNotesConstants'
import { SOAPField } from './SOAPField'

interface SOAPTemplateFieldsProps {
  profession: ClinicalProfession
  subjective: string
  objective: string
  assessment: string
  plan: string
  onSubjectiveChange: (value: string) => void
  onObjectiveChange: (value: string) => void
  onAssessmentChange: (value: string) => void
  onPlanChange: (value: string) => void
  disabled?: boolean
}

export function SOAPTemplateFields({
  profession,
  subjective,
  objective,
  assessment,
  plan,
  onSubjectiveChange,
  onObjectiveChange,
  onAssessmentChange,
  onPlanChange,
  disabled = false,
}: SOAPTemplateFieldsProps) {
  const template = getSOAPTemplate(profession)

  return (
    <div className="space-y-6">
      <SOAPField
        label={template.subjective.label}
        value={subjective}
        onChange={onSubjectiveChange}
        placeholder={template.subjective.placeholder}
        guide={template.subjective.guide}
        disabled={disabled}
      />

      <SOAPField
        label={template.objective.label}
        value={objective}
        onChange={onObjectiveChange}
        placeholder={template.objective.placeholder}
        guide={template.objective.guide}
        disabled={disabled}
      />

      <SOAPField
        label={template.assessment.label}
        value={assessment}
        onChange={onAssessmentChange}
        placeholder={template.assessment.placeholder}
        guide={template.assessment.guide}
        disabled={disabled}
      />

      <SOAPField
        label={template.plan.label}
        value={plan}
        onChange={onPlanChange}
        placeholder={template.plan.placeholder}
        guide={template.plan.guide}
        disabled={disabled}
      />
    </div>
  )
}
