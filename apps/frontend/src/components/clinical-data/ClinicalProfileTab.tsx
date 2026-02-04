import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Edit, Trash2, Accessibility } from 'lucide-react'
import { useClinicalProfile } from '@/hooks/useClinicalProfiles'
import { useResident } from '@/hooks/useResidents'
import {
  useAllergiesByResident,
} from '@/hooks/useAllergies'
import {
  useConditionsByResident,
} from '@/hooks/useConditions'
import {
  useDietaryRestrictionsByResident,
} from '@/hooks/useDietaryRestrictions'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { EditClinicalProfileModal } from './EditClinicalProfileModal'
import { AllergyModal } from './AllergyModal'
import { ConditionModal } from './ConditionModal'
import { DietaryRestrictionModal } from './DietaryRestrictionModal'
import { DeleteAllergyModal } from '@/components/modals/DeleteAllergyModal'
import { DeleteConditionModal } from '@/components/modals/DeleteConditionModal'
import { DeleteDietaryRestrictionModal } from '@/components/modals/DeleteDietaryRestrictionModal'
import type { Allergy } from '@/api/allergies.api'
import type { Condition } from '@/api/conditions.api'
import type { DietaryRestriction } from '@/api/dietary-restrictions.api'

interface ClinicalProfileTabProps {
  residentId: string
}

const ALLERGY_SEVERITY_LABELS = {
  LEVE: { label: 'Leve', variant: 'default' as const },
  MODERADA: { label: 'Moderada', variant: 'warning' as const },
  GRAVE: { label: 'Grave', variant: 'danger' as const },
  ANAFILAXIA: { label: 'Anafilaxia', variant: 'danger' as const },
}

const RESTRICTION_TYPE_LABELS = {
  ALERGIA_ALIMENTAR: 'Alergia Alimentar',
  INTOLERANCIA: 'Intolerância',
  RESTRICAO_MEDICA: 'Restrição Médica',
  RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
  DISFAGIA: 'Disfagia',
  DIABETES: 'Diabetes',
  HIPERTENSAO: 'Hipertensão',
  OUTRA: 'Outra',
}

