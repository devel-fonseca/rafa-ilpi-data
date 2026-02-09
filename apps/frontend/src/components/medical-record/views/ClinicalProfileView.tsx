// ──────────────────────────────────────────────────────────────────────────────
//  VIEW - ClinicalProfileView (Perfil Clínico com dropdown de seções)
// ──────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Plus, Edit, Trash2, Droplet, Ruler, Activity, AlertTriangle } from 'lucide-react'
import { useClinicalProfile } from '@/hooks/useClinicalProfiles'
import { useAllergiesByResident } from '@/hooks/useAllergies'
import { useConditionsByResident } from '@/hooks/useConditions'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
import {
  useResidentHealthSummary,
  useAnthropometryRecords,
  useDependencyAssessments,
  useDeleteAnthropometry,
} from '@/hooks/useResidentHealth'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import {
  BLOOD_TYPE_LABELS,
  DEPENDENCY_LEVEL_SHORT_LABELS,
  DEPENDENCY_LEVEL_COLORS,
  getBMIClassification,
  type ResidentAnthropometry,
  type ResidentDependencyAssessment,
} from '@/api/resident-health.api'
import { EditClinicalProfileModal } from '@/components/clinical-data/EditClinicalProfileModal'
import { AllergyModal } from '@/components/clinical-data/AllergyModal'
import { ConditionModal } from '@/components/clinical-data/ConditionModal'
import { DietaryRestrictionModal } from '@/components/clinical-data/DietaryRestrictionModal'
import { BloodTypeModal } from '@/components/clinical-data/BloodTypeModal'
import { AnthropometryModal } from '@/components/clinical-data/AnthropometryModal'
import { DependencyAssessmentModal } from '@/components/clinical-data/DependencyAssessmentModal'
import { DeleteAllergyModal } from '@/components/modals/DeleteAllergyModal'
import { DeleteConditionModal } from '@/components/modals/DeleteConditionModal'
import { DeleteDietaryRestrictionModal } from '@/components/modals/DeleteDietaryRestrictionModal'
import { DeleteReasonModal } from '@/components/modals/DeleteReasonModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Allergy } from '@/api/allergies.api'
import type { Condition } from '@/api/conditions.api'
import type { DietaryRestriction } from '@/api/dietary-restrictions.api'
import type { MedicalViewProps } from '../types'

// ========== TYPES ==========

type SectionType = 'perfil' | 'parametros' | 'dependencia' | 'alergias' | 'condicoes' | 'restricoes'

const SECTION_OPTIONS: { value: SectionType; label: string }[] = [
  { value: 'perfil', label: 'Perfil Clínico' },
  { value: 'parametros', label: 'Parâmetros de Saúde' },
  { value: 'dependencia', label: 'Avaliação de Dependência' },
  { value: 'alergias', label: 'Alergias' },
  { value: 'condicoes', label: 'Condições Crônicas' },
  { value: 'restricoes', label: 'Restrições Alimentares' },
]

// ========== CONSTANTS ==========

const ALLERGY_SEVERITY_LABELS = {
  LEVE: { label: 'Leve', variant: 'secondary' as const },
  MODERADA: { label: 'Moderada', variant: 'warning' as const },
  GRAVE: { label: 'Grave', variant: 'danger' as const },
  ANAFILAXIA: { label: 'Anafilaxia', variant: 'danger' as const },
}

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

const PROFILE_SECTION_CONTENT = [
  {
    key: 'healthStatus',
    title: 'Estado de Saúde',
    fallback:
      'Descreva o estado de saúde do residente, indicando condições clínicas atuais, diagnósticos conhecidos, comorbidades, histórico relevante e necessidades de acompanhamento em saúde, conforme avaliação da equipe multiprofissional.',
  },
  {
    key: 'specialNeeds',
    title: 'Necessidades Especiais',
    fallback:
      'Descreva as necessidades especiais do residente, indicando limitações físicas, cognitivas, sensoriais ou comportamentais, bem como adaptações, apoios e cuidados específicos necessários para a prestação da assistência.',
  },
  {
    key: 'functionalAspects',
    title: 'Aspectos Funcionais',
    fallback:
      'Descreva os aspectos funcionais do residente, indicando o grau de autonomia para as atividades da vida diária, mobilidade, comunicação, cognição e uso de dispositivos de apoio, conforme avaliação funcional.',
  },
] as const

// ========== COMPONENT ==========

export function ClinicalProfileView({ residentId }: MedicalViewProps) {
  // Estado da seção ativa
  const [activeSection, setActiveSection] = useState<SectionType>('perfil')
  const isPerfilSection = activeSection === 'perfil'
  const isParametrosSection = activeSection === 'parametros'
  const isDependenciaSection = activeSection === 'dependencia'
  const isAlergiasSection = activeSection === 'alergias'
  const isCondicoesSection = activeSection === 'condicoes'
  const isRestricoesSection = activeSection === 'restricoes'

  // Estados dos modais
  const [clinicalProfileModalOpen, setClinicalProfileModalOpen] = useState(false)
  const [allergyModalOpen, setAllergyModalOpen] = useState(false)
  const [conditionModalOpen, setConditionModalOpen] = useState(false)
  const [restrictionModalOpen, setRestrictionModalOpen] = useState(false)
  const [bloodTypeModalOpen, setBloodTypeModalOpen] = useState(false)
  const [anthropometryModalOpen, setAnthropometryModalOpen] = useState(false)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [deleteAnthropometryModalOpen, setDeleteAnthropometryModalOpen] = useState(false)

  // Estados para edição
  const [editingAllergy, setEditingAllergy] = useState<Allergy | undefined>()
  const [editingCondition, setEditingCondition] = useState<Condition | undefined>()
  const [editingRestriction, setEditingRestriction] = useState<DietaryRestriction | undefined>()
  const [editingAnthropometry, setEditingAnthropometry] = useState<ResidentAnthropometry | null>(null)
  const [editingAssessment, setEditingAssessment] = useState<ResidentDependencyAssessment | null>(null)
  const [deletingAnthropometry, setDeletingAnthropometry] = useState<ResidentAnthropometry | null>(null)

  // Estados para delete
  const [deletingAllergy, setDeletingAllergy] = useState<Allergy | undefined>()
  const [deleteAllergyModalOpen, setDeleteAllergyModalOpen] = useState(false)
  const [deletingCondition, setDeletingCondition] = useState<Condition | undefined>()
  const [deleteConditionModalOpen, setDeleteConditionModalOpen] = useState(false)
  const [deletingRestriction, setDeletingRestriction] = useState<DietaryRestriction | undefined>()
  const [deleteRestrictionModalOpen, setDeleteRestrictionModalOpen] = useState(false)

  // Permissões
  const { hasPermission } = usePermissions()
  const canCreateProfile = hasPermission(PermissionType.CREATE_CLINICAL_PROFILE)
  const canUpdateProfile = hasPermission(PermissionType.UPDATE_CLINICAL_PROFILE)
  const canEditProfile = canCreateProfile || canUpdateProfile
  const canCreateAllergies = hasPermission(PermissionType.CREATE_ALLERGIES)
  const canUpdateAllergies = hasPermission(PermissionType.UPDATE_ALLERGIES)
  const canDeleteAllergies = hasPermission(PermissionType.DELETE_ALLERGIES)
  const canCreateConditions = hasPermission(PermissionType.CREATE_CONDITIONS)
  const canUpdateConditions = hasPermission(PermissionType.UPDATE_CONDITIONS)
  const canDeleteConditions = hasPermission(PermissionType.DELETE_CONDITIONS)
  const canCreateRestrictions = hasPermission(PermissionType.CREATE_DIETARY_RESTRICTIONS)
  const canUpdateRestrictions = hasPermission(PermissionType.UPDATE_DIETARY_RESTRICTIONS)
  const canDeleteRestrictions = hasPermission(PermissionType.DELETE_DIETARY_RESTRICTIONS)

  // Dados
  const { data: clinicalProfile, isLoading: profileLoading } = useClinicalProfile(residentId, isPerfilSection)
  const { data: allergies = [], isLoading: allergiesLoading } = useAllergiesByResident(residentId, isAlergiasSection)
  const { data: conditions = [], isLoading: conditionsLoading } = useConditionsByResident(residentId, isCondicoesSection)
  const { data: dietaryRestrictions = [], isLoading: restrictionsLoading } = useDietaryRestrictionsByResident(
    residentId,
    isRestricoesSection
  )
  const { data: healthSummary, isLoading: summaryLoading } = useResidentHealthSummary(
    residentId,
    isParametrosSection || isDependenciaSection
  )
  const { data: anthropometryRecords = [], isLoading: anthropometryLoading } = useAnthropometryRecords(
    residentId,
    5,
    isParametrosSection
  )
  const { data: assessments = [], isLoading: assessmentsLoading } = useDependencyAssessments(
    residentId,
    isDependenciaSection
  )

  const deleteAnthropometryMutation = useDeleteAnthropometry()
  const sortedAnthropometryRecords = useMemo(
    () =>
      [...anthropometryRecords].sort(
        (a, b) =>
          new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
      ),
    [anthropometryRecords]
  )

  const isLoading = (
    (isPerfilSection && profileLoading) ||
    (isAlergiasSection && allergiesLoading) ||
    (isCondicoesSection && conditionsLoading) ||
    (isRestricoesSection && restrictionsLoading) ||
    (isParametrosSection && (summaryLoading || anthropometryLoading)) ||
    (isDependenciaSection && (summaryLoading || assessmentsLoading))
  )

  // ========== HANDLERS ==========

  const handleCreateAllergy = () => {
    setEditingAllergy(undefined)
    setAllergyModalOpen(true)
  }

  const handleEditAllergy = (allergy: Allergy) => {
    setEditingAllergy(allergy)
    setAllergyModalOpen(true)
  }

  const handleCreateCondition = () => {
    setEditingCondition(undefined)
    setConditionModalOpen(true)
  }

  const handleEditCondition = (condition: Condition) => {
    setEditingCondition(condition)
    setConditionModalOpen(true)
  }

  const handleCreateRestriction = () => {
    setEditingRestriction(undefined)
    setRestrictionModalOpen(true)
  }

  const handleEditRestriction = (restriction: DietaryRestriction) => {
    setEditingRestriction(restriction)
    setRestrictionModalOpen(true)
  }

  const handleCreateAnthropometry = () => {
    setEditingAnthropometry(null)
    setAnthropometryModalOpen(true)
  }

  const handleEditAnthropometry = (record: ResidentAnthropometry) => {
    setEditingAnthropometry(record)
    setAnthropometryModalOpen(true)
  }

  const handleDeleteAnthropometry = (record: ResidentAnthropometry) => {
    setDeletingAnthropometry(record)
    setDeleteAnthropometryModalOpen(true)
  }

  const confirmDeleteAnthropometry = async (reason: string) => {
    if (!deletingAnthropometry) return
    await deleteAnthropometryMutation.mutateAsync({
      id: deletingAnthropometry.id,
      deleteReason: reason,
    })
    setDeleteAnthropometryModalOpen(false)
    setDeletingAnthropometry(null)
  }

  const handleCreateAssessment = () => {
    setEditingAssessment(null)
    setAssessmentModalOpen(true)
  }

  const handleEditAssessment = (assessment: ResidentDependencyAssessment) => {
    setEditingAssessment(assessment)
    setAssessmentModalOpen(true)
  }

  // ========== RENDER ACTION BUTTON ==========

  const getActionButtonConfig = () => {
    switch (activeSection) {
      case 'perfil':
        return {
          canShow: canEditProfile,
          onClick: () => setClinicalProfileModalOpen(true),
          icon: <Edit className="h-4 w-4 mr-2" />,
          label: clinicalProfile ? 'Editar' : 'Adicionar',
          tooltip: clinicalProfile
            ? 'Editar estado de saúde, necessidades especiais e aspectos funcionais'
            : 'Adicionar informações do perfil clínico',
        }
      case 'parametros':
        return {
          canShow: canEditProfile,
          onClick: handleCreateAnthropometry,
          icon: <Plus className="h-4 w-4 mr-2" />,
          label: 'Nova Medição',
          tooltip: 'Registrar nova medição de peso, altura e IMC',
        }
      case 'dependencia':
        return {
          canShow: canEditProfile,
          onClick: handleCreateAssessment,
          icon: <Plus className="h-4 w-4 mr-2" />,
          label: 'Nova Avaliação',
          tooltip: 'Registrar nova avaliação de dependência conforme RDC 502/2021',
        }
      case 'alergias':
        return {
          canShow: canCreateAllergies,
          onClick: handleCreateAllergy,
          icon: <Plus className="h-4 w-4 mr-2" />,
          label: 'Adicionar',
          tooltip: 'Cadastrar nova alergia ou reação adversa',
        }
      case 'condicoes':
        return {
          canShow: canCreateConditions,
          onClick: handleCreateCondition,
          icon: <Plus className="h-4 w-4 mr-2" />,
          label: 'Adicionar',
          tooltip: 'Cadastrar nova condição crônica ou diagnóstico',
        }
      case 'restricoes':
        return {
          canShow: canCreateRestrictions,
          onClick: handleCreateRestriction,
          icon: <Plus className="h-4 w-4 mr-2" />,
          label: 'Adicionar',
          tooltip: 'Cadastrar nova restrição alimentar ou dietética',
        }
      default:
        return null
    }
  }

  const renderActionButton = () => {
    const config = getActionButtonConfig()
    if (!config || !config.canShow) return null

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={config.onClick}>
              {config.icon}
              {config.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            <p className="text-sm">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ========== LOADING ==========

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ========== RENDER ==========

  return (
    <>
      <div className="space-y-6">
        {/* Header com Dropdown */}
        <div className="flex items-center justify-between">
          <Select value={activeSection} onValueChange={(v) => setActiveSection(v as SectionType)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {renderActionButton()}
        </div>

        {/* ========== SEÇÃO: PERFIL CLÍNICO ========== */}
        {activeSection === 'perfil' && (
          <div className="space-y-6">
            {PROFILE_SECTION_CONTENT.map((section) => {
              const value = clinicalProfile?.[section.key]
              return (
                <div key={section.key} className="rounded-lg border bg-card p-4">
                  <div className="text-sm font-semibold text-foreground">{section.title}</div>
                  <div className="mt-2 text-sm">
                    {value || (
                      <span className="text-muted-foreground italic">
                        {section.fallback}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ========== SEÇÃO: PARÂMETROS DE SAÚDE ========== */}
        {activeSection === 'parametros' && (
          <div className="space-y-5">
            {/* Tipo Sanguíneo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplet className="h-5 w-5 text-danger" />
                <h4 className="font-medium">Tipo Sanguíneo</h4>
              </div>

              <div className="flex items-start justify-between gap-3 p-4 border rounded-lg bg-card">
                <div>
                  {healthSummary?.bloodType ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {BLOOD_TYPE_LABELS[healthSummary.bloodType.bloodType]}
                      </span>
                      {healthSummary.bloodType.source && (
                        <Badge variant="secondary" className="text-xs">
                          {healthSummary.bloodType.source}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Não informado</span>
                  )}
                </div>
                {canEditProfile && (
                  <Button size="sm" variant="outline" onClick={() => setBloodTypeModalOpen(true)}>
                    {healthSummary?.bloodType ? (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Antropometria */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Medidas Antropométricas</h4>
              </div>

              {sortedAnthropometryRecords.length > 0 ? (
                <div className="border rounded-lg overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Altura</TableHead>
                        <TableHead>Peso</TableHead>
                        <TableHead>IMC</TableHead>
                        <TableHead className="w-[96px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAnthropometryRecords.map((record, index) => {
                        const bmiClass = getBMIClassification(Number(record.bmi))
                        return (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {format(new Date(record.measurementDate), 'dd/MM/yyyy', { locale: ptBR })}
                              {index === 0 && (
                                <Badge variant="outline" className="ml-2 text-xs">Atual</Badge>
                              )}
                            </TableCell>
                            <TableCell>{Number(record.height).toFixed(2)} m</TableCell>
                            <TableCell>{Number(record.weight).toFixed(1)} kg</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{Number(record.bmi).toFixed(1)}</span>
                                <Badge
                                  variant={bmiClass.color === 'green' ? 'success' : bmiClass.color === 'yellow' ? 'warning' : 'danger'}
                                  className="text-xs"
                                >
                                  {bmiClass.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {canEditProfile && (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditAnthropometry(record)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-danger hover:text-danger"
                                    onClick={() => handleDeleteAnthropometry(record)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg bg-muted/10">
                  <p className="text-sm text-muted-foreground">Nenhuma medição registrada</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SEÇÃO: AVALIAÇÃO DE DEPENDÊNCIA ========== */}
        {activeSection === 'dependencia' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Avaliação Vigente</h4>
            </div>

            {healthSummary?.currentAssessment ? (
              <div className="border rounded-lg bg-card">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        DEPENDENCY_LEVEL_COLORS[healthSummary.currentAssessment.dependencyLevel] === 'green'
                          ? 'success'
                          : DEPENDENCY_LEVEL_COLORS[healthSummary.currentAssessment.dependencyLevel] === 'yellow'
                            ? 'warning'
                            : 'danger'
                      }
                      className="text-sm px-3 py-1"
                    >
                      {DEPENDENCY_LEVEL_SHORT_LABELS[healthSummary.currentAssessment.dependencyLevel]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">Vigente</Badge>
                  </div>
                  {canEditProfile && (
                    <Button size="sm" variant="outline" onClick={() => handleEditAssessment(healthSummary.currentAssessment!)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-1">Instrumento</div>
                    <div className="font-medium">{healthSummary.currentAssessment.assessmentInstrument}</div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-1">Data da Avaliação</div>
                    <div className="font-medium">
                      {format(new Date(healthSummary.currentAssessment.effectiveDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  {healthSummary.currentAssessment.assessmentScore && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground mb-1">Pontuação</div>
                      <div className="font-medium">{Number(healthSummary.currentAssessment.assessmentScore).toFixed(1)}</div>
                    </div>
                  )}
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-1">Auxílio Mobilidade</div>
                    <div className="font-medium">
                      {healthSummary.currentAssessment.mobilityAid
                        ? healthSummary.currentAssessment.mobilityAidDescription || 'Sim'
                        : 'Não'}
                    </div>
                  </div>
                </div>

                {healthSummary.currentAssessment.notes && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Observações</div>
                    <div>{healthSummary.currentAssessment.notes}</div>
                  </div>
                )}
                </div>

                {healthSummary.currentAssessment.assessor && (
                  <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                    Registrado por <span className="font-medium text-foreground">{healthSummary.currentAssessment.assessor.name}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 space-y-2">
                <Activity className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-medium text-foreground">Nenhuma avaliação registrada</p>
                <p className="text-xs text-muted-foreground">Cadastre uma avaliação para acompanhar o grau de dependência.</p>
              </div>
            )}

            {/* Histórico */}
            {assessments.length > 1 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">Histórico de Avaliações</h5>
                <div className="border rounded-lg overflow-hidden bg-card">
                  {assessments
                    .filter((a) => a.endDate !== null)
                    .slice(0, 3)
                    .map((assessment) => (
                      <div
                        key={assessment.id}
                        className="flex items-center justify-between gap-3 p-3 text-sm border-b last:border-b-0 hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {DEPENDENCY_LEVEL_SHORT_LABELS[assessment.dependencyLevel]}
                          </Badge>
                          <span className="text-muted-foreground truncate">
                            {format(new Date(assessment.effectiveDate), 'dd/MM/yyyy', { locale: ptBR })}
                            {' - '}
                            {assessment.endDate
                              ? format(new Date(assessment.endDate), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Atual'}
                          </span>
                        </div>
                        {canEditProfile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditAssessment(assessment)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== SEÇÃO: ALERGIAS ========== */}
        {activeSection === 'alergias' && (
          allergies.length > 0 ? (
            <div className="space-y-3">
              {allergies.map((allergy) => (
                <div
                  key={allergy.id}
                  className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{allergy.substance}</span>
                      {allergy.severity && (
                        <div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1">
                          <span className="text-[11px] text-muted-foreground">Severidade</span>
                          <Badge
                            variant={ALLERGY_SEVERITY_LABELS[allergy.severity].variant}
                            className="h-5 px-2 text-[11px]"
                          >
                            {ALLERGY_SEVERITY_LABELS[allergy.severity].label}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {allergy.reaction && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground/80">Reação:</span> {allergy.reaction}
                      </p>
                    )}
                    {allergy.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-foreground/80">Observações:</span> {allergy.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {canUpdateAllergies && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditAllergy(allergy)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteAllergies && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-danger hover:text-danger"
                        onClick={() => {
                          setDeletingAllergy(allergy)
                          setDeleteAllergyModalOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 space-y-2">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-medium text-foreground">Nenhuma alergia cadastrada</p>
              <p className="text-xs text-muted-foreground">Cadastre alergias para reforçar a segurança do cuidado.</p>
            </div>
          )
        )}

        {/* ========== SEÇÃO: CONDIÇÕES CRÔNICAS ========== */}
        {activeSection === 'condicoes' && (
          conditions.length > 0 ? (
            <div className="space-y-3">
              {conditions.map((condition) => (
                <div
                  key={condition.id}
                  className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{condition.condition}</span>
                      {condition.icdCode && (
                        <div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1">
                          <span className="text-[11px] text-muted-foreground">CID</span>
                          <Badge variant="outline" className="h-5 px-2 text-[11px]">
                            {condition.icdCode}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {condition.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-foreground/80">Observações:</span> {condition.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {canUpdateConditions && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditCondition(condition)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteConditions && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-danger hover:text-danger"
                        onClick={() => {
                          setDeletingCondition(condition)
                          setDeleteConditionModalOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 space-y-2">
              <Activity className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-medium text-foreground">Nenhuma condição cadastrada</p>
              <p className="text-xs text-muted-foreground">Cadastre condições crônicas para apoiar o acompanhamento clínico.</p>
            </div>
          )
        )}

        {/* ========== SEÇÃO: RESTRIÇÕES ALIMENTARES ========== */}
        {activeSection === 'restricoes' && (
          dietaryRestrictions.length > 0 ? (
            <div className="space-y-3">
              {dietaryRestrictions.map((restriction) => (
                <div
                  key={restriction.id}
                  className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{restriction.description}</span>
                      <div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1">
                        <span className="text-[11px] text-muted-foreground">Tipo</span>
                        <Badge variant="outline" className="h-5 px-2 text-[11px]">
                          {RESTRICTION_TYPE_LABELS[restriction.restrictionType]}
                        </Badge>
                      </div>
                    </div>
                    {restriction.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-foreground/80">Observações:</span> {restriction.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {canUpdateRestrictions && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditRestriction(restriction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteRestrictions && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-danger hover:text-danger"
                        onClick={() => {
                          setDeletingRestriction(restriction)
                          setDeleteRestrictionModalOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 space-y-2">
              <Ruler className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-sm font-medium text-foreground">Nenhuma restrição cadastrada</p>
              <p className="text-xs text-muted-foreground">Cadastre restrições alimentares para orientar a rotina nutricional.</p>
            </div>
          )
        )}
      </div>

      {/* ========== MODAIS ========== */}

      <EditClinicalProfileModal
        open={clinicalProfileModalOpen}
        onOpenChange={setClinicalProfileModalOpen}
        residentId={residentId}
        profile={clinicalProfile}
      />

      <AllergyModal
        open={allergyModalOpen}
        onOpenChange={setAllergyModalOpen}
        residentId={residentId}
        allergy={editingAllergy}
      />

      <ConditionModal
        open={conditionModalOpen}
        onOpenChange={setConditionModalOpen}
        residentId={residentId}
        condition={editingCondition}
      />

      <DietaryRestrictionModal
        open={restrictionModalOpen}
        onOpenChange={setRestrictionModalOpen}
        residentId={residentId}
        restriction={editingRestriction}
      />

      <BloodTypeModal
        open={bloodTypeModalOpen}
        onOpenChange={setBloodTypeModalOpen}
        residentId={residentId}
        bloodType={healthSummary?.bloodType}
      />

      <AnthropometryModal
        open={anthropometryModalOpen}
        onOpenChange={setAnthropometryModalOpen}
        residentId={residentId}
        anthropometry={editingAnthropometry}
      />

      <DependencyAssessmentModal
        open={assessmentModalOpen}
        onOpenChange={setAssessmentModalOpen}
        residentId={residentId}
        assessment={editingAssessment}
      />

      <DeleteAllergyModal
        allergy={deletingAllergy}
        open={deleteAllergyModalOpen}
        onOpenChange={setDeleteAllergyModalOpen}
        onSuccess={() => {}}
      />

      <DeleteConditionModal
        condition={deletingCondition}
        open={deleteConditionModalOpen}
        onOpenChange={setDeleteConditionModalOpen}
        onSuccess={() => {}}
      />

      <DeleteDietaryRestrictionModal
        restriction={deletingRestriction}
        open={deleteRestrictionModalOpen}
        onOpenChange={setDeleteRestrictionModalOpen}
        onSuccess={() => {}}
      />

      <DeleteReasonModal
        open={deleteAnthropometryModalOpen}
        onOpenChange={setDeleteAnthropometryModalOpen}
        title="Excluir Medição Antropométrica"
        description="Esta ação irá excluir a medição. Informe o motivo da exclusão."
        onConfirm={confirmDeleteAnthropometry}
        isLoading={deleteAnthropometryMutation.isPending}
      />
    </>
  )
}