export function ClinicalProfileTab({ residentId }: ClinicalProfileTabProps) {
  // Estados dos modais
  const [clinicalProfileModalOpen, setClinicalProfileModalOpen] = useState(false)
  const [allergyModalOpen, setAllergyModalOpen] = useState(false)
  const [conditionModalOpen, setConditionModalOpen] = useState(false)
  const [restrictionModalOpen, setRestrictionModalOpen] = useState(false)

  // Estados para edição
  const [editingAllergy, setEditingAllergy] = useState<Allergy | undefined>()
  const [editingCondition, setEditingCondition] = useState<Condition | undefined>()
  const [editingRestriction, setEditingRestriction] = useState<DietaryRestriction | undefined>()

  // Estados para delete
  const [deletingAllergy, setDeletingAllergy] = useState<Allergy | undefined>()
  const [deleteAllergyModalOpen, setDeleteAllergyModalOpen] = useState(false)
  const [deletingCondition, setDeletingCondition] = useState<Condition | undefined>()
  const [deleteConditionModalOpen, setDeleteConditionModalOpen] = useState(false)
  const [deletingRestriction, setDeletingRestriction] = useState<DietaryRestriction | undefined>()
  const [deleteRestrictionModalOpen, setDeleteRestrictionModalOpen] = useState(false)

  // Verificar permissões do usuário
  const { hasPermission } = usePermissions()

  // Buscar dados clínicos e do residente
  const { data: resident, isLoading: residentLoading } = useResident(residentId)
  const { data: clinicalProfile, isLoading: profileLoading } = useClinicalProfile(residentId)
  const { data: allergies = [], isLoading: allergiesLoading } = useAllergiesByResident(residentId)
  const { data: conditions = [], isLoading: conditionsLoading } = useConditionsByResident(residentId)
  const {
    data: dietaryRestrictions = [],
    isLoading: restrictionsLoading,
  } = useDietaryRestrictionsByResident(residentId)

  // Permissões específicas
  const canCreateProfile = hasPermission(PermissionType.CREATE_CLINICAL_PROFILE)
  const canUpdateProfile = hasPermission(PermissionType.UPDATE_CLINICAL_PROFILE)
  // Permite editar se tiver CREATE ou UPDATE (mais flexível)
  const canEditProfile = canCreateProfile || canUpdateProfile

  // Debug de permissões
  console.log('🔍 Permissões Clinical Profile:', {
    canCreateProfile,
    canUpdateProfile,
    canEditProfile,
    clinicalProfileExists: !!clinicalProfile,
  })
  const canCreateAllergies = hasPermission(PermissionType.CREATE_ALLERGIES)
  const canUpdateAllergies = hasPermission(PermissionType.UPDATE_ALLERGIES)
  const canDeleteAllergies = hasPermission(PermissionType.DELETE_ALLERGIES)
  const canCreateConditions = hasPermission(PermissionType.CREATE_CONDITIONS)
  const canUpdateConditions = hasPermission(PermissionType.UPDATE_CONDITIONS)
  const canDeleteConditions = hasPermission(PermissionType.DELETE_CONDITIONS)
  const canCreateRestrictions = hasPermission(PermissionType.CREATE_DIETARY_RESTRICTIONS)
  const canUpdateRestrictions = hasPermission(PermissionType.UPDATE_DIETARY_RESTRICTIONS)
  const canDeleteRestrictions = hasPermission(PermissionType.DELETE_DIETARY_RESTRICTIONS)

  const isLoading =
    residentLoading || profileLoading || allergiesLoading || conditionsLoading || restrictionsLoading

  // Handlers para abrir modais de criação
  const handleCreateAllergy = () => {
    setEditingAllergy(undefined)
    setAllergyModalOpen(true)
  }

  const handleCreateCondition = () => {
    setEditingCondition(undefined)
    setConditionModalOpen(true)
  }

  const handleCreateRestriction = () => {
    setEditingRestriction(undefined)
    setRestrictionModalOpen(true)
  }

  // Handlers para abrir modais de edição
  const handleEditAllergy = (allergy: Allergy) => {
    setEditingAllergy(allergy)
    setAllergyModalOpen(true)
  }

  const handleEditCondition = (condition: Condition) => {
    setEditingCondition(condition)
    setConditionModalOpen(true)
  }

  const handleEditRestriction = (restriction: DietaryRestriction) => {
    setEditingRestriction(restriction)
    setRestrictionModalOpen(true)
  }

  // Handlers para delete
  const handleAllergyDeleteSuccess = () => {
    // Callback vazio - o modal já trata o toast de sucesso
  }

  const handleConditionDeleteSuccess = () => {
    // Callback vazio - o modal já trata o toast de sucesso
  }

  const handleRestrictionDeleteSuccess = () => {
    // Callback vazio - o modal já trata o toast de sucesso
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Perfil Clínico Atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Perfil Clínico</CardTitle>
                <CardDescription>Estado de saúde e aspectos clínicos atuais</CardDescription>
              </div>
              {canEditProfile && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClinicalProfileModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {clinicalProfile ? 'Editar' : 'Adicionar'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Estado de Saúde */}
              <div>
                <div className="text-sm font-semibold text-foreground">Estado de Saúde</div>
                <div className="mt-1 text-sm">
                  {clinicalProfile?.healthStatus || (
                    <span className="text-muted-foreground italic">
                      Descreva o estado de saúde do residente, indicando condições clínicas
                      atuais, diagnósticos conhecidos, comorbidades, histórico relevante e
                      necessidades de acompanhamento em saúde, conforme avaliação da equipe
                      multiprofissional.
                    </span>
                  )}
                </div>
              </div>

              {/* Necessidades Especiais */}
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Necessidades Especiais
                </div>
                <div className="mt-1 text-sm">
                  {clinicalProfile?.specialNeeds || (
                    <span className="text-muted-foreground italic">
                      Descreva as necessidades especiais do residente, indicando limitações
                      físicas, cognitivas, sensoriais ou comportamentais, bem como adaptações,
                      apoios e cuidados específicos necessários para a prestação da assistência.
                    </span>
                  )}
                </div>
              </div>

              {/* Aspectos Funcionais */}
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-foreground">
                    Aspectos Funcionais
                  </div>
                  {resident?.mobilityAid !== null && resident?.mobilityAid !== undefined && (
                    <Badge
                      variant={resident.mobilityAid ? 'default' : 'secondary'}
                      className={resident.mobilityAid ? 'bg-primary/60 text-white' : 'text-xs'}
                    >
                      {resident.mobilityAid ? (
                        <>
                          <Accessibility className="h-3 w-3 mr-1" />
                          Auxílio Mobilidade
                        </>
                      ) : (
                        '✓ Independente'
                      )}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-sm">
                  {clinicalProfile?.functionalAspects || (
                    <span className="text-muted-foreground italic">
                      Descreva os aspectos funcionais do residente, indicando o grau de autonomia
                      para as atividades da vida diária, mobilidade, comunicação, cognição e uso
                      de dispositivos de apoio, conforme avaliação funcional.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alergias */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alergias</CardTitle>
                <CardDescription>
                  Registro de alergias e reações adversas
                </CardDescription>
              </div>
              {canCreateAllergies && (
                <Button size="sm" variant="outline" onClick={handleCreateAllergy}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Alergia
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allergies.length > 0 ? (
              <div className="space-y-3">
                {allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{allergy.substance}</span>
                        {allergy.severity && (
                          <Badge variant={ALLERGY_SEVERITY_LABELS[allergy.severity].variant} className="text-xs">
                            {ALLERGY_SEVERITY_LABELS[allergy.severity].label}
                          </Badge>
                        )}
                      </div>
                      {allergy.reaction && (
                        <p className="text-sm text-muted-foreground">{allergy.reaction}</p>
                      )}
                      {allergy.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{allergy.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {canUpdateAllergies && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditAllergy(allergy)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteAllergies && (
                        <Button
                          size="sm"
                          variant="ghost"
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
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhuma alergia cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condições Crônicas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Condições Crônicas e Diagnósticos</CardTitle>
                <CardDescription>
                  Registro de condições médicas e comorbidades
                </CardDescription>
              </div>
              {canCreateConditions && (
                <Button size="sm" variant="outline" onClick={handleCreateCondition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Condição
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {conditions.length > 0 ? (
              <div className="space-y-3">
                {conditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{condition.condition}</span>
                        {condition.icdCode && (
                          <Badge variant="outline" className="text-xs">
                            CID: {condition.icdCode}
                          </Badge>
                        )}
                      </div>
                      {condition.notes && (
                        <p className="text-sm text-muted-foreground">{condition.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {canUpdateConditions && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCondition(condition)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteConditions && (
                        <Button
                          size="sm"
                          variant="ghost"
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
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhuma condição cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restrições Alimentares */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Restrições Alimentares</CardTitle>
                <CardDescription>
                  Restrições dietéticas e orientações nutricionais
                </CardDescription>
              </div>
              {canCreateRestrictions && (
                <Button size="sm" variant="outline" onClick={handleCreateRestriction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Restrição
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {dietaryRestrictions.length > 0 ? (
              <div className="space-y-3">
                {dietaryRestrictions.map((restriction) => (
                  <div
                    key={restriction.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{restriction.description}</span>
                        <Badge variant="outline" className="text-xs">
                          {RESTRICTION_TYPE_LABELS[restriction.restrictionType]}
                        </Badge>
                      </div>
                      {restriction.notes && (
                        <p className="text-sm text-muted-foreground">{restriction.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {canUpdateRestrictions && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditRestriction(restriction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteRestrictions && (
                        <Button
                          size="sm"
                          variant="ghost"
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
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhuma restrição cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição do Perfil Clínico */}
      <EditClinicalProfileModal
        open={clinicalProfileModalOpen}
        onOpenChange={setClinicalProfileModalOpen}
        residentId={residentId}
        profile={clinicalProfile}
        currentMobilityAid={resident?.mobilityAid}
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

      {/* Modal de Confirmação de Delete - Alergia */}
      <DeleteAllergyModal
        allergy={deletingAllergy}
        open={deleteAllergyModalOpen}
        onOpenChange={setDeleteAllergyModalOpen}
        onSuccess={handleAllergyDeleteSuccess}
      />

      {/* Modal de Confirmação de Delete - Condição Crônica */}
      <DeleteConditionModal
        condition={deletingCondition}
        open={deleteConditionModalOpen}
        onOpenChange={setDeleteConditionModalOpen}
        onSuccess={handleConditionDeleteSuccess}
      />

      {/* Modal de Confirmação de Delete - Restrição Alimentar */}
      <DeleteDietaryRestrictionModal
        restriction={deletingRestriction}
        open={deleteRestrictionModalOpen}
        onOpenChange={setDeleteRestrictionModalOpen}
        onSuccess={handleRestrictionDeleteSuccess}
      />
    </>
  )
}
